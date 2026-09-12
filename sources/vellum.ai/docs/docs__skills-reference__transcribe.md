# Transcribe

## What it does

Transcribes audio and video files using OpenAI Whisper (cloud) or whisper.cpp (local). Fast, accurate speech-to-text.

## Setup required

OpenAI API key for cloud mode, or whisper.cpp installed locally for free on-device transcription.

## Permissions

- OpenAI API key (cloud mode) or local whisper.cpp installation
- File access for media files

## Common prompts

| You say...                                 | What happens                               |
| ------------------------------------------ | ------------------------------------------ |
| “Transcribe this meeting recording”        | Converts audio to text                     |
| “Transcribe this video locally”            | Uses on-device whisper.cpp (free, private) |
| “Transcribe this podcast and summarize it” | Transcription plus AI summary              |

## Configuration

- Two modes — cloud (OpenAI Whisper, \~$0.006/min, fast) or local (whisper.cpp, free, private, slower)
- Automatically extracts audio from video files
- Handles files over 25MB by splitting

## Tips & gotchas

- **Cloud vs. local.** Use cloud mode for speed, local mode for privacy (audio never leaves your machine).
- **Large file handling.** Large files are automatically split at the 25MB boundary.
- **Video support.** Video files have their audio extracted automatically — no need to convert first.
- **Combine with Document.** Turn a transcript into a polished report using the Document skill.
