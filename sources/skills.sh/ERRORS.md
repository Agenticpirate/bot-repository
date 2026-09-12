# skills.sh errors

Updated: 2026-09-12T12:21:57Z

## Rate limit

Live `GET /api/download/{owner}/{repo}/{slug}` returns HTTP 429 `{"error":"rate_limit_exceeded","message":"Rate limit exceeded. Maximum 60 requests per hour."}` with `Retry-After: 60`.

Target is all 19998 sitemap ids. 569 have full `files/` + hash. 19418 remain.
At 50 successful downloads/hour this is a multi-day resume job. The downloader is resume-friendly and stays under the cap.

## Permanent misses

11 ids returned HTTP 404 from the download API; page HTML was saved once:

- `runcomfy-com/skills/coll_ai-image-generation`
- `runcomfy-com/skills/coll_ai-music`
- `runcomfy-com/skills/coll_ai-video-generation`
- `runcomfy-com/skills/coll_image-to-video`
- `runcomfy-com/skills/coll_video-edit`
- `heygen-com/hyperframes/captions-overlay`
- `heygen-com/hyperframes/changelog-video`
- `heygen-com/hyperframes/cut-the-curve`
- `heygen-com/hyperframes/motion-doctrine`
- `heygen-com/hyperframes/oversized-cursor`
- `heygen-com/hyperframes/seam-craft`

Resume: `python3 scripts/download_skills_sh.py --concurrency 1 --hourly-budget 50 --max-new 50 --update-catalog`
