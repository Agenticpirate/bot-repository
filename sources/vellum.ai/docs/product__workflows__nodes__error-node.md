> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Error Node

> Stop workflow execution and raise an error.

The Error Node enables you to reject the full workflow, terminating execution with an error event wherever you define it in your execution flow. There are two types of errors you could raise with this node:

* Pass-through - Use an `Error` output from an upstream node and pass it through to this node.
* Custom - Define your own `String` output that this node will use as an error message

![Error Node](https://storage.googleapis.com/vellum-public/help-docs/error-node.png)