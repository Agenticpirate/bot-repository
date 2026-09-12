# Computer Use

## What it does

Controls a connected desktop directly. It observes the screen through accessibility APIs and screenshots, then clicks, types, and scrolls. Some actions depend on the desktop operating system.

## Setup required

None (built into the desktop app). The app will request the operating-system permissions it needs.

## Permissions

- Accessibility (mouse/keyboard control)
- Screen capture (seeing screen content)
- Each action is prompted individually for approval

## Common prompts

| You say...                                    | What happens                  |
| --------------------------------------------- | ----------------------------- |
| “Open my browser and go to my bank's website” | Opens app and navigates       |
| “Click the Submit button”                     | Clicks a specific UI element  |
| “Fill out this form with my info”             | Types into form fields        |
| “Take a screenshot of what's on screen”       | Captures current screen state |
| “Switch to Slack and check my DMs”            | Navigates between apps        |
| “Scroll down to the pricing section”          | Scrolls within an app         |

## Configuration

- No configuration needed
- Step limit of 50 actions per session
- Each action requires approval unless you create trust rules via the Allow button

## Tips & gotchas

- **Accessibility tree + screenshots.** The assistant reads the accessibility tree (same API screen readers use) AND takes screenshots for a complete picture.
- **Element-based clicking.** It prefers clicking by element name rather than coordinates for reliability.
- **Session caps.** Sessions are capped at 50 steps with loop detection.
- **Platform differences.** Dragging, opening apps by name, and AppleScript are available on macOS. Windows exposes only actions its desktop helper supports, so unsupported tools are not offered to the assistant.
- **Single-window observations on macOS.** The observe tool accepts` capture_window_id`, a current native CGWindowID, not a browser tab or accessibility element ID. It captures only that window and its accessibility tree, even behind another app, without secondary windows or a desktop fallback. A compatible desktop app must explicitly advertise window-capture support; older or unsupported clients are rejected before capture.
- **Observation-only scope.** Window selection applies to one observe call, not the whole session: later click, type, and scroll actions still return normal desktop observations. Selection does not focus the window or restrict later input to it. Cropped screenshot coordinates are window-relative, not full-display coordinates; prefer accessibility element IDs and focus the intended window before acting.
- **Screen visibility.** Be mindful of what's visible on screen. Screenshots are sent to the AI model.
