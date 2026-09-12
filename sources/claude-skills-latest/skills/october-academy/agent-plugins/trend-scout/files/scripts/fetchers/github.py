"""GitHub fetcher: gh CLI primary, REST API fallback."""
import datetime as dt
import json
import urllib.parse

from lib import (
    BROWSER_UA, USER_AGENT_VERSION,
    curl_json, run_command, write_json, eprint,
    looks_spam, normalized_item, parse_iso,
)


def fetch_github(config, period, limit, outdir, errors, fallback_events):
    eprint("Fetching GitHub launch radar...")
    gh = run_command(["gh", "auth", "status"])
    if gh.returncode == 0:
        try:
            return _fetch_github_with_gh(config, period, limit, outdir)
        except Exception as exc:
            # gh authed but the search itself failed — fall through to the public REST API
            errors.append(f"github: gh search failed ({exc}), using REST fallback")
    else:
        errors.append("github: gh auth unavailable, using REST fallback")
    try:
        return _fetch_github_with_rest(config, period, limit, outdir)
    except Exception as exc:
        errors.append(f"github: {exc}")
        return []


def _github_star_floor(period):
    return ">20" if period == "week" else ">5"


def _fetch_github_with_gh(config, period, limit, outdir):
    now = dt.datetime.now(dt.timezone.utc)
    days = 7 if period == "week" else 1
    cutoff = now - dt.timedelta(days=days)
    cutoff_date = cutoff.date().isoformat()
    topics = config.get("github_topics", [])
    raw = {}
    items = []
    for topic in topics:
        command = [
            "gh", "search", "repos",
            "--topic", topic["topic"],
            "--created", f">{cutoff_date}",
            "--stars", _github_star_floor(period),
            "--sort", "stars",
            "--order", "desc",
            "--limit", str(limit),
            "--json", "name,owner,description,stargazersCount,url,updatedAt,createdAt",
        ]
        completed = run_command(command)
        if completed.returncode != 0:
            raise RuntimeError(completed.stderr.strip() or f"gh search failed for {topic['topic']}")
        data = json.loads(completed.stdout or "[]")
        raw[topic["label"]] = data
        for repo in data:
            title = f"{repo['owner']['login']}/{repo['name']}"
            summary = repo.get("description", "") or ""
            if looks_spam(title, summary):
                continue
            items.append(
                normalized_item(
                    source="github",
                    channel=f"GitHub/{topic['topic']}",
                    title=title,
                    url=repo.get("url", ""),
                    author=repo["owner"]["login"],
                    stars=repo.get("stargazersCount", 0),
                    created_at=parse_iso(repo.get("createdAt")).isoformat()
                    if parse_iso(repo.get("createdAt"))
                    else None,
                    summary=summary,
                    extra={"updated_at": repo.get("updatedAt")},
                    now=now,
                    days=days,
                )
            )
    write_json(outdir, "github.json", raw)
    return items


def _fetch_github_with_rest(config, period, limit, outdir):
    now = dt.datetime.now(dt.timezone.utc)
    days = 7 if period == "week" else 1
    cutoff = now - dt.timedelta(days=days)
    cutoff_date = cutoff.date().isoformat()
    topics = config.get("github_topics", [])
    raw = {}
    items = []
    for topic in topics:
        query = urllib.parse.quote_plus(
            f"topic:{topic['topic']} created:>{cutoff_date} stars:{_github_star_floor(period)} archived:false"
        )
        url = (
            "https://api.github.com/search/repositories?"
            f"q={query}&sort=stars&order=desc&per_page={limit}"
        )
        payload = curl_json(
            url,
            headers={
                "User-Agent": f"trend-scout/{USER_AGENT_VERSION}",
                "Accept": "application/vnd.github+json",
            },
        )
        raw[topic["label"]] = payload
        for repo in payload.get("items", []):
            title = repo.get("full_name", "")
            summary = repo.get("description", "") or ""
            if looks_spam(title, summary):
                continue
            items.append(
                normalized_item(
                    source="github",
                    channel=f"GitHub/{topic['topic']}",
                    title=title,
                    url=repo.get("html_url", ""),
                    author=(repo.get("owner") or {}).get("login", ""),
                    stars=repo.get("stargazers_count", 0),
                    created_at=parse_iso(repo.get("created_at")).isoformat()
                    if parse_iso(repo.get("created_at"))
                    else None,
                    summary=summary,
                    extra={"updated_at": repo.get("updated_at")},
                    now=now,
                    days=days,
                )
            )
    write_json(outdir, "github.json", raw)
    return items
