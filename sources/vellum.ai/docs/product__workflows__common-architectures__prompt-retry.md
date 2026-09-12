> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Prompt Retry Logic

> Implement error handling with automatic retries for non-deterministic failures

Prompt nodes support two selectable outputs - one from the model in case of a valid output and one in case of a non deterministic error. Model hosts fail for all sorts of reasons that include timeouts, rate limits, or server overload. You could make your production-grade LLM features resilient to these features by adding retry logic into your Workflows!

## Implementation Steps

### Add a standard Prompt Node

### Add a Conditional Node (`Error Check`)

This node will read from the new Error output from the Prompt Node and check to see if it's *not null*.

### Define another Conditional Node (`Count Check`)

This node will read from the Prompt Node's Execution Counter, and check if it's been invoked more than your desired limit (`3`).

### Loop back to the Prompt Node

Loop back to the Prompt Node if it's under the limit, or exit with some error message if it's over the limit. In the case that the error is null, exit with the Prompt Node's response.