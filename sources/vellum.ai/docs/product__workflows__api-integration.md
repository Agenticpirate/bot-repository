> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Easy Integration with Vellum's API for Workflows

> Learn how to integrate and monitor your Workflow with Vellum's API, making production deployment quick and easy.

Once you have your Workflow built in Vellum’s UI, we provide an easy way to use it in production. Vellum handles the execution of the Workflow — all you need to provide are the input variables to call the Workflow. Vellum abstracts away the need to store the prompts, semantic search & the business logic tying together these prompts in your code base. Using Workflows in production becomes a matter of minutes, not days.

This help center article covers how to make the integration, and the monitoring options you have once in production.

## Workflow Code Snippet Integration

Once you Deploy the Workflow from the UI, you’re taken to a code snippet which you need to use to call this Workflow in production. The adjacent screenshot shows the Workflow Deployment’s name & its input variables

![Workflow Details](https://storage.googleapis.com/vellum-public/help-docs/workflow_details.png)

![Workflow API Code Snippet](https://storage.googleapis.com/vellum-public/help-docs/workflows_api_code_snippet.png)

## Workflow Executions

Once you start making requests to the Workflow, all the executions are stored in the Executions tab for monitoring purposes. Any time you find an edge case in production, you can save that specific Execution back as a Scenario for future testing. This is typically used to build out your test bank and debugging unexpected behavior. By running this Scenario in the UI you can see what the responses were at each step and tweak the Workflow logic (prompts, semantic search, business logic tying together the prompts)

![Workflow Execution Observability](https://storage.googleapis.com/vellum-public/help-docs/workflow_executions.png)

## Accessing Workflow Execution Details Directly

You can directly access a specific workflow execution details page using just the execution ID. This is particularly useful when you want to cross-link to Vellum executions from your internal tools for debugging purposes.

The URL format is:

```
app.vellum.ai/workflows/executions/<execution-id>
```

This direct linking capability makes it easy to reference specific executions in your internal documentation, issue trackers, or monitoring systems without needing to navigate through the Vellum UI.

## Workflow Executions Details

Clicking the View Details button on the Execution brings you to a UI where you can see the inputs, outputs and latency at each step of the Workflow when it was run in production.

### Cost Tracking

The Execution Details page also displays the aggregated cost for the entire Workflow Execution, giving you visibility into the total expense of running your Workflow. This cost breakdown includes all LLM operations performed during the execution, including those in nested Subworkflows and parallel operations.

![Workflow Execution Cost Breakdown](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/901b6c8c-83ea-4012-a7cf-0791038921ed-workflow_execution_cost_breakdown.png)

This cost tracking feature helps you monitor and optimize your LLM usage expenses. For more information on cost tracking and optimization strategies, see our [Workflow Execution Cost Tracking](/product/monitoring/execution-cost-tracking) documentation.