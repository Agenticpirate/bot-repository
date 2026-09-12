> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Observability in Production

> Learn how Vellum's observability tools help track AI model performance, analyze costs, and improve accuracy with execution tracking and user feedback integration.

Vellum provides comprehensive observability tools that automatically track every execution of your Prompts and Workflows in production, giving you the insights needed to debug issues, optimize performance, and enhance your AI applications over time.

## Execution Tracking

After deploying Prompts and Workflows to production, Vellum automatically captures detailed information about every execution. This data is accessible through dedicated Executions tables that provide powerful filtering, sorting, and analysis capabilities. For information about how long this data is stored, see our [Data Retention Policies](/product/organizations/data-retention-policies).

**Environment Filtering**: Execution and monitoring data are filtered to show only requests made within the active Environment context. Use the Environment picker at the top of the page to switch between different Environment data views.

#### Prompt Executions

You can access the "Executions" tab of any Prompt Deployment to see all requests that were made. The executions table provides a detailed view with customizable columns that can be hidden, shown, filtered, and sorted.

![Prompt Executions Table](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/81cad7e0-2791-4753-8317-b95a03db56ee-prompt_executions_table.png)

As you apply filters and sorting, the page's URL is updated. You can bookmark this link or share it with team members to return to the same view later.

### Detailed Execution Information

Click into any execution to see comprehensive information about that specific request, including:

* Input values and variables
* Complete output
* Model parameters used
* Execution time and cost
* Raw request and response data

![Prompt Execution Details](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/81cad7e0-2791-4753-8317-b95a03db56ee-prompt_execution_details.png)

#### Workflow Executions

Workflow Deployments provide similar observability features with additional capabilities for monitoring complex, multi-step processes.

![Workflow Executions Table](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/81cad7e0-2791-4753-8317-b95a03db56ee-workflow_executions_table.png)

The Workflow Executions table aggregates costs and overall latency for all nodes in your workflow, including Subworkflows and parallel operations. You can sort by cost or latency to identify and optimize your worst-performing scenarios.

### Workflow Execution Analysis Views

When you click into a workflow execution, you can access two powerful visualization tools:

#### Trace View

The Trace View provides a timeline visualization that helps you quickly identify the slowest or most expensive steps within your Workflow. Each node execution is displayed as a horizontal bar on the timeline.

This view is particularly useful for:

* Identifying which steps take the longest
* Analyzing execution sequence and dependencies
* Comparing relative costs between different nodes

![Workflow Execution Trace View](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/81cad7e0-2791-4753-8317-b95a03db56ee-workflow_execution_trace_view.png)

#### Graph View

The Graph View displays your workflow as an interactive diagram, showing the exact path of execution through your nodes. This visualization helps you:

* Retrace execution steps through complex workflows
* Identify exactly where your Workflow might be deviating from expected behavior
* Understand which conditional branches were taken
* Inspect the inputs and outputs at each node

![Workflow Execution Graph View](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/81cad7e0-2791-4753-8317-b95a03db56ee-workflow_execution_graph_view.png)

### Workflow Execution Replay & Scrubbing

Vellum provides a powerful replay scrubber feature that allows you to step through the execution of your workflow over time. This is especially valuable for:

* Building and debugging Agent workflows that exhibit multiple loops while calling tools, reacting to results, and calling subsequent tools
* Understanding the exact sequence and timing of node executions
* Visualizing how data flows through your workflow in real-time
* Identifying optimization opportunities in complex, multi-step processes

The scrubber lets you pause, rewind, and fast-forward through the execution timeline, giving you complete visibility into how your workflow behaves at each step.

## Saving and Reusing Executions

From any execution details page (for both Prompts and Workflows), you can:

#### Save as Scenario

Preserve the execution inputs to continue experimenting with them in a sandbox environment. This is useful for debugging issues or testing improvements to your prompts or workflows.

#### Save to Test Suite

Add the execution to a test suite to prevent regressions on similar cases in the future. This helps ensure that your AI system continues to handle this specific case correctly as you make changes.

## Capturing End-User Feedback with Actuals

Vellum's "Actuals" API allows you to capture what the output *should have been* for a given request and record its quality score. This feedback mechanism is essential for:

* Monitoring production quality over time
* Building datasets for prompt optimization
* Creating training data for fine-tuning custom models
* Identifying patterns in user satisfaction

For detailed implementation guidance, see our [Client API documentation for Prompts](/developers/client-sdk/prompts/submit-completion-actuals) and [Client API documentation for Workflows](/developers/client-sdk/workflows/submit-workflow-execution-actuals).

Capturing Actuals works best when your end users have some mechanism (usually via a UI) to provide feedback on the output of the model. Additionally, subject matter experts can review user-reported actuals or self-report their own actuals directly through the Vellum UI.

### Implementation Example

For example, if you're creating an AI Recruiting Email Generator for recruiters where they can use AI to generate rough drafts, you might:

1. Infer that if they hit "Send" without making edits, the quality was great (a 1.0 in Vellum)
2. Infer that if they hit "Discard" then the quality was bad (a 0.0 in Vellum)
3. Or you might have a 5-star "Rating" system that they can use to explicitly provide feedback on the quality of the output.

In all cases, you could integrate with Vellum's Actuals API to capture this feedback. You can find a code snippet for this in a Prompt or Workflow Deployment's "Overview" tab:

![Deployment Actuals](https://storage.googleapis.com/vellum-public/help-docs/prompt_deployment_actuals.png)

You can reference an Execution made previously by either:

* The ID that Vellum generates and returns in the API response
* A UUID that you track and provide via the "external\_id" property

## Online Evaluations

For continuous quality assessment of your deployed AI applications, Vellum offers Online Evaluations. This feature automatically applies configured metrics to every execution, allowing you to:

* Monitor performance in real-time
* Detect regressions as they happen
* Gather insights for improvements
* Compare performance across different releases

For more details on setting up and using Online Evaluations, see the dedicated [Online Evaluations](/product/evaluation/online-evaluations) documentation.