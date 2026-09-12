# Media Processing

## What it does

Processes video, audio, and image files through a multi-phase pipeline — ingest, analyze with AI (Gemini for vision, Claude for reasoning), and generate clips or summaries.

## Setup required

Requires Gemini API key for visual analysis.

## Permissions

- Gemini API key required for keyframe/video analysis
- File access permissions for media files

## Common prompts

| You say...                                      | What happens                     |
| ----------------------------------------------- | -------------------------------- |
| “Analyze this video and tell me what happens”   | Full video analysis pipeline     |
| “Extract the key moments from this recording”   | Keyframe extraction and analysis |
| “Find the part where they discuss pricing”      | Query-based video search         |
| “Generate a 30-second clip of the product demo” | Video clip extraction            |
| “Transcribe and analyze this podcast episode”   | Audio processing                 |

## Configuration

- Three-phase pipeline: preprocess (ingest, deduplicate), map (Gemini-powered visual analysis), reduce (Claude-powered reasoning)
- Supports keyframe extraction, dead time detection, and cost tracking
- Resumable if interrupted

## Tips & gotchas

- **Automatic chunking.** Large media files are handled automatically — video is split into keyframes or chunks.
- **Cost tracking.** Shows you how much API usage each analysis requires.
- **Resumable.** If processing is interrupted, it picks up where it left off.
- **Simple transcription?** For transcription without visual analysis, use the Transcribe skill instead.
