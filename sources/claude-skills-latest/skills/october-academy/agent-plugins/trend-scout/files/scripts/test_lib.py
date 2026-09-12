"""
Offline unit tests for trend-scout Phase 1 components.
Run: python -m pytest test_lib.py -v
"""
import datetime as dt
import io
import os
import sys
import unittest
import urllib.error
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.dirname(__file__))

import lib
from lib import (
    apply_runtime_config,
    classify_failure,
    dedupe_items,
    enrich_summary,
    extract_ld_json,
    FallbackChain,
    FetchError,
    has_signal_text,
    http_json,
    http_text,
    looks_spam,
    trend_score,
    with_retry,
)

FALLBACK_EVENTS = []

FIXED_NOW = dt.datetime(2026, 7, 10, 12, 0, 0, tzinfo=dt.timezone.utc)


def _reset_runtime():
    """Restore module runtime scoring inputs to the hard-coded defaults."""
    lib._RUNTIME["source_weights"] = dict(lib.SOURCE_WEIGHTS)
    lib._RUNTIME["signal_keywords"] = list(lib.SIGNAL_KEYWORDS)
    lib._RUNTIME["spam_patterns"] = list(lib.SPAM_PATTERNS)


# ---------------------------------------------------------------------------
# TestClassifyFailure
# ---------------------------------------------------------------------------

class TestClassifyFailure(unittest.TestCase):

    def test_403_status(self):
        result = classify_failure(None, "", 403)
        self.assertEqual(result, "blocked_403")

    def test_429_status(self):
        result = classify_failure(None, "", 429)
        self.assertEqual(result, "rate_limited_429")

    def test_waf_challenge_body(self):
        body = "<html><body>cf-browser-verification challenge</body></html>"
        result = classify_failure(None, body, 200)
        self.assertEqual(result, "waf_challenge")

    def test_waf_challenge_platform(self):
        body = "<html>challenge-platform detected</html>"
        result = classify_failure(None, body, 200)
        self.assertEqual(result, "waf_challenge")

    def test_empty_spa_body(self):
        body = "<html><head></head><body><script src='app.js'></script></body></html>"
        result = classify_failure(None, body, 200)
        self.assertEqual(result, "empty_spa")

    def test_timeout_exception(self):
        exc = TimeoutError("timed out")
        result = classify_failure(exc, "", None)
        self.assertEqual(result, "timeout")

    def test_unknown_fallthrough(self):
        result = classify_failure(Exception("some random error"), "normal page content here", 200)
        self.assertEqual(result, "unknown")


# ---------------------------------------------------------------------------
# TestDedupeItems
# ---------------------------------------------------------------------------

class TestDedupeItems(unittest.TestCase):

    def _item(self, url, title, score=1.0, source="test"):
        return {
            "source": source,
            "channel": "Test/ch",
            "title": title,
            "url": url,
            "author": "",
            "score": score,
            "comments": 0,
            "stars": 0,
            "reactions": 0,
            "created_at": None,
            "summary": "",
            "trend_score": score,
        }

    def test_url_key_normalization(self):
        items = [
            self._item("https://example.com/page/?foo=1#bar", "Title A", 5),
            self._item("https://example.com/page/", "Title A duplicate", 3),
        ]
        result = dedupe_items(items)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["trend_score"], 5)

    def test_duplicate_merge_highest_score(self):
        items = [
            self._item("https://example.com/post/1", "Post One", 10),
            self._item("https://example.com/post/1", "Post One Again", 5),
        ]
        result = dedupe_items(items)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["trend_score"], 10)

    def test_sorted_by_trend_score_desc(self):
        items = [
            self._item("https://a.com/1", "Low", 2),
            self._item("https://b.com/2", "High", 10),
            self._item("https://c.com/3", "Mid", 5),
        ]
        result = dedupe_items(items)
        scores = [r["trend_score"] for r in result]
        self.assertEqual(scores, sorted(scores, reverse=True))

    def test_title_key_fallback(self):
        items = [
            self._item("https://news.google.com/rss/articles/CBMiABC", "Anthropic Launches Claude 4 Model", 5, "google_news"),
            self._item("https://techcrunch.com/2026/04/20/claude-4", "Anthropic Launches Claude 4 Model", 8, "techcrunch"),
        ]
        result = dedupe_items(items)
        self.assertIsInstance(result, list)
        self.assertGreaterEqual(len(result), 1)

    def test_short_title_no_false_merge(self):
        # Short titles (< 15 chars after stripping non-word chars) must NOT trigger title-based dedup
        items = [
            self._item("https://site-a.com/post/1", "AI 소식", 5, "source_a"),
            self._item("https://site-b.com/post/2", "AI 소식", 8, "source_b"),
        ]
        result = dedupe_items(items)
        # Both items have different URLs and a short title — they must be kept separate
        self.assertEqual(len(result), 2)


# ---------------------------------------------------------------------------
# TestEnrichSummary
# ---------------------------------------------------------------------------

class TestEnrichSummary(unittest.TestCase):

    def test_og_description_extraction(self):
        html = '<html><head><meta property="og:description" content="This is OG description"/></head></html>'
        with patch("lib.http_text", return_value=html):
            result = enrich_summary("https://example.com/post", "")
        self.assertIn("OG description", result)

    def test_skips_when_summary_exists(self):
        existing = "This summary is definitely longer than twenty characters."
        with patch("lib.http_text", side_effect=AssertionError("should not fetch")):
            result = enrich_summary("https://example.com/post", existing)
        self.assertEqual(result, existing)

    def test_ld_json_fallback(self):
        html = '''<html><head>
        <script type="application/ld+json">{"@type":"Article","description":"LD JSON description here"}</script>
        </head></html>'''
        with patch("lib.http_text", return_value=html):
            result = enrich_summary("https://example.com/post", "")
        self.assertIn("LD JSON description", result)

    def test_returns_empty_on_error(self):
        def raise_err(url, **kw):
            raise ConnectionError("network error")
        with patch("lib.http_text", side_effect=raise_err):
            result = enrich_summary("https://example.com/post", "")
        self.assertEqual(result, "")


# ---------------------------------------------------------------------------
# TestFallbackChain
# ---------------------------------------------------------------------------

class TestFallbackChain(unittest.TestCase):

    def setUp(self):
        FALLBACK_EVENTS.clear()

    def test_phase1_success_no_escalation(self):
        phase1 = MagicMock(return_value=["item1"])
        phase2 = MagicMock(return_value=["item2"])
        chain = FallbackChain([phase1, phase2], "test_source")
        result, event = chain.execute(fallback_events=FALLBACK_EVENTS)
        self.assertEqual(result, ["item1"])
        self.assertEqual(event["phase_used"], 1)
        phase2.assert_not_called()

    def test_phase1_fail_phase2_success(self):
        phase1 = MagicMock(side_effect=RuntimeError("403 blocked"))
        phase2 = MagicMock(return_value=["item_from_cffi"])
        chain = FallbackChain([phase1, phase2], "test_source")
        result, event = chain.execute(fallback_events=FALLBACK_EVENTS)
        self.assertEqual(result, ["item_from_cffi"])
        self.assertEqual(event["phase_used"], 2)

    def test_phase1_fail_phase2_skip_phase3_success(self):
        phase1 = MagicMock(side_effect=RuntimeError("blocked"))
        phase2 = MagicMock(side_effect=RuntimeError("curl_cffi not available"))
        phase3 = MagicMock(return_value=["item_from_naver"])
        chain = FallbackChain([phase1, phase2, phase3], "test_source")
        result, event = chain.execute(fallback_events=FALLBACK_EVENTS)
        self.assertEqual(result, ["item_from_naver"])
        self.assertEqual(event["phase_used"], 3)

    def test_all_phases_fail(self):
        phase1 = MagicMock(side_effect=RuntimeError("fail1"))
        phase2 = MagicMock(side_effect=RuntimeError("fail2"))
        phase3 = MagicMock(side_effect=RuntimeError("fail3"))
        chain = FallbackChain([phase1, phase2, phase3], "test_source")
        result, event = chain.execute(fallback_events=FALLBACK_EVENTS)
        self.assertIsNone(result)
        self.assertEqual(event["phase_used"], -1)

    def test_event_record_structure(self):
        phase1 = MagicMock(return_value=["data"])
        chain = FallbackChain([phase1], "my_source")
        result, event = chain.execute(fallback_events=FALLBACK_EVENTS)
        self.assertIn("source", event)
        self.assertIn("phase_used", event)
        self.assertIn("reason", event)
        self.assertEqual(event["source"], "my_source")
        self.assertTrue(any(e["source"] == "my_source" for e in FALLBACK_EVENTS))

    def test_fetch_error_surfaces_403(self):
        # A phase raising FetchError(403) must classify as blocked_403 via the exception.
        phase = MagicMock(side_effect=FetchError("blocked", status_code=403))
        chain = FallbackChain([phase], "blocked_source")
        result, event = chain.execute(fallback_events=FALLBACK_EVENTS)
        self.assertIsNone(result)
        self.assertEqual(event["reason"], "blocked_403")

    def test_fetch_error_surfaces_429(self):
        phase = MagicMock(side_effect=FetchError("slow down", status_code=429))
        chain = FallbackChain([phase], "rate_source")
        _, event = chain.execute(fallback_events=FALLBACK_EVENTS)
        self.assertEqual(event["reason"], "rate_limited_429")

    def test_fetch_error_surfaces_waf(self):
        body = "<html>challenge-platform blah</html>"
        phase = MagicMock(side_effect=FetchError("waf", status_code=200, response_body=body))
        chain = FallbackChain([phase], "waf_source")
        _, event = chain.execute(fallback_events=FALLBACK_EVENTS)
        self.assertEqual(event["reason"], "waf_challenge")


# ---------------------------------------------------------------------------
# TestTrendScore
# ---------------------------------------------------------------------------

class TestTrendScore(unittest.TestCase):

    def tearDown(self):
        _reset_runtime()

    def test_source_weight_applied(self):
        # hackernews weight (1.25) > reddit weight (1.0) for identical raw inputs.
        hn = trend_score("hackernews", score=100, now=FIXED_NOW)
        reddit = trend_score("reddit", score=100, now=FIXED_NOW)
        self.assertAlmostEqual(hn, round(reddit * 1.25, 2), places=2)

    def test_unknown_source_weight_is_one(self):
        # An unmapped source falls back to weight 1.0, matching a weight-1.0 source.
        unknown = trend_score("does-not-exist", score=50, now=FIXED_NOW)
        reddit = trend_score("reddit", score=50, now=FIXED_NOW)
        self.assertEqual(unknown, reddit)

    def test_freshness_bonus_rewards_recent(self):
        recent = (FIXED_NOW - dt.timedelta(hours=1)).isoformat()
        old = (FIXED_NOW - dt.timedelta(hours=20)).isoformat()
        fresh_score = trend_score("reddit", score=10, created_at=recent, now=FIXED_NOW, days=1)
        stale_score = trend_score("reddit", score=10, created_at=old, now=FIXED_NOW, days=1)
        self.assertGreater(fresh_score, stale_score)

    def test_freshness_zero_outside_window(self):
        outside = (FIXED_NOW - dt.timedelta(hours=30)).isoformat()
        with_created = trend_score("reddit", score=10, created_at=outside, now=FIXED_NOW, days=1)
        without = trend_score("reddit", score=10, created_at=None, now=FIXED_NOW, days=1)
        self.assertEqual(with_created, without)


# ---------------------------------------------------------------------------
# TestConfigConsumption — config/default.json actually drives scoring
# ---------------------------------------------------------------------------

class TestConfigConsumption(unittest.TestCase):

    def tearDown(self):
        _reset_runtime()

    def test_source_weight_override_consumed(self):
        apply_runtime_config({"source_weights": {"reddit": 3.0}})
        self.assertEqual(lib._RUNTIME["source_weights"]["reddit"], 3.0)
        boosted = trend_score("reddit", score=10, now=FIXED_NOW)
        _reset_runtime()
        base = trend_score("reddit", score=10, now=FIXED_NOW)
        self.assertAlmostEqual(boosted, round(base * 3.0, 2), places=2)

    def test_signal_keywords_override_consumed(self):
        apply_runtime_config({"signal_keywords": ["zzunique"]})
        self.assertTrue(has_signal_text("a post about zzunique widgets"))
        # A former default keyword no longer counts once the list is replaced.
        self.assertFalse(has_signal_text("a plain agent story"))

    def test_spam_patterns_override_consumed(self):
        apply_runtime_config({"spam_patterns": [r"\bbanana\b"]})
        self.assertTrue(looks_spam("free banana giveaway"))
        # Default spam trigger no longer fires under the replaced list.
        self.assertFalse(looks_spam("we are hiring engineers"))

    def test_load_config_applies_defaults(self):
        config = lib.load_config()
        self.assertEqual(lib._RUNTIME["source_weights"], config["source_weights"])
        self.assertEqual(lib._RUNTIME["spam_patterns"], config["spam_patterns"])


# ---------------------------------------------------------------------------
# TestSpamGate — refined phrase-scoped spam patterns
# ---------------------------------------------------------------------------

class TestSpamGate(unittest.TestCase):

    def tearDown(self):
        _reset_runtime()

    def test_broad_words_survive(self):
        # These contain "job" / "looking for" but are legitimate technical topics.
        for title in [
            "background job runner for Python",
            "a job queue built on Redis",
            "looking for feedback on my open source CLI",
        ]:
            self.assertFalse(looks_spam(title), title)

    def test_real_spam_caught(self):
        for title in [
            "We are hiring senior engineers",
            "Looking for a co-founder for my SaaS",
            "DevRel job opening at Vercel",
            "Subscribe to my newsletter",
        ]:
            self.assertTrue(looks_spam(title), title)


# ---------------------------------------------------------------------------
# TestSignalGate — numeric signal requires a unit/percent/multiplier
# ---------------------------------------------------------------------------

class TestSignalGate(unittest.TestCase):

    def tearDown(self):
        _reset_runtime()

    def test_numeric_with_unit_is_signal(self):
        for title in [
            "reached $10k MRR this month",
            "300% growth in Q3",
            "10x faster cold starts",
            "5000 users in the first week",
            "1억 매출 돌파",
        ]:
            self.assertTrue(has_signal_text(title), title)

    def test_bare_number_is_not_signal(self):
        # Numbers with no unit and no keyword must not pass the gate anymore.
        for title in ["chapter 3 of my journey", "part 2 of the story", "top 5 breakfasts"]:
            self.assertFalse(has_signal_text(title), title)

    def test_keyword_still_signals(self):
        self.assertTrue(has_signal_text("a new open source framework"))


# ---------------------------------------------------------------------------
# TestRetry — http-layer retry on 429/5xx/timeout
# ---------------------------------------------------------------------------

class _FakeResp:
    def __init__(self, data):
        self._data = data

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self):
        return self._data


def _http_error(code):
    return urllib.error.HTTPError("http://x", code, "err", {}, io.BytesIO(b"boom"))


class TestRetry(unittest.TestCase):

    def test_is_retryable_status(self):
        self.assertTrue(lib._is_retryable(FetchError("x", status_code=503)))
        self.assertTrue(lib._is_retryable(FetchError("x", status_code=429)))
        self.assertFalse(lib._is_retryable(FetchError("x", status_code=404)))

    def test_is_retryable_timeout(self):
        self.assertTrue(lib._is_retryable(TimeoutError("timed out")))

    def test_with_retry_succeeds_after_one_retry(self):
        op = MagicMock(side_effect=[FetchError("busy", status_code=503), "ok"])
        with patch("lib.time.sleep"):
            result = with_retry(op)
        self.assertEqual(result, "ok")
        self.assertEqual(op.call_count, 2)

    def test_with_retry_gives_up_on_non_retryable(self):
        op = MagicMock(side_effect=FetchError("nope", status_code=404))
        with self.assertRaises(FetchError):
            with_retry(op)
        self.assertEqual(op.call_count, 1)

    def test_with_retry_stops_after_retry_budget(self):
        op = MagicMock(side_effect=FetchError("busy", status_code=500))
        with patch("lib.time.sleep"):
            with self.assertRaises(FetchError):
                with_retry(op)
        self.assertEqual(op.call_count, 2)

    def test_http_json_wraps_http_error_and_retries(self):
        # 503 then success — one retry, returns the parsed JSON.
        with patch("lib.urllib.request.urlopen",
                   side_effect=[_http_error(503), _FakeResp(b'{"ok": 1}')]) as urlopen, \
             patch("lib.time.sleep"):
            result = http_json("http://x")
        self.assertEqual(result, {"ok": 1})
        self.assertEqual(urlopen.call_count, 2)

    def test_http_json_wraps_404_no_retry(self):
        with patch("lib.urllib.request.urlopen", side_effect=_http_error(404)) as urlopen:
            with self.assertRaises(FetchError) as ctx:
                http_json("http://x")
        self.assertEqual(ctx.exception.status_code, 404)
        self.assertEqual(urlopen.call_count, 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
