> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Execution URLs

> Learn how to directly access Prompt and Workflow Execution Details using Execution IDs for easier debugging and cross-referencing.

## Accessing Workflow Execution Details Directly

Vellum provides a convenient way to directly access Prompt and Workflow Execution Details using just the Execution ID. This feature makes it easier to cross-link to specific Vellum executions from your internal tools, issue trackers, or monitoring systems for debugging purposes.

## URL Format

The format for accessing Prompt or Workflow Execution Details is:

```
https://app.vellum.ai/workflows/executions/<execution-id>
```

Simply replace `<execution-id>` with the actual Execution ID of the Workflow you want to view.

## Use Cases

Direct execution URLs are particularly useful for:

1. **Debugging**: Include links to specific executions in error reports or issue tickets
2. **Cross-referencing**: Reference Vellum executions from external monitoring systems
3. **Documentation**: Link to example executions in your internal documentation
4. **Team collaboration**: Share specific execution details with team members
5. **Monitoring integration**: Include direct links in alerts or notifications

## Obtaining Execution IDs

You can obtain workflow Execution IDs from:

* The Executions tab in your Prompt or Workflow Deployment
* The Vellum API response when executing a Prompt or Workflow
* Webhook payloads (if configured)
* Datadog events (if integrated)

## Example Integration

Here's an example of how you might include a direct execution URL in an error logging system:

```javascript
// Example error logging with direct execution link
function logExecutionError(executionId, errorDetails) {
  const executionUrl = `app.vellum.ai/workflows/executions/${executionId}`;
  logger.error(`Workflow execution failed. Details: ${errorDetails}. View in Vellum: ${executionUrl}`);
}
```

This direct linking capability makes it easy to reference specific executions in your internal systems without needing to navigate through the Vellum UI, streamlining your debugging and monitoring workflows.