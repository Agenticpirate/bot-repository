# Tasks

## What it does

A two-layer task system with reusable templates and a prioritized work queue. Define recurring tasks once, then run them on demand.

## Setup required

None. Works immediately.

## Permissions

- No special permissions (tasks execute within existing tool permissions)

## Common prompts

| You say...                                         | What happens                     |
| -------------------------------------------------- | -------------------------------- |
| “Create a task template for weekly status reports” | Saves a reusable task definition |
| “Run my weekly report task”                        | Executes a saved template        |
| “What's in my task queue?”                         | Shows prioritized work items     |
| “Add 'review PR #42' to my queue as high priority” | Adds a work item                 |
| “Mark the deployment task as done”                 | Updates task status              |

## Configuration

- Priority tiers: high, medium, low
- Status tracking: queued, running, awaiting\_review, done
- Templates can specify required tools

## Tips & gotchas

- **Templates vs. work items.** Think of templates as “recipes” and work items as “orders.” Templates define what to do; the queue tracks what needs doing now.
- **Auto-loading tools.** Tasks can require specific tools — if a template needs browser access, the skill will load the browser skill automatically.
- **Great for repetitive workflows.** Good for repetitive workflows you want to hand off to your assistant.
