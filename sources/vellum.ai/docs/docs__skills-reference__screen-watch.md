# Screen Watch

## What it does

Observes your screen at regular intervals using OCR, letting your assistant provide context-aware commentary on what you're working on.

## Setup required

None. Requires Screen Recording permission.

## Permissions

- Screen Recording (to capture screen content)

## Common prompts

| You say...                                                   | What happens                       |
| ------------------------------------------------------------ | ---------------------------------- |
| “Watch what I'm doing for the next 5 minutes”                | Starts periodic screen observation |
| “Keep an eye on my screen and help me with this spreadsheet” | Monitors with focus area           |
| “Watch my screen and let me know if I make any mistakes”     | Active monitoring with feedback    |

## Configuration

- Configurable interval (5–30 seconds between captures)
- Duration (1–15 minutes)
- Optional focus area for targeted observation

## Tips & gotchas

- **Not always-on.** This is not always-on background monitoring — it's explicitly triggered and time-bounded.
- **OCR-based.** OCR captures text content, not pixel-perfect screenshots.
- **Best for second-pair-of-eyes tasks.** Reviewing documents, filling out forms, or learning a new tool.
- **Different from Computer Use.** Screen Watch observes, Computer Use acts.
