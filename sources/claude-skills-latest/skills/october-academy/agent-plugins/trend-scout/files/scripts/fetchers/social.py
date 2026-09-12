"""Social fetchers: Bluesky, Mastodon."""
import datetime as dt

from lib import (
    BROWSER_UA,
    http_json, write_json, eprint,
    clean_text, clean_title, looks_spam, matches_theme_signal,
    normalized_item, parse_iso,
)


def fetch_bluesky(config, period, limit, outdir, errors, fallback_events):
    eprint("Fetching Bluesky author feeds...")
    now = dt.datetime.now(dt.timezone.utc)
    days = 7 if period == "week" else 1
    cutoff = now - dt.timedelta(days=days)
    sources = config.get("bluesky_handles", [])
    import urllib.parse
    raw = {}
    items = []
    for source in sources:
        url = (
            "https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?"
            f"actor={urllib.parse.quote(source['handle'])}&limit={min(limit, 5)}"
        )
        try:
            payload = http_json(url, headers={"User-Agent": BROWSER_UA})
        except Exception as exc:
            errors.append(f"bluesky:{source['handle']}: {exc}")
            raw[source["handle"]] = {"error": str(exc)}
            continue
        raw[source["handle"]] = payload
        for entry in payload.get("feed", []):
            post = entry.get("post") or {}
            record = post.get("record") or {}
            created_at = parse_iso(record.get("createdAt") or post.get("indexedAt") or "")
            if created_at and created_at < cutoff:
                continue
            text = clean_text(record.get("text", ""))
            embed = post.get("embed") or {}
            external = embed.get("external") or {}
            title = clean_title(external.get("title") or text)
            summary = clean_text((text + " " + external.get("description", "")).strip())
            if not title:
                title = clean_title(summary[:140])
            if not title or looks_spam(title, summary):
                continue
            if not matches_theme_signal(title, summary, external.get("uri", "")):
                continue
            post_uri = post.get("uri", "")
            post_id = post_uri.rsplit("/", 1)[-1] if post_uri else ""
            post_url = external.get("uri") or (
                f"https://bsky.app/profile/{source['handle']}/post/{post_id}" if post_id else ""
            )
            items.append(
                normalized_item(
                    source="bluesky",
                    channel=source["channel"],
                    title=title,
                    url=post_url,
                    author=(post.get("author") or {}).get("displayName", "") or source["handle"],
                    score=post.get("likeCount", 0),
                    comments=post.get("replyCount", 0),
                    reactions=post.get("repostCount", 0),
                    created_at=created_at.isoformat() if created_at else None,
                    summary=summary or external.get("title", ""),
                    now=now,
                    days=days,
                )
            )
    write_json(outdir, "bluesky.json", raw)
    return items


def fetch_mastodon(config, period, limit, outdir, errors, fallback_events):
    eprint("Fetching Mastodon tag timelines...")
    now = dt.datetime.now(dt.timezone.utc)
    days = 7 if period == "week" else 1
    cutoff = now - dt.timedelta(days=days)
    sources = config.get("mastodon_timelines", [])
    raw = {}
    items = []
    for source in sources:
        try:
            payload = http_json(source["url"], headers={"User-Agent": BROWSER_UA})
        except Exception as exc:
            errors.append(f"mastodon:{source['channel']}: {exc}")
            raw[source["channel"]] = {"error": str(exc)}
            continue
        raw[source["channel"]] = payload
        for entry in payload[: limit]:
            created_at = parse_iso(entry.get("created_at", ""))
            if created_at and created_at < cutoff:
                continue
            summary = clean_text(entry.get("content", ""))
            title = clean_title(summary[:140])
            if not title or looks_spam(title, summary):
                continue
            if not matches_theme_signal(title, summary, entry.get("url", "")):
                continue
            items.append(
                normalized_item(
                    source="mastodon",
                    channel=source["channel"],
                    title=title,
                    url=entry.get("url", ""),
                    author=(entry.get("account") or {}).get("display_name", "")
                    or (entry.get("account") or {}).get("acct", ""),
                    score=entry.get("favourites_count", 0),
                    comments=entry.get("replies_count", 0),
                    reactions=entry.get("reblogs_count", 0),
                    created_at=created_at.isoformat() if created_at else None,
                    summary=summary,
                    now=now,
                    days=days,
                )
            )
    write_json(outdir, "mastodon.json", raw)
    return items
