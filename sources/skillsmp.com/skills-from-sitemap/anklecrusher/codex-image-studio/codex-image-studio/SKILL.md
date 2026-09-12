---
name: codex-image-studio
description: Image generation workflow for Codex using OpenAI-compatible APIs. Use when the user wants Codex to create, edit, or batch-produce images through a third-party or self-hosted image endpoint, including text-to-image, image-to-image, multi-reference edits, mask edits, or multi-job generation.
---

# Codex Image Studio

## Overview

Use this skill to make Codex run a predictable image-generation workflow through an OpenAI-compatible API. The user should be able to ask for images in natural language while Codex handles prompt shaping, mode choice, API invocation, output naming, and result inspection.

## Configuration

Use this configuration precedence:

1. Existing environment variables in the current process.
2. User-level private env file:
   - Windows: `%USERPROFILE%\.codex\secrets\image_api.env`
   - Unix-like: `$HOME/.codex/secrets/image_api.env`

The supported keys are:

- `OPENAI_API_KEY`: API key for the OpenAI-compatible provider.
- `OPENAI_BASE_URL`: provider base URL, for example `https://example.com/v1`.
- `IMAGE_MODEL`: optional model override. Default to `gpt-image-2`.

On first install or first use, create the secrets folder and template file if missing. Do not overwrite an existing file.

Template:

```env
OPENAI_API_KEY=
OPENAI_BASE_URL=
IMAGE_MODEL=gpt-image-2
```

After creating the template, tell the user to fill in `OPENAI_API_KEY` and `OPENAI_BASE_URL` before generation.

Never print the API key. If the key is stored in a local file, read it without echoing it and set it only for the current process.

## Engine

For text-to-image generation, use the repository's dependency-free HTTP adapter first:

`<skill-root>/scripts/generate_image.py`

Example:

```powershell
python <skill-root>/scripts/generate_image.py `
  --prompt-file prompt.txt `
  --model "$env:IMAGE_MODEL" `
  --size 1024x1024 `
  --quality high `
  --out output/imagegen/output.png
```

The adapter posts directly to `/images/generations`, intentionally omits `n`, retries one time for transient `429`/`502`/`503`/`504` responses, and accepts common base64, data-URL, nested, and returned-URL response shapes. It reads existing process environment variables before filling missing values from the user-level env file and never prints the API key.

Use the bundled system image generation CLI only as a fallback for image editing or provider-specific batch features that the adapter does not cover:

`$HOME/.codex/skills/.system/imagegen/scripts/image_gen.py`

## Mode Selection

- Use `generate` for text-to-image.
- Use `edit` for image-to-image, multi-reference generation, or mask-guided edits.
- Use `generate-batch` for multiple different prompts or a production run.

For multiple variants of one prompt, run the HTTP adapter once per output instead of sending `n`; this provider's compatibility layer may reject `n=1`. For multiple distinct prompts, use separate adapter calls or the system CLI's `generate-batch` only when that provider path is known to work.

## Text-To-Image

Generate from text only. Always specify:

- model
- size
- quality
- output path
- prompt

The default text-to-image path is `scripts/generate_image.py`. Do not route this path through `OpenAI().images.generate()` unless the provider has been verified to return a populated `data[].b64_json` response.

Default model order:

1. `IMAGE_MODEL` if set.
2. `gpt-image-2`.
3. Provider alias such as `image-2` only after the first model name fails.

## Image-To-Image

Use `edit` and pass each reference image with repeated `--image` arguments. Use `--mask` only for localized edits. For `gpt-image-2`, do not pass `--input-fidelity`; the bundled CLI treats image inputs as high fidelity for that model.

For reference-guided generation, explicitly describe each input image's role in the prompt, such as "Image 1 is the shape reference" or "Image 2 is the material reference."

## Batch Generation

Use JSONL where each line is one job. Keep jobs provider-neutral and include at least:

```json
{"prompt":"...","out":"output-name.png","model":"gpt-image-2","size":"1536x1024","quality":"high"}
```

If the bundled CLI requires its own batch schema, follow the script's help output rather than inventing a new schema.

## Prompt Rules

Write prompts as concise production specs:

- Asset type
- Primary request
- Subject
- Style or medium
- Composition and framing
- Lighting
- Materials and palette
- Constraints
- Avoid list

For product renders, add "no text, no logo, no watermark" unless the user asks for text.

## Output Rules

- Save final images under the current workspace unless the user specifies another folder.
- Use descriptive filenames and avoid overwriting existing files unless requested.
- Inspect generated images when possible.
- Report saved paths and briefly mention the final prompt intent.

## Failure Recovery

- If authentication fails, ask the user to verify `OPENAI_API_KEY` and `OPENAI_BASE_URL`.
- If the HTTP adapter receives a transient gateway response, let its single retry finish before reporting failure.
- If no image payload is found, report the HTTP status and sanitized response detail; do not silently fall back to an empty SDK response.
- If model lookup fails, retry once with `image-2` when the provider is known to use aliases.
- If generation succeeds but the output misses core constraints, iterate with one targeted correction.
- If the provider does not support edit or batch endpoints, explain the limitation and fall back to text-to-image only.
