> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Prompt Chaining

> Build a basic Prompt Chain that connects multiple prompts to create a more powerful workflow.

Concepts: Dynamic Prompting, Content Generation, Connecting Inputs and Outputs

This example demonstrates how to create a content generator that adapts its output based on the specified audience and industry. The Workflow brainstorms topics for the intended audience, picks the best one, creates an outline for it, and then writes a full draft of the article based on the outline.

## Input Parameters

| Parameter  | Type   | Description                                                                                  |
| ---------- | ------ | -------------------------------------------------------------------------------------------- |
| `audience` | STRING | Target audience for the content (e.g., "Working professionals targeting midsize businesses") |
| `industry` | STRING | Industry vertical for content specialization (e.g., "Marketing Technology")                  |

## Use Cases

* **Marketing Content**: Generate industry-specific blog posts, white papers, or landing page copy
* **Sales Materials**: Create targeted sales collateral for different market segments
* **Product Documentation**: Produce user guides tailored to specific user personas
* **Email Campaigns**: Draft email sequences adapted to different audience segments