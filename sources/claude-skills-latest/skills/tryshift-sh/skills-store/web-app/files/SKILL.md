---
name: web-app
description: |
  Create or update a live web app in E2B and return a shareable preview URL through Shift's Skill Router.
metadata:
  author: shift
  version: "1.0"
---

# E2B Web App

Use this managed skill when the user is asking for a webpage, landing page, dashboard, interactive demo, or another output that is best experienced as a live browser preview instead of plain text.

This skill uses Shift's local Skill Router. Do not ask the user for E2B credentials.

## When to use it

Use this skill when the deliverable should be:

- a small shareable landing page
- a lightweight interactive UI demo
- a dashboard or microsite
- a web artifact the user should click and view in a browser

Do not use this skill for:

- plain summaries or static markdown outputs
- files that are better returned through Shift Files
- tasks that do not need a live browser preview

## App model

- v1 keeps one active live app per agent
- calling the tool again updates the same app instead of creating a new one
- the app should stay simple and self-contained
- prefer static HTML/CSS/JS with no build step

## Invocation

Send a `POST` request to:

```text
${SHIFT_LOCAL_GATEWAY}/skill-router/invoke
```

Request body:

```json
{
  "skillProvider": "e2b",
  "skill": "web-app",
  "action": "publish",
  "input": {
    "files": [
      {
        "path": "index.html",
        "content": "<!doctype html><html><body><h1>Hello</h1></body></html>"
      },
      {
        "path": "styles.css",
        "content": "body { font-family: sans-serif; }"
      }
    ],
    "deletePaths": ["old-script.js"]
  }
}
```

### Input

- `files`: required array of files to write into the live app
- `path`: required relative path such as `index.html`, `styles.css`, or `app.js`
- `content`: required file contents
- `deletePaths`: optional list of relative paths to remove from the existing app

### Output

The tool returns:

- `previewUrl`
- `sandboxId`
- `status`
- `created`
- `resumed`
- `updatedPaths`
- `deletedPaths`

## Agent behavior

1. Prefer a small self-contained app. Avoid frameworks or package installs in v1.
2. Use `index.html` as the entry point and keep supporting files minimal.
3. When the user asks for edits to an existing live app, send only the changed files and any `deletePaths` needed.
4. After the tool succeeds, reply with the live URL and a short explanation of what is ready to view.
5. If the task is better as a file or plain answer, do not invoke this skill.
