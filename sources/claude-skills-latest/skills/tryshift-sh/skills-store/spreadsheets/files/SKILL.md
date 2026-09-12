---
name: spreadsheets
description: |
  Create spreadsheets, read or update ranges, and share Google Sheets files created through Shift.
metadata:
  author: shift
  version: "1.0"
---

# Google Sheets Spreadsheets

Use this skill to create a spreadsheet, inspect its structure, read a range, append rows, update cell values, or share a spreadsheet created through Shift.

## When to use

- create a new spreadsheet
- inspect sheet names and spreadsheet metadata for a spreadsheet created through Shift
- read values from a range
- append rows to a range
- update a fixed range with new values
- share a spreadsheet with another person

## Authentication

This skill uses the connected `google-sheets` provider credential for the current agent. It is intended for spreadsheets created through Shift.

## Invocation

Call through Shift's Skill Router:

```bash
curl -X POST "$SHIFT_LOCAL_GATEWAY/skill-router/invoke" \
  -H "Content-Type: application/json" \
  -d '{
    "skillProvider": "google-sheets",
    "skill": "spreadsheets",
    "action": "read-range",
    "input": {
      "spreadsheetId": "SPREADSHEET_ID",
      "range": "Sheet1!A1:C10"
    }
  }'
```

## Examples

Create a spreadsheet:

```json
{
  "skillProvider": "google-sheets",
  "skill": "spreadsheets",
  "action": "create",
  "input": {
    "title": "Launch Tracker"
  }
}
```

Get spreadsheet metadata:

```json
{
  "skillProvider": "google-sheets",
  "skill": "spreadsheets",
  "action": "get",
  "input": {
    "spreadsheetId": "SPREADSHEET_ID"
  }
}
```

Read a range:

```json
{
  "skillProvider": "google-sheets",
  "skill": "spreadsheets",
  "action": "read-range",
  "input": {
    "spreadsheetId": "SPREADSHEET_ID",
    "range": "Sheet1!A1:C10"
  }
}
```

Append values:

```json
{
  "skillProvider": "google-sheets",
  "skill": "spreadsheets",
  "action": "append-values",
  "input": {
    "spreadsheetId": "SPREADSHEET_ID",
    "range": "Sheet1!A:C",
    "values": [["2026-03-13", "Launch", "On track"]],
    "valueInputOption": "USER_ENTERED"
  }
}
```

Update a range:

```json
{
  "skillProvider": "google-sheets",
  "skill": "spreadsheets",
  "action": "update-values",
  "input": {
    "spreadsheetId": "SPREADSHEET_ID",
    "range": "Sheet1!B2:C3",
    "values": [["Owner", "Status"], ["Wei", "Ready"]],
    "valueInputOption": "USER_ENTERED"
  }
}
```

Share a spreadsheet:

```json
{
  "skillProvider": "google-sheets",
  "skill": "spreadsheets",
  "action": "share",
  "input": {
    "spreadsheetId": "SPREADSHEET_ID",
    "type": "user",
    "role": "writer",
    "emailAddress": "collab@example.com"
  }
}
```
