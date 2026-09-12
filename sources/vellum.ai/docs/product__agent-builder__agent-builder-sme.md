> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Using the Agent Builder

> A practical guide to help you get good results with Vellum's Agent Builder

A practical guide to help you get good results with Vellum's Agent Builder. This pulls together tips from power users and our team.

## Who this is for

If you're starting a new Workflow with Agent Builder, this guide is for you. Use it as a checklist and a set of example prompts to get the best results.

## Getting started with Agent Builder

There are two reliable ways to begin, depending on your use case.

### Path 1: Start with an outcome

This approach works best for simpler Workflows. Tell Agent Builder the outcome you want, then ask for a short plan for how to get there. Iterate on the plan with small changes until it looks right, then ask Agent Builder to execute the plan step by step.

### Path 2: Start with your own plan

This approach is better for complex Workflows. Write a plan elsewhere first—make it clear and specific, but not overloaded with detail. Then tell Agent Builder to build the Workflow step by step, feeding it the next instruction for each step.

## How to write effective instructions

Good inputs lead to good builds. Start by stating your goal in one sentence. If you know the order of operations, include it—for example: do A first, then B, then output C.

Define the output clearly. Who is it for? What format? How long? Include a short example if you can. When you're unsure about the impact of a change, ask Agent Builder to give a short scope summary before it edits anything.

When you run into terms or settings you don't know, ask Agent Builder questions. Ask about build options, why something isn't working, and what would make the Workflow more useful.

### Here's an example

**Avoid:** get information about the business and make a report.

**Prefer:** fetch X data, write a report for Y audience, length Z, and match the tone in this short example R.

## Build and test in small steps

Turn the "Edit Workflow" toggle to off to review the plan first. This lets you check the approach before Agent Builder changes anything. Build piece by piece—ship a simple version, then add features.

When a Node errors, use the Fix button. If the first fix fails twice in a row, stop and switch to troubleshooting. Ask questions when you're stuck to clarify what the Workflow is doing and what options you have. Keep it simple and aim for an MVP you can test in Vellum Apps and improve with real usage.

## Troubleshooting errors

If you hit consecutive failures, here's what to do:

First, stop the error loop—don't keep accepting fixes after the second failed attempt. Revert to the last working state using history to roll back.

Next, try to analyze the existing Workflow. Ask Agent Builder to explain the current configuration in detail, point out likely root causes, and propose what to change and why. Only resume building once the cause is clear.

### Diagnostic prompt

Here's a prompt you can use to diagnose issues:

```
Explain the current Workflow. List inputs, tools, and Node order.
Describe the error and top two likely causes.
Propose the smallest safe change to fix it, and the test I should run after the change.
```

## Known limitations

Agent Builder doesn't perform web search. Agent Builder also can't read document inputs that live *only* inside an existing Workflow unless you pass them in again or index them.