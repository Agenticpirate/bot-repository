---
name: tasks
description: |
  List, create, update, and complete Todoist tasks through Shift's Skill Router.
metadata:
  author: shift
  version: "1.0"
---

# Todoist Tasks

Use this skill to list tasks, inspect a task, create tasks, update task details, close completed work, reopen tasks, and query Todoist with natural filters.

## When to use

- list current tasks
- inspect a specific task
- create a new task with due dates, labels, or priority
- update task content or scheduling
- close completed work
- reopen a completed task
- fetch tasks matching a Todoist filter query

## Authentication

This skill uses the connected `todoist` provider credential for the current agent.

## Invocation

Call through Shift's Skill Router:

```bash
curl -X POST "$SHIFT_LOCAL_GATEWAY/skill-router/invoke" \
  -H "Content-Type: application/json" \
  -d '{
    "skillProvider": "todoist",
    "skill": "tasks",
    "action": "create",
    "input": {
      "content": "Review launch checklist",
      "priority": 3
    }
  }'
```

## Examples

List tasks:

```json
{
  "skillProvider": "todoist",
  "skill": "tasks",
  "action": "list",
  "input": {
    "limit": 10
  }
}
```

Create a task:

```json
{
  "skillProvider": "todoist",
  "skill": "tasks",
  "action": "create",
  "input": {
    "content": "Prepare customer follow-up",
    "description": "Draft a concise summary and send it today.",
    "priority": 4,
    "dueString": "today 5pm"
  }
}
```

Update a task:

```json
{
  "skillProvider": "todoist",
  "skill": "tasks",
  "action": "update",
  "input": {
    "taskId": "TASK_ID",
    "content": "Prepare customer follow-up email",
    "priority": 3
  }
}
```

Close a task:

```json
{
  "skillProvider": "todoist",
  "skill": "tasks",
  "action": "close",
  "input": {
    "taskId": "TASK_ID"
  }
}
```

Filter tasks:

```json
{
  "skillProvider": "todoist",
  "skill": "tasks",
  "action": "get-by-filter",
  "input": {
    "query": "today & !@waiting"
  }
}
```
