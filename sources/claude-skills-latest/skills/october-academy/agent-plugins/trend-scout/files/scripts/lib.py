"""Shared utilities for trend-scout pipeline."""
import concurrent.futures
import datetime as dt
import email.utils
import html
import json
import math
import os
import re
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

MOBILE_UA = (
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 "
    "Mobile/15E148 Safari/604.1"
)
BROWSER_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/135.0.0.0 Safari/537.36"
)
NAVER_HEADERS = {
    "User-Agent": BROWSER_UA,
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": "https://www.naver.com/",
}
RSS_HEADERS = {
    "User-Agent": BROWSER_UA,
    "Accept": "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8",
}

SOURCE_WEIGHTS = {
    "reddit": 1.0,
    "hackernews": 1.25,
    "lobsters": 1.15,
    "devto": 0.95,
    "github": 1.1,
    "stackoverflow": 0.95,
    "npm": 0.55,
    "bluesky": 0.8,
    "mastodon": 0.65,
    "geeknews": 1.1,
    "yozm": 1.0,
    "google_news": 0.85,
    "naver_blog": 0.95,
    "clien": 0.95,
    "ruliweb": 0.9,
    "ppomppu": 0.8,
    "dcinside": 0.8,
    "fmkorea": 0.8,
    "v2ex": 0.85,
    "arxiv": 0.8,
}
SPAM_PATTERNS = [
    r"\bhiring\b",
    r"\bwe['’]?re hiring\b",
    r"\bfor hire\b",
    r"\bjob opening\b",
    r"\bjob posting\b",
    r"\blooking for (?:a |an )?(?:co-?founder|cofounder|developer to hire|contractor|freelancer)\b",
    r"\bnewsletter\b",
    r"^\s*공지",
    r"^\s*창당",
    r"^\s*입당",
    r"^\s*홍보",
]
REDDIT_RELAXED_SUBS = {"ClaudeAI", "GeminiAI", "nextjs"}
TITLE_EXCLUDE_PATTERNS = [
    r"행동강령",
    r"등록 방법",
    r"업데이트 중지 안내",
    r"기념품 변경 안내",
    r"창당 인사",
    r"홍보에 관한 공지",
]
SIGNAL_KEYWORDS = [
    "mrr", "arr", "revenue", "profit", "launch", "launched", "users", "growth",
    "pricing", "open source", "opensource", "agent", "workflow", "api", "benchmark",
    "security", "postmortem", "show hn", "show gn", "case study", "github", "vercel",
    "openai", "anthropic", "gemini", "claude", "chatgpt", "codex", "startup", "saas",
    "developer", "devtool", "productivity", "automation", "browser", "database",
    "frontend", "backend", "cli", "framework", "typescript", "javascript", "react",
    "next.js", "nextjs", "infra", "cloud", "llm", "gpu", "chip", "memory", "agentic",
    "에이전트", "오픈소스", "개발", "개발자", "스타트업", "창업", "자동화", "보안",
    "반도체", "메모리", "클로드", "코덱스", "제미나이", "챗gpt", "버셀",
    "바이브 코딩", "바이브코딩", "llm", "ai", "saas",
]
THEME_HOSTS = [
    "github.com", "vercel.com", "openai.com", "anthropic.com", "supabase.com",
    "cloudflare.com", "render.com", "cursor.com", "claude.ai", "news.hada.io",
    "yozm.wishket.com", "stackoverflow.com", "stackexchange.com",
]
DEVTO_THEME_TAGS = {
    "ai", "webdev", "opensource", "productivity", "programming", "javascript",
    "typescript", "react", "nextjs", "startup", "saas", "devops",
}

TREND_SCOUT_TIMEOUT_PER_SOURCE = int(os.environ.get("TREND_SCOUT_TIMEOUT_PER_SOURCE", "20"))
TREND_SCOUT_TIMEOUT_TOTAL = int(os.environ.get("TREND_SCOUT_TIMEOUT_TOTAL", "240"))
TREND_SCOUT_ENRICH = os.environ.get("TREND_SCOUT_ENRICH", "1") != "0"

# Numbers only count as a "signal" when attached to a unit/percent/multiplier/currency —
# a bare digit (e.g. "top 5 tips", "version 2") is not enough to be interesting.
NUMERIC_SIGNAL_RE = re.compile(
    r"""
      [$₩€£]\s?\d                                  # currency prefix ($10, ₩5000)
    | \d[\d,.]*\s?[%％]                             # percent (300%)
    | \d[\d,.]*\s?x\b                               # multiplier (10x)
    | \d[\d,.]*\s?배                                # multiplier (10배)
    | \d[\d,.]*\s?[kmb]\b                           # magnitude (10k, 3m, 1b)
    | \d[\d,.]*\s?(?:억|만|천)                       # korean magnitude (1억, 3만)
    | \d[\d,.]*\s?(?:users?|stars?|downloads?|installs?|subscribers?
                    |mrr|arr|원|달러|dollars?)      # count + unit word
    """,
    re.X,
)

# HTTP statuses worth one automatic retry (transient server / rate-limit errors).
RETRY_STATUS_CODES = {429, 500, 502, 503, 504}

# Runtime-tunable knobs. Seeded from the module constants above and overridden by
# load_config() so config/default.json (and TREND_SCOUT_CONFIG) actually drive scoring.
_RUNTIME = {
    "source_weights": dict(SOURCE_WEIGHTS),
    "signal_keywords": list(SIGNAL_KEYWORDS),
    "spam_patterns": list(SPAM_PATTERNS),
}


def plugin_version():
    """Read the plugin version from .claude-plugin/plugin.json (fallback constant)."""
    fallback = "1.7.0"
    manifest = os.path.join(
        os.path.dirname(__file__), "..", "..", "..", ".claude-plugin", "plugin.json"
    )
    try:
        with open(manifest, encoding="utf-8") as handle:
            return json.load(handle).get("version", fallback) or fallback
    except (OSError, ValueError):
        return fallback


USER_AGENT_VERSION = plugin_version()


def apply_runtime_config(config):
    """Thread config-loaded scoring inputs into the module runtime state.

    Called once by load_config(); after this, trend_score/looks_spam/has_signal_text
    consume config/default.json values instead of the hard-coded constants.
    """
    weights = config.get("source_weights")
    if isinstance(weights, dict) and weights:
        _RUNTIME["source_weights"] = dict(weights)
    keywords = config.get("signal_keywords")
    if isinstance(keywords, list) and keywords:
        _RUNTIME["signal_keywords"] = [str(kw).lower() for kw in keywords]
    patterns = config.get("spam_patterns")
    if isinstance(patterns, list) and patterns:
        _RUNTIME["spam_patterns"] = list(patterns)


class FetchError(Exception):
    """HTTP-layer error carrying the status code and (truncated) response body so
    FallbackChain/classify_failure can tell a 403 block from a 429 or a WAF page."""

    def __init__(self, message, status_code=None, response_body=""):
        super().__init__(message)
        self.status_code = status_code
        self.response_body = response_body or ""


def _is_retryable(exc):
    code = getattr(exc, "status_code", None) or getattr(exc, "code", None)
    if code in RETRY_STATUS_CODES:
        return True
    if isinstance(exc, (socket.timeout, TimeoutError)):
        return True
    if isinstance(exc, urllib.error.URLError):
        reason = getattr(exc, "reason", None)
        if isinstance(reason, (socket.timeout, TimeoutError)):
            return True
        if "timed out" in str(reason).lower():
            return True
    message = str(exc).lower()
    return "timed out" in message or "timeout" in message


def with_retry(operation, retries=1, base_delay=0.5):
    """Run operation(), retrying once (default) with exponential backoff on transient
    failures (429/5xx/timeout). Non-transient errors propagate immediately."""
    attempt = 0
    while True:
        try:
            return operation()
        except Exception as exc:
            if attempt >= retries or not _is_retryable(exc):
                raise
            time.sleep(base_delay * (2 ** attempt))
            attempt += 1


def has_curl_cffi():
    try:
        import curl_cffi  # noqa: F401
        return True
    except ImportError:
        return False


def curl_cffi_request(url, headers, impersonate="safari"):
    from curl_cffi import requests as cffi_requests
    impersonation_order = ["safari", "chrome", "firefox"]
    if impersonate in impersonation_order:
        impersonation_order = [impersonate] + [x for x in impersonation_order if x != impersonate]
    last_exc = None
    for browser in impersonation_order:
        try:
            resp = cffi_requests.get(url, headers=headers, impersonate=browser, timeout=TREND_SCOUT_TIMEOUT_PER_SOURCE)
            return resp.text
        except Exception as exc:
            last_exc = exc
    raise last_exc


def classify_failure(exc, response_body="", status_code=None):
    # Pull status/body off the exception when the caller did not pass them explicitly,
    # so FetchError (and urllib HTTPError) surface blocked_403 / rate_limited_429 / waf.
    if status_code is None and exc is not None:
        status_code = getattr(exc, "status_code", None)
        if status_code is None:
            status_code = getattr(exc, "code", None)
    if not response_body and exc is not None:
        response_body = getattr(exc, "response_body", "") or ""
    if status_code == 403:
        return "blocked_403"
    if status_code == 429:
        return "rate_limited_429"
    if response_body:
        if "cf-browser-verification" in response_body or "challenge-platform" in response_body:
            return "waf_challenge"
        if len(response_body) < 500 and "<script" in response_body and not re.search(r">[^<]{10,}<", response_body):
            return "empty_spa"
    exc_str = str(type(exc).__name__).lower() if exc else ""
    if "timeout" in exc_str or (exc and "timed out" in str(exc).lower()):
        return "timeout"
    return "unknown"


class FallbackChain:
    def __init__(self, phases, source_name):
        self.phases = phases
        self.source_name = source_name

    def execute(self, fallback_events=None, **kwargs):
        last_reason = "unknown"
        for phase_index, phase_fn in enumerate(self.phases, start=1):
            try:
                result = phase_fn(**kwargs)
                if result is not None:
                    event = {"source": self.source_name, "phase_used": phase_index, "reason": "ok"}
                    if fallback_events is not None:
                        fallback_events.append(event)
                    return result, event
                last_reason = "empty_result"
            except Exception as exc:
                last_reason = classify_failure(exc)
                if phase_index < len(self.phases):
                    continue
        event = {"source": self.source_name, "phase_used": -1, "reason": last_reason}
        if fallback_events is not None:
            fallback_events.append(event)
        return None, event


class LinkExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self._href = None
        self._text = []

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self._href = dict(attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag == "a" and self._href is not None:
            text = clean_text(" ".join(self._text))
            if text and self._href:
                self.links.append((text, self._href))
            self._href = None
            self._text = []


def eprint(message):
    print(message, file=sys.stderr)


def unique_preserve(values):
    seen = set()
    ordered = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        ordered.append(value)
    return ordered


def write_json(outdir, name, payload):
    path = os.path.join(outdir, name)
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


def run_command(args):
    return subprocess.run(args, capture_output=True, text=True, check=False)


def _curl_json_once(url, headers):
    command = ["curl", "-sSL", "--compressed", "--max-time", str(TREND_SCOUT_TIMEOUT_PER_SOURCE),
               "-w", "\\n%{http_code}"]
    for key, value in headers.items():
        command.extend(["-H", f"{key}: {value}"])
    command.append(url)
    completed = run_command(command)
    if completed.returncode != 0:
        # Transport-level failure (DNS, connection, curl code 28 timeout, ...).
        raise FetchError(completed.stderr.strip() or f"curl failed for {url}")
    body, _, code_str = completed.stdout.rpartition("\n")
    status_code = int(code_str) if code_str.strip().isdigit() else None
    if status_code is not None and status_code >= 400:
        raise FetchError(
            f"HTTP {status_code} from {url}",
            status_code=status_code,
            response_body=body[:2000],
        )
    try:
        return json.loads(body)
    except json.JSONDecodeError as exc:
        snippet = body[:180].replace("\n", " ")
        raise FetchError(
            f"non-json response from {url}: {snippet}",
            status_code=status_code,
            response_body=body[:2000],
        ) from exc


def curl_json(url, headers=None):
    headers = headers or {}
    return with_retry(lambda: _curl_json_once(url, headers))


def _http_json_once(url, headers):
    request = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(request, timeout=TREND_SCOUT_TIMEOUT_PER_SOURCE) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        raise FetchError(
            f"HTTP {exc.code} from {url}",
            status_code=exc.code,
            response_body=_read_http_error_body(exc),
        ) from exc


def http_json(url, headers=None):
    return with_retry(lambda: _http_json_once(url, headers))


def _read_http_error_body(exc):
    try:
        raw = exc.read()
    except Exception:
        return ""
    if isinstance(raw, bytes):
        return raw[:2000].decode("utf-8", "ignore")
    return str(raw)[:2000]


def decode_body(raw, header_charset=None, fallback_encodings=None):
    fallback_encodings = fallback_encodings or []
    encodings = []
    if header_charset:
        encodings.append(header_charset)
    meta_match = re.search(rb"charset=['\"]?([A-Za-z0-9._-]+)", raw[:4096], re.I)
    if meta_match:
        encodings.append(meta_match.group(1).decode("ascii", "ignore"))
    encodings.extend(fallback_encodings)
    encodings.extend(["utf-8", "euc-kr", "cp949", "latin-1"])
    for encoding in unique_preserve([enc for enc in encodings if enc]):
        try:
            return raw.decode(encoding)
        except (LookupError, UnicodeDecodeError):
            continue
    return raw.decode("utf-8", "ignore")


def _http_text_once(url, headers, fallback_encodings):
    request = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(request, timeout=TREND_SCOUT_TIMEOUT_PER_SOURCE) as response:
            raw = response.read()
            return decode_body(
                raw,
                header_charset=response.headers.get_content_charset(),
                fallback_encodings=fallback_encodings,
            )
    except urllib.error.HTTPError as exc:
        raise FetchError(
            f"HTTP {exc.code} from {url}",
            status_code=exc.code,
            response_body=_read_http_error_body(exc),
        ) from exc


def http_text(url, headers=None, fallback_encodings=None):
    return with_retry(lambda: _http_text_once(url, headers, fallback_encodings))


def clean_text(text):
    if not text:
        return ""
    compact = html.unescape(text)
    compact = re.sub(r"<[^>]+>", " ", compact)
    compact = re.sub(r"\s+", " ", compact).strip()
    return compact


def clean_title(title):
    value = clean_text(title)
    value = re.sub(r"^\[[^\]]+\]\s*", "", value)
    value = re.sub(r"^(자유|후기|질문|담소|모공|새소식|유용한|사용기|강좌|사게|장터|직홍게|정보|루머)\s+", "", value)
    value = re.sub(r"^(?:·|-|•)\s*", "", value)
    return value.strip()


def summarize(text, limit=220):
    compact = clean_text(text)
    if len(compact) <= limit:
        return compact
    return compact[: limit - 1].rstrip() + "…"


def parse_iso(value):
    if not value:
        return None
    fixed = value.replace("Z", "+00:00")
    try:
        parsed = dt.datetime.fromisoformat(fixed)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=dt.timezone.utc)
    return parsed.astimezone(dt.timezone.utc)


def parse_datetime(value):
    parsed = parse_iso(value)
    if parsed:
        return parsed
    try:
        parsed = email.utils.parsedate_to_datetime(value)
    except (TypeError, ValueError, IndexError, OverflowError):
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=dt.timezone.utc)
    return parsed.astimezone(dt.timezone.utc)


def iso_from_epoch(value):
    if value in (None, ""):
        return None
    try:
        return dt.datetime.fromtimestamp(float(value), tz=dt.timezone.utc).isoformat()
    except (TypeError, ValueError, OSError):
        return None


def extract_links(html_text, base_url):
    parser = LinkExtractor()
    parser.feed(html_text)
    seen = set()
    links = []
    for text, href in parser.links:
        href = urllib.parse.urljoin(base_url, href)
        href = href.strip()
        if not href or href.startswith("javascript:"):
            continue
        key = (text, href)
        if key in seen:
            continue
        seen.add(key)
        links.append((text, href))
    return links


def extract_meta_content(html_text, field):
    patterns = [
        rf'<meta[^>]+property=["\']{re.escape(field)}["\'][^>]+content=["\']([^"\']+)["\']',
        rf'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']{re.escape(field)}["\']',
        rf'<meta[^>]+name=["\']{re.escape(field)}["\'][^>]+content=["\']([^"\']+)["\']',
        rf'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']{re.escape(field)}["\']',
    ]
    for pattern in patterns:
        match = re.search(pattern, html_text, re.I)
        if match:
            return clean_text(match.group(1))
    return ""


def extract_ld_json(html_text):
    match = re.search(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', html_text, re.S | re.I)
    if not match:
        return {}
    try:
        data = json.loads(match.group(1))
        if isinstance(data, list):
            data = data[0] if data else {}
        return {
            "name": data.get("name", "") or data.get("headline", ""),
            "description": data.get("description", ""),
            "author": (data.get("author") or {}).get("name", "") if isinstance(data.get("author"), dict) else str(data.get("author", "")),
        }
    except (json.JSONDecodeError, AttributeError):
        return {}


def enrich_summary(url, current_summary=""):
    if current_summary and len(current_summary) > 20:
        return current_summary
    try:
        html_body = http_text(url, headers={"User-Agent": BROWSER_UA}, fallback_encodings=["utf-8", "euc-kr", "cp949"])
        og_desc = extract_meta_content(html_body, "og:description")
        if og_desc:
            return summarize(og_desc)
        meta_desc = extract_meta_content(html_body, "description")
        if meta_desc:
            return summarize(meta_desc)
        ld = extract_ld_json(html_body)
        if ld.get("description"):
            return summarize(ld["description"])
        og_title = extract_meta_content(html_body, "og:title")
        if og_title:
            return summarize(og_title)
    except Exception:
        pass
    return current_summary


def batch_enrich(items, cap=3):
    if not TREND_SCOUT_ENRICH:
        return items
    import concurrent.futures
    to_enrich = [(i, item) for i, item in enumerate(items) if not item.get("summary") or len(item.get("summary", "")) <= 20]
    to_enrich = to_enrich[:cap]
    if not to_enrich:
        return items

    def do_enrich(idx_item):
        idx, item = idx_item
        return idx, enrich_summary(item["url"], item.get("summary", ""))

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        futures = {executor.submit(do_enrich, x): x for x in to_enrich}
        try:
            for future in concurrent.futures.as_completed(futures, timeout=TREND_SCOUT_TIMEOUT_PER_SOURCE):
                try:
                    idx, enriched = future.result()
                    items[idx] = dict(items[idx], summary=enriched)
                except Exception:
                    pass
        except concurrent.futures.TimeoutError:
            # Enrichment is best-effort; keep whatever finished in time and move on
            # rather than letting the deadline bubble out of the fetcher.
            pass
    return items


def title_excluded(title):
    lowered = clean_text(title).lower()
    return any(re.search(pattern, lowered, re.I) for pattern in TITLE_EXCLUDE_PATTERNS)


def looks_spam(title, summary=""):
    blob = f"{title} {summary}".lower()
    if not title or title.lower() in {"[deleted]", "[removed]"}:
        return True
    for pattern in _RUNTIME["spam_patterns"]:
        if re.search(pattern, blob):
            return True
    return False


def has_signal_text(title, summary=""):
    blob = f"{title} {summary}".lower()
    if NUMERIC_SIGNAL_RE.search(blob):
        return True
    return any(keyword in blob for keyword in _RUNTIME["signal_keywords"])


def url_has_theme_signal(url):
    lowered = (url or "").lower()
    return any(host in lowered for host in THEME_HOSTS)


def matches_theme_signal(title, summary="", url=""):
    return has_signal_text(title, summary) or url_has_theme_signal(url)


def freshness_bonus(created_at, now, days):
    parsed = parse_iso(created_at)
    if not parsed:
        return 0.0
    age_hours = max(0.0, (now - parsed).total_seconds() / 3600)
    max_window = 24.0 * days
    if age_hours >= max_window:
        return 0.0
    return round((max_window - age_hours) * 0.12, 2)


def trend_score(source, score=0, comments=0, stars=0, reactions=0, created_at=None, now=None, days=1):
    if now is None:
        now = dt.datetime.now(dt.timezone.utc)
    base = (
        float(score)
        + (float(comments) * 0.35)
        + (float(reactions) * 0.2)
        + math.log10(max(float(stars), 1.0)) * 18.0
        + freshness_bonus(created_at, now, days)
    )
    return round(base * _RUNTIME["source_weights"].get(source, 1.0), 2)


def normalized_item(
    *,
    source: str,
    channel: str,
    title: str,
    url: str,
    author: str = "",
    score=0,
    comments=0,
    stars=0,
    reactions=0,
    created_at=None,
    summary="",
    extra=None,
    now=None,
    days=1,
):
    item = {
        "source": source,
        "channel": channel,
        "title": clean_title(title),
        "url": url,
        "author": clean_text(author),
        "score": score,
        "comments": comments,
        "stars": stars,
        "reactions": reactions,
        "created_at": created_at,
        "summary": summarize(summary),
    }
    item["trend_score"] = trend_score(
        source,
        score=score,
        comments=comments,
        stars=stars,
        reactions=reactions,
        created_at=created_at,
        now=now,
        days=days,
    )
    if extra:
        item["extra"] = extra
    return item


TITLE_KEY_MIN_LENGTH = 15


def dedupe_items(items):
    deduped = {}
    for item in items:
        url_key = re.sub(r"[?#].*$", "", item["url"]).rstrip("/").lower()
        title_key = re.sub(r"\W+", "", item["title"]).lower()
        key = url_key or title_key

        title_key_usable = bool(title_key) and len(title_key) >= TITLE_KEY_MIN_LENGTH

        existing = deduped.get(key)
        if not existing and title_key_usable:
            existing = deduped.get(title_key)
            if existing:
                key = title_key

        if not existing or item["trend_score"] > existing["trend_score"]:
            winner = item
            # Update all existing keys pointing to the old entry to point to winner
            for k in list(deduped.keys()):
                if deduped[k] is existing:
                    deduped[k] = winner
            deduped[key] = winner
            if title_key_usable:
                deduped[title_key] = winner
            if url_key:
                deduped[url_key] = winner

    seen_ids = set()
    unique = []
    for item in deduped.values():
        item_id = id(item)
        if item_id in seen_ids:
            continue
        seen_ids.add(item_id)
        unique.append(item)

    return sorted(
        unique,
        key=lambda entry: (
            entry["trend_score"],
            parse_iso(entry.get("created_at")) or dt.datetime(1970, 1, 1, tzinfo=dt.timezone.utc),
        ),
        reverse=True,
    )


def sidecar_google_news(site_name, limit=10):
    """Google News RSS query for site_name as parallel fallback sidecar."""
    query = urllib.parse.quote(f"{site_name} AI OR 개발 OR 오픈소스")
    url = f"https://news.google.com/rss/search?q={query}&hl=ko&gl=KR&ceid=KR:ko"
    try:
        entries = parse_feed_entries(url)
    except Exception:
        return []
    items = []
    for i, entry in enumerate(entries[:limit]):
        if matches_theme_signal(entry["title"], entry.get("summary", ""), entry["url"]):
            items.append(normalized_item(
                source="google_news",
                channel=f"GoogleNews/{site_name}-sidecar",
                title=entry["title"],
                url=entry["url"],
                score=position_score(i, 10),
                created_at=entry.get("published"),
                summary=entry.get("summary", ""),
            ))
    return items


def position_score(index, ceiling=18):
    return max(1, ceiling - index)


def is_counter_text(text):
    cleaned = clean_text(text)
    if not cleaned:
        return True
    if re.fullmatch(r"[\[\(]?\d+(?:/\d+)?[\]\)]?", cleaned):
        return True
    return len(cleaned) <= 1


def parse_feed_entries(url):
    xml_text = http_text(url, headers=RSS_HEADERS)
    root = ET.fromstring(xml_text)
    entries = []
    if root.tag.endswith("rss"):
        for item in root.findall("./channel/item"):
            entries.append(
                {
                    "title": clean_text(item.findtext("title") or ""),
                    "url": clean_text(item.findtext("link") or ""),
                    "summary": clean_text(item.findtext("description") or ""),
                    "published": (
                        parse_datetime(item.findtext("pubDate") or "").isoformat()
                        if parse_datetime(item.findtext("pubDate") or "")
                        else None
                    ),
                }
            )
        return entries
    atom_ns = {"atom": "http://www.w3.org/2005/Atom"}
    for entry in root.findall("atom:entry", atom_ns):
        link = ""
        for link_node in entry.findall("atom:link", atom_ns):
            href = link_node.attrib.get("href")
            rel = link_node.attrib.get("rel", "alternate")
            if href and rel == "alternate":
                link = href
                break
            if href and not link:
                link = href
        published = (
            entry.findtext("atom:updated", "", atom_ns)
            or entry.findtext("atom:published", "", atom_ns)
        )
        entries.append(
            {
                "title": clean_text(entry.findtext("atom:title", "", atom_ns)),
                "url": clean_text(link),
                "summary": clean_text(
                    entry.findtext("atom:summary", "", atom_ns)
                    or entry.findtext("atom:content", "", atom_ns)
                ),
                "published": parse_datetime(published).isoformat() if parse_datetime(published) else None,
            }
        )
    return entries


def extract_page_candidates(url, pattern, source_headers=None, fallback_encodings=None):
    html_text = http_text(url, headers=source_headers or {"User-Agent": BROWSER_UA}, fallback_encodings=fallback_encodings)
    matches = []
    for text, href in extract_links(html_text, url):
        href_key = href.split("#", 1)[0]
        if not re.search(pattern, href_key):
            continue
        title = clean_title(text)
        if is_counter_text(title) or looks_spam(title) or title_excluded(title):
            continue
        matches.append({"title": title, "url": href_key})
    ordered = []
    seen = set()
    for match in matches:
        key = (match["title"], match["url"])
        if key in seen:
            continue
        seen.add(key)
        ordered.append(match)
    return ordered


def naver_search_fallback(site_name, site_domain, source_name, channel_prefix, limit):
    query = f"site:{site_domain} AI OR 개발 OR 오픈소스"
    search_url = (
        "https://search.naver.com/search.naver?"
        f"where=web&query={urllib.parse.quote(query)}"
    )
    html_body = http_text(search_url, headers=NAVER_HEADERS)
    links = []
    for title, href in extract_links(html_body, search_url):
        if site_domain not in href:
            continue
        cleaned = clean_title(title)
        if len(cleaned) < 6 or looks_spam(cleaned):
            continue
        links.append({"title": cleaned, "url": href})
    seen = set()
    ordered = []
    for link in links:
        if link["url"] in seen:
            continue
        seen.add(link["url"])
        ordered.append(link)
    items = []
    for index, link in enumerate(ordered[:limit]):
        items.append(
            normalized_item(
                source=source_name,
                channel=f"{channel_prefix}/NaverFallback",
                title=link["title"],
                url=link["url"],
                score=position_score(index, 10),
            )
        )
    return items if items else None


def naver_blog_to_mobile(url):
    match = re.search(r"https?://blog\.naver\.com/([^/]+)/([0-9]+)", url)
    if not match:
        return None
    return (
        "https://m.blog.naver.com/PostView.naver?"
        f"blogId={match.group(1)}&logNo={match.group(2)}"
    )


def load_config():
    default_path = os.path.join(os.path.dirname(__file__), "config", "default.json")
    with open(default_path) as f:
        config = json.load(f)

    override_path = os.environ.get("TREND_SCOUT_CONFIG")
    if override_path and os.path.isfile(override_path):
        with open(override_path) as f:
            overrides = json.load(f)
        config = _apply_overrides(config, overrides)

    apply_runtime_config(config)
    return config


def _apply_overrides(config, overrides):
    result = dict(config)
    for key, value in overrides.items():
        if key.endswith("_add"):
            base_key = key[:-4]
            if base_key in result and isinstance(result[base_key], list):
                result[base_key] = result[base_key] + list(value)
        elif key.endswith("_remove"):
            base_key = key[:-7]
            if base_key in result and isinstance(result[base_key], list):
                existing = result[base_key]
                to_remove = list(value)
                if existing and isinstance(existing[0], dict):
                    id_key = _get_id_key(base_key)
                    remove_vals = {(item.get(id_key) if isinstance(item, dict) else item) for item in to_remove}
                    result[base_key] = [item for item in existing if item.get(id_key) not in remove_vals]
                else:
                    result[base_key] = [item for item in existing if item not in to_remove]
        elif key == "source_weights":
            merged = dict(result.get("source_weights", {}))
            merged.update(value)
            result["source_weights"] = merged
        else:
            result[key] = value
    return result


def _get_id_key(array_key):
    if array_key in ("bluesky_handles",):
        return "handle"
    return "label" if array_key in ("github_topics",) else "channel"
