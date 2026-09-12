> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Track Workflow Execution Costs

> Learn how to monitor and analyze the cost of your Workflow Executions in Vellum to optimize your LLM usage.

## Understanding Workflow Execution Costs

Vellum provides detailed cost tracking for your Workflow Executions, allowing you to monitor and optimize your LLM usage expenses. This feature aggregates costs across all Nodes within a Workflow Execution, including nested Subworkflows and parallel operations, giving you a holistic view of your total execution costs.

## Viewing Cost Breakdown in Execution Details

When you view the details of a Workflow Execution, you'll see the aggregated cost displayed prominently at the top of the Execution Details page. This cost represents the total expense for all LLM operations performed during the Workflow Execution.

![Workflow Execution Cost Breakdown](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/901b6c8c-83ea-4012-a7cf-0791038921ed-workflow_execution_cost_breakdown.png)

The cost is calculated by summing the expenses from all LLM invocations within your Execution, including:

* Prompt Node Executions
* Subworkflow Node Executions
* Map Node iterations
* Any other nodes that involve LLM API calls

## Cost Column in Workflow Deployment Executions

You can also view costs at a glance in the Workflow Deployment Executions table. The cost column can be toggled on or off through the "columns" menu in the table header.

![Cost Column in Executions Table](https://storage.googleapis.com/vellum-public/help-docs/changelogs/2025-03/cost_column.png)

This allows you to quickly identify which Workflow Executions are more expensive than others, helping you prioritize optimization efforts.

## Sandbox Cost Tracking

In addition to tracking costs in deployed workflows, Vellum also provides cost tracking capabilities in the Workflow Sandbox environment. This allows you to monitor and optimize costs during the development phase.

### Subworkflow Cost Tracking

The Workflow Sandbox now displays the aggregate sum of total costs for your Subworkflow Nodes. This feature helps you understand the cost implications of your workflow design decisions before deployment.

![Sandbox Workflow Cost](https://storage.googleapis.com/vellum-public/help-docs/changelogs/2024-04/sandbox-workflow-costs.png)

After running your Workflow in the Sandbox, you can see the estimated cost of individual nodes, giving you valuable insights for optimization. This is particularly useful for:

* Identifying which subworkflows contribute most to your overall costs
* Testing different implementation approaches to find the most cost-effective solution
* Estimating production costs during the development phase
* Making informed decisions about where to apply cost-saving measures like node mocking

## Using Cost Data for Optimization

With the cost breakdown information, you can:

1. **Identify expensive nodes**: Determine which parts of your Workflow contribute most to the overall cost
2. **Compare execution costs**: Analyze how different input scenarios affect your total Execution expenses
3. **Budget planning**: Forecast expenses based on expected Workflow usage
4. **Optimization targeting**: Focus your optimization efforts on the most cost-intensive components

## Cost Tracking Limitations

Please note the following limitations of the cost tracking feature:

* Costs are calculated based on the pricing information provided by the LLM providers at the time of execution
* Non-LLM operations (like API calls to external services) are not included in the cost calculations
* Cost calculations do not currently account for cached tokens used by the LLM provider

## Best Practices for Cost Management

To effectively manage your Workflow Execution costs:

* Use node mocking during development to avoid unnecessary LLM calls
* Consider using smaller, more cost-effective models for initial processing steps
* Implement caching strategies where appropriate
* Regularly review your Workflow Execution costs to identify optimization opportunities
* Test different prompt strategies to find more token-efficient approaches

By leveraging Vellum's cost tracking features, you can make informed decisions about your LLM usage and ensure you're getting the most value from your AI investments.