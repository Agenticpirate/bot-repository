> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Merge Node

> Wait for one or multiple branches to complete before continuing.

Merge Nodes are used when the goal is to bring back the execution of divergent paths into one path. You can configure the number of inputs to a Merge Node and choose between "Await All" or "Await Any" as your merge strategy. The merge strategy determines the logic that will continue workflow execution.

![Merge Node](https://storage.googleapis.com/vellum-public/help-docs/merge_node.png)