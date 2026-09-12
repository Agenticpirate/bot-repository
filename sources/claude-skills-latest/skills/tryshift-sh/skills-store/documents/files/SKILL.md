---
name: documents
description: |
  Create, read, update, and share Google Docs documents created through Shift.
metadata:
  author: shift
  version: "1.0"
---

# Google Docs Documents

Use this skill to create a Google Doc, inspect a document created through Shift, append text, replace text, or share a document.

## When to use

- create a new Google Doc
- list recent Google Docs documents created through Shift
- read document structure and metadata
- append text to the end of a document
- replace matching text across a document
- share a document with another person

## Authentication

This skill uses the connected `google-docs` provider credential for the current agent. It is intended for documents created through Shift.

## Invocation

Call through Shift's Skill Router:

```bash
curl -X POST "$SHIFT_LOCAL_GATEWAY/skill-router/invoke" \
  -H "Content-Type: application/json" \
  -d '{
    "skillProvider": "google-docs",
    "skill": "documents",
    "action": "create",
    "input": {
      "title": "Launch Notes"
    }
  }'
```

## Examples

Create a document:

```json
{
  "skillProvider": "google-docs",
  "skill": "documents",
  "action": "create",
  "input": {
    "title": "Launch Notes"
  }
}
```

Get a document:

```json
{
  "skillProvider": "google-docs",
  "skill": "documents",
  "action": "get",
  "input": {
    "documentId": "DOCUMENT_ID"
  }
}
```

List documents:

```json
{
  "skillProvider": "google-docs",
  "skill": "documents",
  "action": "list",
  "input": {
    "pageSize": 10
  }
}
```

Append text:

```json
{
  "skillProvider": "google-docs",
  "skill": "documents",
  "action": "append-text",
  "input": {
    "documentId": "DOCUMENT_ID",
    "text": "\n\nWeekly update:\n- Product launch on track\n- Need final review by Friday"
  }
}
```

Replace text:

```json
{
  "skillProvider": "google-docs",
  "skill": "documents",
  "action": "replace-text",
  "input": {
    "documentId": "DOCUMENT_ID",
    "containsText": "{{status}}",
    "replaceText": "On track",
    "matchCase": true
  }
}
```

Share a document:

```json
{
  "skillProvider": "google-docs",
  "skill": "documents",
  "action": "share",
  "input": {
    "documentId": "DOCUMENT_ID",
    "type": "user",
    "role": "writer",
    "emailAddress": "collab@example.com"
  }
}
```
