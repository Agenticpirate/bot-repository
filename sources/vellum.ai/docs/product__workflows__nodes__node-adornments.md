> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Node Adornments

> Learn how to use Node Adornments to add error handling and retry logic to individual nodes in your workflows.

## What are Node Adornments?

Node Adornments are a powerful feature that allows you to "wrap" individual nodes with additional functionality, such as error handling and retry logic. They act as nodes themselves, treating the node they wrap as a single-node subworkflow.

Node Adornments simplify what would otherwise be complex workflow structures, making your workflows more readable and maintainable.

![Node Adornments](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/c96366ea-6ab5-4593-b08e-01a9f64c1fd5-node_adornments.png)

## Types of Node Adornments

Vellum currently supports two types of Node Adornments:

### Retry Node Adornment

The Retry Node Adornment repeatedly invokes a node until it either succeeds or reaches the maximum number of attempts. This is particularly useful for nodes that interact with external services that might experience temporary failures or rate limits.

Key features:

* Configure the maximum number of retry attempts
* Set delay between retry attempts
* Automatically handle transient errors

### Try Node Adornment

The Try Node Adornment attempts to invoke a node and continues with an `Error` output if it fails. This allows your workflow to gracefully handle errors and continue execution along an alternative path.

Key features:

* Catch errors from the wrapped node
* Continue workflow execution even when errors occur
* Enable fallback logic for error scenarios

## How to Use Node Adornments

Node Adornments are accessible in the Node sidepanel after clicking on a node in your workflow:

1. Select the node you want to adorn in your workflow
2. Open the node's sidepanel
3. Navigate to the "Adornments" section
4. Choose the type of adornment you want to apply (Retry or Try)
5. Configure the adornment settings as needed

## Monitoring Node Adornments

When monitoring workflow executions, Node Adornment invocations appear as if the targeted node was invoked as a single-node subworkflow:

![Node Adornment Monitoring](https://storage.googleapis.com/vellum-public/help-docs/changelogs/2025-03/node-adornment-monitoring.png)

This provides clear visibility into how many times a node was retried or whether it encountered errors during execution.

## Common Use Cases

### API Resilience

Apply a Retry Node Adornment to API Nodes that call external services which might experience temporary outages or rate limiting.

### LLM Error Handling

Use a Retry Node Adornment with Prompt Nodes to automatically retry when encountering non-deterministic LLM errors like timeouts or rate limits.

### Graceful Degradation

Apply a Try Node Adornment to provide fallback behavior when a node fails, such as using a cached response or a simpler alternative.

## Best Practices

* **Be selective**: Don't add adornments to every node. Focus on nodes that interact with external systems or have a higher likelihood of failure.
* **Set reasonable retry limits**: For Retry Node Adornments, choose a maximum retry count that makes sense for your use case to avoid excessive retries.
* **Plan for failures**: When using Try Node Adornments, always design a meaningful fallback path for error scenarios.
* **Monitor adornment behavior**: Regularly review workflow executions to identify nodes that frequently trigger adornments, as these might indicate underlying issues that need addressing.