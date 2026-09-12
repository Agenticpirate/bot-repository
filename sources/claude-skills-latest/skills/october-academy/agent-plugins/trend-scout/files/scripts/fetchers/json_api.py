"""JSON API fetchers: Reddit, HN, Lobsters, dev.to, StackOverflow, npm, V2EX."""
import concurrent.futures
import datetime as dt
import json
import time
import urllib.parse

from lib import (
    BROWSER_UA, MOBILE_UA, DEVTO_THEME_TAGS, REDDIT_RELAXED_SUBS,
    curl_json, http_json, write_json, eprint,
    clean_title, looks_spam, has_signal_text, matches_theme_signal,
    normalized_item, parse_iso, iso_from_epoch, position_score,
    has_curl_cffi, curl_cffi_request,
)


def _reddit_payload(url, headers):
    """Reddit blocks plain requests with an HTML interstitial. Try curl first, then
    curl_cffi TLS impersonation (same escalation the FallbackChain uses elsewhere).
    If both are blocked, re-raise the descriptive curl error for the errors[] log."""
    try:
        return curl_json(url, headers=headers)
    except Exception as first_exc:
        if not has_curl_cffi():
            raise
        try:
            text = curl_cffi_request(url, headers=headers)
            return json.loads(text)
        except Exception:
            raise first_exc


def fetch_reddit(config, period, limit, outdir, errors, fallback_events):
    subreddits = config.get("subreddits", [])
    eprint(f"Fetching Reddit ({len(subreddits)} subs)...")
    now = dt.datetime.now(dt.timezone.utc)
    days = 7 if period == "week" else 1
    raw = {}
    items = []
    headers = {
        "User-Agent": MOBILE_UA,
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
    }
    for subreddit in subreddits:
        url = f"https://www.reddit.com/r/{subreddit}/top.json?t={period}&limit={limit}"
        try:
            payload = _reddit_payload(url, headers)
            raw[subreddit] = payload
        except Exception as exc:
            errors.append(f"reddit:{subreddit}: {exc}")
            raw[subreddit] = {"error": str(exc)}
            continue
        for child in payload.get("data", {}).get("children", []):
            data = child.get("data", {})
            title = data.get("title", "")
            summary = data.get("selftext", "") or ""
            if looks_spam(title, summary):
                continue
            if not _reddit_has_substance(subreddit, data):
                continue
            items.append(
                normalized_item(
                    source="reddit",
                    channel=f"r/{subreddit}",
                    title=title,
                    url=f"https://reddit.com{data.get('permalink', '')}",
                    author=data.get("author", ""),
                    score=data.get("score", 0),
                    comments=data.get("num_comments", 0),
                    created_at=iso_from_epoch(data.get("created_utc")),
                    summary=summary,
                    now=now,
                    days=days,
                )
            )
        time.sleep(0.25)
    write_json(outdir, "reddit.json", raw)
    return items


def _reddit_score_floor(subreddit):
    return 5 if subreddit in REDDIT_RELAXED_SUBS else 10


def _reddit_has_substance(subreddit, data):
    title = data.get("title", "")
    summary = data.get("selftext", "") or ""
    domain = (data.get("domain") or "").lower()
    if data.get("score", 0) < _reddit_score_floor(subreddit):
        return False
    if data.get("is_gallery") or data.get("is_video"):
        return False
    if data.get("post_hint") in {"image", "hosted:video", "rich:video"}:
        return False
    if len(summary.strip()) >= 120:
        return True
    if has_signal_text(title, summary):
        return True
    if domain and domain not in {
        "reddit.com", "www.reddit.com", "i.redd.it", "v.redd.it",
        "self." + subreddit.lower(),
    }:
        return True
    return False


def fetch_hackernews(config, period, limit, outdir, errors, fallback_events):
    eprint("Fetching Hacker News...")
    now = dt.datetime.now(dt.timezone.utc)
    days = 7 if period == "week" else 1
    raw = {"lists": {}, "stories": []}
    items = []
    story_ids = []
    for list_name in ("topstories", "beststories"):
        try:
            ids = http_json(f"https://hacker-news.firebaseio.com/v0/{list_name}.json")
            raw["lists"][list_name] = ids[: limit * 2]
            story_ids.extend(ids[: limit * 2])
        except Exception as exc:
            errors.append(f"hackernews:{list_name}: {exc}")
            raw["lists"][list_name] = {"error": str(exc)}
    ordered_ids = []
    seen = set()
    for story_id in story_ids:
        if story_id in seen:
            continue
        seen.add(story_id)
        ordered_ids.append(story_id)

    def _fetch_story(story_id):
        return story_id, http_json(f"https://hacker-news.firebaseio.com/v0/item/{story_id}.json")

    target_ids = ordered_ids[: limit * 2]
    stories_by_id = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        for future in concurrent.futures.as_completed(
            {executor.submit(_fetch_story, sid) for sid in target_ids}
        ):
            try:
                story_id, data = future.result()
                stories_by_id[story_id] = data
            except Exception as exc:
                errors.append(f"hackernews:item: {exc}")

    for story_id in target_ids:  # preserve rank order for scoring/dedupe stability
        data = stories_by_id.get(story_id)
        if not data or data.get("type") != "story":
            continue
        raw["stories"].append(data)
        title = data.get("title", "")
        if looks_spam(title):
            continue
        if data.get("score", 0) < 50:
            continue
        if not matches_theme_signal(title, data.get("text", ""), data.get("url", "")):
            continue
        items.append(
            normalized_item(
                source="hackernews",
                channel="hn/front-page",
                title=title,
                url=data.get("url") or f"https://news.ycombinator.com/item?id={story_id}",
                author=data.get("by", ""),
                score=data.get("score", 0),
                comments=data.get("descendants", 0),
                created_at=iso_from_epoch(data.get("time")),
                summary=data.get("text", ""),
                extra={"hn_url": f"https://news.ycombinator.com/item?id={story_id}"},
                now=now,
                days=days,
            )
        )
    write_json(outdir, "hackernews.json", raw)
    return items


def fetch_lobsters(config, period, limit, outdir, errors, fallback_events):
    eprint("Fetching Lobsters...")
    now = dt.datetime.now(dt.timezone.utc)
    days = 7 if period == "week" else 1
    items = []
    try:
        payload = curl_json("https://lobste.rs/hottest.json", headers={"User-Agent": BROWSER_UA})
    except Exception as exc:
        errors.append(f"lobsters: {exc}")
        write_json(outdir, "lobsters.json", {"error": str(exc)})
        return items
    for entry in payload[: limit]:
        title = entry.get("title", "")
        if looks_spam(title, entry.get("description_plain", "")):
            continue
        if entry.get("score", 0) < 8:
            continue
        items.append(
            normalized_item(
                source="lobsters",
                channel="lobste.rs/hottest",
                title=title,
                url=entry.get("url") or entry.get("comments_url", ""),
                author=entry.get("submitter_user", ""),
                score=entry.get("score", 0),
                comments=entry.get("comment_count", 0),
                created_at=parse_iso(entry.get("created_at")).isoformat() if parse_iso(entry.get("created_at")) else None,
                summary=entry.get("description_plain", ""),
                extra={"comments_url": entry.get("comments_url", ""), "tags": entry.get("tags", [])},
                now=now,
                days=days,
            )
        )
    write_json(outdir, "lobsters.json", payload)
    return items


def fetch_devto(config, period, limit, outdir, errors, fallback_events):
    eprint("Fetching dev.to...")
    now = dt.datetime.now(dt.timezone.utc)
    days = 7 if period == "week" else 1
    url = f"https://dev.to/api/articles?top={7 if period == 'week' else 2}&per_page={limit}"
    items = []
    try:
        payload = curl_json(
            url,
            headers={
                "User-Agent": BROWSER_UA,
                "Accept": "application/json",
                "Referer": "https://dev.to/",
            },
        )
    except Exception as exc:
        errors.append(f"devto: {exc}")
        write_json(outdir, "devto.json", {"error": str(exc)})
        return items
    for entry in payload:
        title = entry.get("title", "")
        if looks_spam(title, entry.get("description", "")):
            continue
        if entry.get("public_reactions_count", 0) < 20:
            continue
        tags = entry.get("tag_list", []) or entry.get("tags", "")
        if isinstance(tags, str):
            tags = [part.strip().lower() for part in tags.split(",") if part.strip()]
        tags = [tag.lower() for tag in tags]
        if not (
            matches_theme_signal(title, entry.get("description", ""), entry.get("url", ""))
            or DEVTO_THEME_TAGS.intersection(tags)
        ):
            continue
        items.append(
            normalized_item(
                source="devto",
                channel="dev.to/top",
                title=title,
                url=entry.get("url", ""),
                author=(entry.get("user") or {}).get("name", ""),
                score=entry.get("public_reactions_count", 0),
                comments=entry.get("comments_count", 0),
                reactions=entry.get("positive_reactions_count", 0),
                created_at=parse_iso(entry.get("published_timestamp")).isoformat()
                if parse_iso(entry.get("published_timestamp"))
                else None,
                summary=entry.get("description", ""),
                extra={"tags": tags},
                now=now,
                days=days,
            )
        )
    write_json(outdir, "devto.json", payload)
    return items


def fetch_stackoverflow(config, period, limit, outdir, errors, fallback_events):
    eprint("Fetching Stack Overflow...")
    now = dt.datetime.now(dt.timezone.utc)
    days = 7 if period == "week" else 1
    cutoff = now - dt.timedelta(days=days)
    cutoff_ts = int(cutoff.timestamp())
    tags = config.get("stackoverflow_tags", [])
    raw = {}
    items = []
    score_floor = 5 if period == "week" else 3
    for tag in tags:
        url = (
            "https://api.stackexchange.com/2.3/questions?"
            f"order=desc&sort=votes&tagged={urllib.parse.quote(tag)}"
            f"&site=stackoverflow&pagesize={limit}&fromdate={cutoff_ts}"
        )
        try:
            payload = http_json(url, headers={"User-Agent": BROWSER_UA})
        except Exception as exc:
            errors.append(f"stackoverflow:{tag}: {exc}")
            raw[tag] = {"error": str(exc)}
            continue
        raw[tag] = payload
        for entry in payload.get("items", []):
            title = clean_title(entry.get("title", ""))
            if looks_spam(title):
                continue
            if entry.get("score", 0) < score_floor:
                continue
            items.append(
                normalized_item(
                    source="stackoverflow",
                    channel=f"StackOverflow/{tag}",
                    title=title,
                    url=entry.get("link", ""),
                    author=(entry.get("owner") or {}).get("display_name", ""),
                    score=entry.get("score", 0),
                    comments=entry.get("answer_count", 0),
                    created_at=iso_from_epoch(entry.get("creation_date")),
                    summary=" / ".join(entry.get("tags", [])),
                    extra={"tags": entry.get("tags", [])},
                    now=now,
                    days=days,
                )
            )
    write_json(outdir, "stackoverflow.json", raw)
    return items


def _npm_weekly_downloads(package_name):
    """Real last-week download count from the npm downloads point API (authoritative; the registry search response also carries downloads.weekly, which may lag slightly)."""
    url = f"https://api.npmjs.org/downloads/point/last-week/{package_name}"
    try:
        payload = http_json(url, headers={"User-Agent": BROWSER_UA})
    except Exception:
        return 0
    return int(payload.get("downloads", 0) or 0)


def fetch_npm(config, period, limit, outdir, errors, fallback_events):
    eprint("Fetching npm package radar...")
    now = dt.datetime.now(dt.timezone.utc)
    days = 7 if period == "week" else 1
    cutoff = now - dt.timedelta(days=days)
    queries = config.get("npm_queries", [])
    raw = {}
    candidates = []
    for query in queries:
        url = (
            "https://registry.npmjs.org/-/v1/search?"
            f"text={urllib.parse.quote(query)}&size={min(limit, 3)}"
        )
        try:
            payload = http_json(url, headers={"User-Agent": BROWSER_UA})
        except Exception as exc:
            errors.append(f"npm:{query}: {exc}")
            raw[query] = {"error": str(exc)}
            continue
        raw[query] = payload
        for entry in payload.get("objects", []):
            package = entry.get("package") or {}
            title = clean_title(package.get("name", ""))
            summary = package.get("description", "") or ""
            updated_at = parse_iso(entry.get("updated"))
            if looks_spam(title, summary):
                continue
            if not matches_theme_signal(title, summary, (package.get("links") or {}).get("repository", "")):
                continue
            if updated_at and updated_at < cutoff:
                continue
            candidates.append((query, entry, package, title, summary, updated_at))

    # Real weekly downloads drive scoring — fetch them in parallel from the point API
    # (authoritative; the search response's downloads.weekly can lag slightly).
    names = {package.get("name", "") for _, _, package, _, _, _ in candidates if package.get("name")}
    downloads_by_name = {}
    if names:
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
            future_map = {executor.submit(_npm_weekly_downloads, name): name for name in names}
            for future in concurrent.futures.as_completed(future_map):
                downloads_by_name[future_map[future]] = future.result()

    items = []
    for query, entry, package, title, summary, updated_at in candidates:
        weekly_downloads = downloads_by_name.get(package.get("name", ""), 0)
        pseudo_stars = max(1, weekly_downloads // 5000)
        items.append(
            normalized_item(
                source="npm",
                channel=f"npm/{query}",
                title=title,
                url=(package.get("links") or {}).get("npm", ""),
                author=(package.get("publisher") or {}).get("username", ""),
                comments=min(20, int(str(entry.get("dependents", "0")).replace(",", "") or 0)),
                stars=pseudo_stars,
                created_at=updated_at.isoformat() if updated_at else package.get("date"),
                summary=summary,
                extra={
                    "version": package.get("version"),
                    "repository": (package.get("links") or {}).get("repository", ""),
                    "weekly_downloads": weekly_downloads,
                    "dependents": entry.get("dependents", 0),
                    "search_score": round(float(entry.get("searchScore", 0)), 2),
                },
                now=now,
                days=days,
            )
        )
    write_json(outdir, "npm.json", raw)
    return items


def fetch_v2ex(config, period, limit, outdir, errors, fallback_events):
    eprint("Fetching V2EX nodes...")
    now = dt.datetime.now(dt.timezone.utc)
    days = 7 if period == "week" else 1
    nodes = config.get("v2ex_nodes", [])
    raw = {}
    items = []
    for node in nodes:
        url = "https://www.v2ex.com/api/topics/show.json?node_name=" + urllib.parse.quote(node)
        try:
            payload = http_json(url, headers={"User-Agent": BROWSER_UA})
        except Exception as exc:
            errors.append(f"v2ex:{node}: {exc}")
            raw[node] = {"error": str(exc)}
            continue
        raw[node] = payload
        for entry in payload[: limit]:
            title = clean_title(entry.get("title", ""))
            if looks_spam(title):
                continue
            if node != "openai" and not matches_theme_signal(title, "", entry.get("url", "")):
                continue
            if entry.get("replies", 0) < (2 if node == "openai" else 5):
                continue
            items.append(
                normalized_item(
                    source="v2ex",
                    channel=f"V2EX/{node}",
                    title=title,
                    url=entry.get("url", ""),
                    author=(entry.get("member") or {}).get("username", ""),
                    comments=entry.get("replies", 0),
                    created_at=iso_from_epoch(entry.get("created")),
                    summary=(entry.get("node") or {}).get("title", ""),
                    now=now,
                    days=days,
                )
            )
    write_json(outdir, "v2ex.json", raw)
    return items
