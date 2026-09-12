"""RSS/Atom fetchers: GeekNews, Yozm, Google News, arXiv."""
import datetime as dt

from lib import (
    write_json, eprint,
    clean_title, looks_spam, matches_theme_signal,
    normalized_item, position_score, parse_feed_entries,
)


def fetch_geeknews(config, period, limit, outdir, errors, fallback_events):
    eprint("Fetching GeekNews...")
    now = dt.datetime.now(dt.timezone.utc)
    days = 7 if period == "week" else 1
    items = []
    try:
        feed = parse_feed_entries("https://news.hada.io/rss/news")
    except Exception as exc:
        errors.append(f"geeknews: {exc}")
        write_json(outdir, "geeknews.json", {"error": str(exc)})
        return items
    for index, entry in enumerate(feed[: limit * 2]):
        title = clean_title(entry["title"])
        if looks_spam(title, entry["summary"]):
            continue
        items.append(
            normalized_item(
                source="geeknews",
                channel="GeekNews/frontpage",
                title=title,
                url=entry["url"],
                score=position_score(index, 18),
                created_at=entry["published"],
                summary=entry["summary"],
                now=now,
                days=days,
            )
        )
    write_json(outdir, "geeknews.json", feed)
    return items


def fetch_yozm(config, period, limit, outdir, errors, fallback_events):
    eprint("Fetching Yozm IT feeds...")
    now = dt.datetime.now(dt.timezone.utc)
    days = 7 if period == "week" else 1
    feeds = config.get("yozm_feeds", [])
    raw = {}
    items = []
    for feed in feeds:
        try:
            entries = parse_feed_entries(feed["url"])
        except Exception as exc:
            errors.append(f"yozm:{feed['channel']}: {exc}")
            raw[feed["channel"]] = {"error": str(exc)}
            continue
        raw[feed["channel"]] = entries
        for index, entry in enumerate(entries[: limit]):
            title = clean_title(entry["title"])
            if looks_spam(title, entry["summary"]):
                continue
            items.append(
                normalized_item(
                    source="yozm",
                    channel=feed["channel"],
                    title=title,
                    url=entry["url"],
                    score=position_score(index, 16),
                    created_at=entry["published"],
                    summary=entry["summary"],
                    now=now,
                    days=days,
                )
            )
    write_json(outdir, "yozm.json", raw)
    return items


def fetch_google_news(config, period, limit, outdir, errors, fallback_events):
    eprint("Fetching Google News RSS...")
    now = dt.datetime.now(dt.timezone.utc)
    days = 7 if period == "week" else 1
    feeds = config.get("google_news_feeds", [])
    raw = {}
    items = []
    for feed in feeds:
        try:
            entries = parse_feed_entries(feed["url"])
        except Exception as exc:
            errors.append(f"google_news:{feed['channel']}: {exc}")
            raw[feed["channel"]] = {"error": str(exc)}
            continue
        raw[feed["channel"]] = entries
        for index, entry in enumerate(entries[: limit * 2]):
            title = clean_title(entry["title"])
            if looks_spam(title, entry["summary"]):
                continue
            if not matches_theme_signal(title, entry["summary"], entry["url"]):
                continue
            items.append(
                normalized_item(
                    source="google_news",
                    channel=feed["channel"],
                    title=title,
                    url=entry["url"],
                    score=position_score(index, 14),
                    created_at=entry["published"],
                    summary=entry["summary"],
                    now=now,
                    days=days,
                )
            )
    write_json(outdir, "google-news.json", raw)
    return items


def fetch_arxiv(config, period, limit, outdir, errors, fallback_events):
    eprint("Fetching arXiv...")
    now = dt.datetime.now(dt.timezone.utc)
    days = 7 if period == "week" else 1
    import urllib.parse
    query = urllib.parse.quote("cat:cs.AI OR cat:cs.CL OR cat:cs.LG")
    url = (
        "http://export.arxiv.org/api/query?"
        f"search_query={query}&max_results={limit}&sortBy=submittedDate&sortOrder=descending"
    )
    items = []
    try:
        entries = parse_feed_entries(url)
    except Exception as exc:
        errors.append(f"arxiv: {exc}")
        write_json(outdir, "arxiv.json", {"error": str(exc)})
        return items
    for index, entry in enumerate(entries[: limit]):
        title = clean_title(entry["title"])
        if looks_spam(title, entry["summary"]):
            continue
        items.append(
            normalized_item(
                source="arxiv",
                channel="arXiv/AI",
                title=title,
                url=entry["url"],
                score=position_score(index, 10),
                created_at=entry["published"],
                summary=entry["summary"],
                now=now,
                days=days,
            )
        )
    write_json(outdir, "arxiv.json", entries)
    return items
