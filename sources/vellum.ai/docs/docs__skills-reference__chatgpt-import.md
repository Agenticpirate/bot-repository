# ChatGPT Import

## What it does

Imports your conversation history from ChatGPT into Vellum so your assistant can learn from your past interactions.

## Setup required

Export your data from ChatGPT (Settings > Data controls > Export data). You'll receive a ZIP file.

## Permissions

- File access to read the exported ZIP archive

## Common prompts

| You say...                                             | What happens              |
| ------------------------------------------------------ | ------------------------- |
| “Import my ChatGPT history”                            | Starts the import process |
| “I have a ChatGPT export ZIP file, can you import it?” | Processes the export      |

## Configuration

- Imports user and assistant messages with original timestamps preserved
- Deduplicates on re-import (safe to run multiple times)
- Imported conversations are auto-indexed for memory search

## Tips & gotchas

- **Timestamps preserved.** Your assistant understands the chronological context of imported conversations.
- **Safe to re-import.** Deduplication means you can re-import without creating duplicates.
- **Memory indexing.** After import, facts and preferences from your ChatGPT history become searchable via the memory system.
- **Selective import.** Only user and assistant messages are imported — system prompts and metadata are skipped.
