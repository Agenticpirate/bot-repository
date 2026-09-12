> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Map Node

> Iterate over an array, executing a sub-workflow for each item.

Map Nodes allow you to easily run the same Subworkflow multiple times in a row or in parallel, with up to 96 concurrent executions.

Map Nodes take a ***JSON*** array as an input and run the same Subworkflow for each item in the array. The Subworkflow is provided with three input variables on each iteration: `item` (the value in the current iteration of the array), `items` (the entire array), and `index` (the position of the current iteration, as a number).
The output of every Subworkflow is then combined into a single value as the output of the Map Node, with the special Vellum type `ARRAY` (not JSON).

#### Tip: Map Node Inputs

**If you don't see your input as an option when setting the `items` input of the Map Node** — make sure that the Node you're using as an input has its output type as `JSON` and not `ARRAY`. `ARRAY` types are special Vellum types and won't be recognized as inputs to Map Nodes.