> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Easily integrate with Velum’s Search API

> Learn to integrate search results in your queries with our easy 3-step process, including API calls and formatting tips.

Once in production, there’s a 3 step process to add search results in your queries at run-time:

1. Call Search API to obtain relevant context (details below)
2. Format the returned context and include as a single variable value when making requests to a Vellum Deployment
3. Pass search results to request endpoint while calling the LLM

For Step 3, make sure you have a variable in your prompt template where search results will be inserted. This variable will be populated with the context retrieved from your Search API call.

**Environment Context**: Documents uploaded to a Document Index are Environment-scoped. Search results will only include documents that were uploaded within the same Environment context as your API key. This ensures proper isolation between your different environments.

## Search API

There’s a code snippet for the Search API in the Document Index. There are 3 variables to call the API:

* **index\_name** - Index that is searched across
* **query** - Search query (usually a user input)
* **options** - Optional configuration that drives search behavior. Namely used to
  determine the max number of results returned in the response. You can also use:
* **weights** - to change the prioritization between keyword matches vs semantic similarity
* **result\_merging** - to automatically merge overlapping chunks into larger chunks without redundant content
* **filters** - to perform rule-based filtering prior to matching on keywords / semantic similarity.
  For more info, see [Metadata Filtering](/product/documents/metadata-filtering)

![Search API Code Snippet](https://storage.googleapis.com/vellum-public/help-docs/search-api-code-snippet.png)