# App Builder

## What it does

Creates fully interactive web applications from natural language descriptions. Dashboards, calculators, trackers, games, tools, landing pages, and anything else you can describe.

## Setup required

None. Works immediately.

## Permissions

- No macOS permissions needed (apps run in the sandbox)
- Host permissions needed only if the app needs to read/write files on your machine

## Common prompts

| You say...                                   | What happens                                               |
| -------------------------------------------- | ---------------------------------------------------------- |
| “Build me a habit tracker”                   | Creates an interactive app with daily tracking and streaks |
| “Make a pomodoro timer”                      | Builds a countdown timer with work/break intervals         |
| “Create a budget dashboard”                  | Builds an app with categories, charts, and totals          |
| “Build a quiz about world capitals”          | Creates an interactive quiz game                           |
| “Make a portfolio site for my photography”   | Builds a presentational website                            |
| “Create a mood tracker with a calendar view” | Builds a visual tracker with date-based input              |
| “Build me a kanban board”                    | Creates a drag-and-drop task board                         |

## What it builds

Apps are built as multi-file TypeScript (Preact) projects compiled to HTML, CSS, and JavaScript. They:

- Open in their own panel in the desktop app
- Are fully interactive (buttons, inputs, animations, state)
- Persist so you can come back to them
- Follow a design system with consistent styling
- Can be iterated on after creation

## Iterating on apps

First version not quite right? Just say so:

> “Add a dark mode toggle.”

> “Make the charts bigger.”

> “Change the color scheme to blues and purples.”

> “Add an export-to-CSV button.”

Your assistant makes targeted edits to the existing app, then compiles once the batch is done so the open app refreshes. No need to start over.

## App types

| Type              | What it's for                              | Examples                                 |
| ----------------- | ------------------------------------------ | ---------------------------------------- |
| **App** (default) | Interactive tools with state and logic     | Calculators, dashboards, trackers, games |
| **Site**          | Presentational pages without complex state | Portfolios, landing pages, resumes       |

## Configuration

- No configuration needed
- Apps use the Vellum design system by default (semantic colors, spacing, components)
- You can specify aesthetics: “make it minimal,” “go bold and colorful,” “dark mode”

## Tips & gotchas

- **Be descriptive, not technical.** Say “build me a budget tracker with categories” not “create an HTML page with a JavaScript array and DOM manipulation.” Let your assistant handle the implementation.
- **Go big.** Your assistant can build surprisingly complex apps. Multi-page forms, real-time dashboards, animated games. Don't limit yourself.
- **Quality standards:** Apps include hover states, animations, proper typography, and responsive layouts by default. If something looks off, just ask for a fix.
- **Not for long-form writing.** If you want to write a blog post or article, use the document editor instead. App Builder is for interactive things.
- **Home Base** is a special app that serves as your dashboard. You can customize it: “Add a button to my dashboard for checking email.”
