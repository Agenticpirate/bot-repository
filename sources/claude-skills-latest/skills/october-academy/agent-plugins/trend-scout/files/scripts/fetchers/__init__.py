"""Fetcher family modules. ALL_FETCHERS is the ordered list for main.py."""
from fetchers.json_api import (
    fetch_reddit,
    fetch_hackernews,
    fetch_lobsters,
    fetch_devto,
    fetch_stackoverflow,
    fetch_npm,
    fetch_v2ex,
)
from fetchers.html_scraper import (
    fetch_clien,
    fetch_ruliweb,
    fetch_ppomppu,
    fetch_dcinside,
)
from fetchers.rss_fetcher import (
    fetch_geeknews,
    fetch_yozm,
    fetch_google_news,
    fetch_arxiv,
)
from fetchers.social import fetch_bluesky, fetch_mastodon
from fetchers.naver import fetch_naver_blog, fetch_fmkorea
from fetchers.github import fetch_github

ALL_FETCHERS = [
    fetch_reddit,
    fetch_hackernews,
    fetch_lobsters,
    fetch_devto,
    fetch_github,
    fetch_stackoverflow,
    fetch_npm,
    fetch_bluesky,
    fetch_mastodon,
    fetch_geeknews,
    fetch_yozm,
    fetch_google_news,
    fetch_naver_blog,
    fetch_clien,
    fetch_ruliweb,
    fetch_ppomppu,
    fetch_dcinside,
    fetch_fmkorea,
    fetch_v2ex,
    fetch_arxiv,
]
