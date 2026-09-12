---
name: image2-generate
description: Generate and save images through an image2-compatible relay or middle-layer API using user-provided Base URL and API key. Use for text-to-image requests that should call a relay instead of the built-in image tool.
---

# Image2 Generate

Generate images through an OpenAI-compatible image2 relay API and save the outputs as local files.

## Configuration

Read configuration from environment variables. Never ask the user to paste an API key into chat, and never write API keys into this skill, scripts, README files, or a Git repository.

- `IMAGE2_BASE_URL`: relay base URL, such as `https://apinebula.ai/v1`
- `IMAGE2_API_KEY`: bearer token for the relay
- `IMAGE2_MODEL`: image model, default `gpt-image-2`
- `IMAGE2_SIZE`: image size, default `1024x1024`
- `IMAGE2_SYNC`: default `1`; set to `0` to use the async endpoint
- `IMAGE2_TIMEOUT`: request or task timeout in seconds, default `1800`
- `IMAGE2_POLL_INTERVAL`: async polling interval in seconds, default `3`
- `IMAGE2_USER_AGENT`: optional User-Agent override

If `IMAGE2_BASE_URL` or `IMAGE2_API_KEY` is missing, pause and help the user configure it locally. Ask the user to obtain the API key from their relay provider's dashboard/API Keys page and enter it through a local hidden prompt or environment variable command.

For OS-specific setup commands, read [references/env.md](references/env.md).

## Workflow

1. Clarify the prompt, aspect/size, output count, and style only when they are missing.
2. Use `scripts/generate_image.py` with the user's prompt.
3. Prefer the default synchronous `/images/generations` endpoint because common image2 relays support it; use `--async` only when the relay documents async support.
4. Save generated images locally and return absolute file paths. In Codex desktop, render the result with Markdown image syntax.

## Usage

On Windows PowerShell:

```powershell
py -3 "C:\path\to\image2-generate\scripts\generate_image.py" `
  --prompt "A cinematic product cover of ..."
```

On macOS/Linux:

```bash
python3 /path/to/image2-generate/scripts/generate_image.py \
  --prompt "A cinematic product cover of ..."
```

Use `--size`, `--n`, `--output-dir`, and `--prefix` when the user asks for a specific format, multiple variants, or a target folder.

## Notes

- `IMAGE2_BASE_URL` is only the base URL; do not append `/images/generations` to it.
- The script supports responses containing `data[].b64_json`, `data[].url`, `output[].result`, `image`, `base64`, or common nested image fields.
- Stop after a clear 401, 403, quota, or invalid URL error and report the status plus response body without retrying endlessly.
