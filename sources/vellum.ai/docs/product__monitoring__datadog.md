> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Datadog Integration

> Monitor your Vellum deployments through Datadog integration.

Vellum supports real-time monitoring of platform events through Datadog integration. This allows organizations to leverage Datadog's powerful monitoring, alerting, and business intelligence capabilities with their Vellum data.

## Configuration

To set up Datadog integration:

1. Navigate to your organization settings page in Vellum
2. Locate the Datadog integration section
3. Configure the integration with your desired event types

## Supported Events

The following events are available for monitoring in Datadog. For detailed event schemas, see the [Webhook documentation](/product/monitoring/webhooks#event-schema).

| Category               | Event                                                                                                              | Description                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| **Workflow Execution** | [`workflow.execution.initiated`](/product/monitoring/webhooks#workflow-execution-initiated)                        | Triggered when a workflow starts execution               |
|                        | [`workflow.execution.fulfilled`](/product/monitoring/webhooks#workflow-execution-fulfilled)                        | Triggered when a workflow successfully completes         |
|                        | [`workflow.execution.rejected`](/product/monitoring/webhooks#workflow-execution-rejected)                          | Triggered when a workflow execution fails                |
| **Prompt Execution**   | [`prompt_execution.usage_calculation.fulfilled`](/product/monitoring/webhooks#workflow-usage-calculation-events)   | Triggered when prompt usage is successfully calculated   |
|                        | [`prompt_execution.usage_calculation.rejected`](/product/monitoring/webhooks#workflow-usage-calculation-events)    | Triggered when prompt usage calculation fails            |
| **Workflow Execution** | [`workflow_execution.usage_calculation.fulfilled`](/product/monitoring/webhooks#workflow-usage-calculation-events) | Triggered when workflow usage is successfully calculated |
|                        | [`workflow_execution.usage_calculation.rejected`](/product/monitoring/webhooks#workflow-usage-calculation-events)  | Triggered when workflow usage calculation fails          |

## Use Cases

The Datadog integration enables several key monitoring and analytics capabilities:

1. **Real-time Monitoring**: Track workflow and node executions as they happen
2. **Performance Analytics**: Analyze execution times and success rates
3. **Error Detection**: Get immediate alerts when executions fail
4. **Usage Tracking**: Monitor resource consumption and costs
5. **Business Intelligence**: Create custom dashboards and reports using your Vellum data

## Best Practices

When setting up your Datadog integration:

1. Start with critical events first (e.g., execution failures)
2. Set up appropriate alerting thresholds
3. Create dashboards for commonly monitored metrics
4. Use tags effectively to segment and analyze your data