"""HTML scraper fetchers: Clien, Ruliweb, Ppomppu, DCInside."""
import datetime as dt
import re
import urllib.parse

from lib import (
    BROWSER_UA,
    FallbackChain, has_curl_cffi, curl_cffi_request,
    write_json, eprint,
    clean_title, looks_spam, matches_theme_signal,
    normalized_item, position_score,
    extract_links, extract_page_candidates,
    batch_enrich, naver_search_fallback, is_counter_text, title_excluded,
    sidecar_google_news,
)


def _cffi_page_candidates(url, pattern):
    if not has_curl_cffi():
        raise RuntimeError("curl_cffi not available")
    html_body = curl_cffi_request(url, headers={"User-Agent": BROWSER_UA})
    matches = []
    for text, href in extract_links(html_body, url):
        href_key = href.split("#", 1)[0]
        if not re.search(pattern, href_key):
            continue
        title = clean_title(text)
        if is_counter_text(title) or looks_spam(title) or title_excluded(title):
            continue
        matches.append({"title": title, "url": href_key})
    seen = set()
    ordered = []
    for m in matches:
        key = (m["title"], m["url"])
        if key in seen:
            continue
        seen.add(key)
        ordered.append(m)
    return ordered or None


def fetch_clien(config, period, limit, outdir, errors, fallback_events):
    eprint("Fetching Clien boards...")
    now = dt.datetime.now(dt.timezone.utc)
    days = 7 if period == "week" else 1
    sources = config.get("clien_sources", [])
    raw = {}
    items = []
    for source in sources:
        src_url = source["url"]
        src_pattern = source["pattern"]

        def _direct(src_url=src_url, src_pattern=src_pattern):
            return extract_page_candidates(src_url, src_pattern) or None

        def _cffi(src_url=src_url, src_pattern=src_pattern):
            return _cffi_page_candidates(src_url, src_pattern)

        def _naver():
            return naver_search_fallback("Clien", "clien.net", "clien", "Clien", limit)

        chain = FallbackChain([_direct, _cffi, _naver], f"clien:{source['channel']}")
        matches, event = chain.execute(fallback_events=fallback_events)
        if matches is None:
            sidecar = sidecar_google_news("Clien", limit)
            if sidecar:
                items.extend(sidecar)
            else:
                errors.append(f"clien:{source['channel']}: all phases failed ({event['reason']})")
            raw[source["channel"]] = {"error": event["reason"]}
            continue
        raw[source["channel"]] = matches[: limit * 2]
        source_items = []
        for index, match in enumerate(matches[: limit * 2]):
            title = match["title"]
            if source.get("require_theme") and not matches_theme_signal(title, "", match["url"]):
                continue
            source_items.append(
                normalized_item(
                    source="clien",
                    channel=source["channel"],
                    title=title,
                    url=match["url"],
                    score=position_score(index, 14),
                    now=now,
                    days=days,
                )
            )
        source_items = batch_enrich(source_items)
        items.extend(source_items)
    write_json(outdir, "clien.json", raw)
    return items


def fetch_ruliweb(config, period, limit, outdir, errors, fallback_events):
    eprint("Fetching Ruliweb tech boards...")
    now = dt.datetime.now(dt.timezone.utc)
    days = 7 if period == "week" else 1
    sources = config.get("ruliweb_sources", [])
    raw = {}
    items = []
    for source in sources:
        src_url = source["url"]
        src_pattern = source["pattern"]

        def _direct(src_url=src_url, src_pattern=src_pattern):
            return extract_page_candidates(src_url, src_pattern) or None

        def _cffi(src_url=src_url, src_pattern=src_pattern):
            return _cffi_page_candidates(src_url, src_pattern)

        def _naver():
            return naver_search_fallback("Ruliweb", "ruliweb.com", "ruliweb", "Ruliweb", limit)

        chain = FallbackChain([_direct, _cffi, _naver], f"ruliweb:{source['channel']}")
        matches, event = chain.execute(fallback_events=fallback_events)
        if matches is None:
            sidecar = sidecar_google_news("Ruliweb", limit)
            if sidecar:
                items.extend(sidecar)
            else:
                errors.append(f"ruliweb:{source['channel']}: all phases failed ({event['reason']})")
            raw[source["channel"]] = {"error": event["reason"]}
            continue
        raw[source["channel"]] = matches[: limit * 2]
        source_items = []
        for index, match in enumerate(matches[: limit * 2]):
            if looks_spam(match["title"]):
                continue
            source_items.append(
                normalized_item(
                    source="ruliweb",
                    channel=source["channel"],
                    title=match["title"],
                    url=match["url"],
                    score=position_score(index, 13),
                    now=now,
                    days=days,
                )
            )
        source_items = batch_enrich(source_items)
        items.extend(source_items)
    write_json(outdir, "ruliweb.json", raw)
    return items


def fetch_ppomppu(config, period, limit, outdir, errors, fallback_events):
    eprint("Fetching Ppomppu hot board...")
    now = dt.datetime.now(dt.timezone.utc)
    days = 7 if period == "week" else 1
    ppomppu_url = "https://www.ppomppu.co.kr/hot.php"
    ppomppu_pattern = r"/zboard/(?:view\.php\?id=[^&]+&no=\d+|zboard\.php\?id=freeboard&no=\d+)"
    items = []

    def _direct():
        return extract_page_candidates(ppomppu_url, ppomppu_pattern, fallback_encodings=["euc-kr", "cp949"]) or None

    def _cffi():
        return _cffi_page_candidates(ppomppu_url, ppomppu_pattern)

    def _naver():
        return naver_search_fallback("Ppomppu", "ppomppu.co.kr", "ppomppu", "Ppomppu", limit)

    chain = FallbackChain([_direct, _cffi, _naver], "ppomppu")
    matches, event = chain.execute(fallback_events=fallback_events)
    if matches is None:
        sidecar = sidecar_google_news("Ppomppu", limit)
        if sidecar:
            items.extend(sidecar)
        else:
            errors.append(f"ppomppu: all phases failed ({event['reason']})")
        write_json(outdir, "ppomppu.json", {"error": event["reason"]})
        return items
    selected = [m for m in matches if matches_theme_signal(m["title"], "", m["url"])]
    source_items = []
    for index, match in enumerate(selected[: limit]):
        source_items.append(
            normalized_item(
                source="ppomppu",
                channel="Ppomppu/hot",
                title=match["title"],
                url=urllib.parse.urljoin("https://www.ppomppu.co.kr", match["url"]),
                score=position_score(index, 12),
                now=now,
                days=days,
            )
        )
    source_items = batch_enrich(source_items)
    items.extend(source_items)
    write_json(outdir, "ppomppu.json", selected[: limit * 2])
    return items


def fetch_dcinside(config, period, limit, outdir, errors, fallback_events):
    eprint("Fetching DCInside HIT gallery...")
    now = dt.datetime.now(dt.timezone.utc)
    days = 7 if period == "week" else 1
    dc_url = "https://gall.dcinside.com/board/lists/?id=hit"
    dc_pattern = r"(?:/board/view/\?id=hit&no=\d+|https://gall\.dcinside\.com/list\.php\?id=[^&]+&no=\d+)"
    items = []

    def _direct():
        return extract_page_candidates(dc_url, dc_pattern) or None

    def _cffi():
        return _cffi_page_candidates(dc_url, dc_pattern)

    def _naver():
        return naver_search_fallback("DCInside", "dcinside.com", "dcinside", "DCInside", limit)

    chain = FallbackChain([_direct, _cffi, _naver], "dcinside")
    matches, event = chain.execute(fallback_events=fallback_events)
    if matches is None:
        sidecar = sidecar_google_news("DCInside", limit)
        if sidecar:
            items.extend(sidecar)
        else:
            errors.append(f"dcinside: all phases failed ({event['reason']})")
        write_json(outdir, "dcinside.json", {"error": event["reason"]})
        return items
    selected = [m for m in matches if matches_theme_signal(m["title"], "", m["url"])]
    source_items = []
    for index, match in enumerate(selected[: limit]):
        source_items.append(
            normalized_item(
                source="dcinside",
                channel="DCInside/hit",
                title=match["title"],
                url=match["url"],
                score=position_score(index, 12),
                now=now,
                days=days,
            )
        )
    source_items = batch_enrich(source_items)
    items.extend(source_items)
    write_json(outdir, "dcinside.json", selected[: limit * 2])
    return items
