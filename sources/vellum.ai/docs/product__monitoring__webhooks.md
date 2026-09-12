> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Webhook Integration

> Monitor your Vellum deployments through Webhook integration.

Vellum supports real-time monitoring of platform events through Webhook integration. This allows organizations to stream event data to external systems for monitoring, alerting, and custom integrations.

## Configuration

To set up Webhook integration:

1. Navigate to your organization settings page in Vellum
2. Scroll down to the "Monitoring Integration" section
3. Click on "Webhook Integration" or the "Edit" button if it's already configured
4. Configure the integration with your desired settings

![Webhook Integration Settings](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/4570d754-3a9f-4f2c-8286-cebd1e27f741-webhook-integration-settings.png)

## Authentication

Webhook integration supports two authentication methods to ensure your data is securely transmitted:

1. **API Key Header**: Send an API key in a custom header with each webhook request
2. **Bearer Token**: Use a bearer token for authentication

![Webhook Authentication Configuration](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/4570d754-3a9f-4f2c-8286-cebd1e27f741-webhook-authentication.png)

For additional security, you can also implement [HMAC Authentication](/product/security/hmac-authentication) to verify that webhook requests are genuinely from Vellum.

## Supported Events

You can configure which events are sent to your webhook endpoint. The following events are available:

![Webhook Event Configuration](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/4570d754-3a9f-4f2c-8286-cebd1e27f741-webhook-configure-events.png)

| Category                              | Event                                            | Description                                              |
| ------------------------------------- | ------------------------------------------------ | -------------------------------------------------------- |
| **Workflow Execution Events**         | `workflow.execution.initiated`                   | Triggered when a workflow starts execution               |
|                                       | `workflow.execution.fulfilled`                   | Triggered when a workflow successfully completes         |
|                                       | `workflow.execution.rejected`                    | Triggered when a workflow execution fails                |
| **Workflow Usage Calculation Events** | `workflow_execution.usage_calculation.fulfilled` | Triggered when workflow usage is successfully calculated |
|                                       | `workflow_execution.usage_calculation.rejected`  | Triggered when workflow usage calculation fails          |
| **Metric Execution Events**           | `metric.execution.fulfilled`                     | Triggered when a metric execution completes successfully |

## Event Schema

Webhook events follow a consistent schema that includes essential information about the event:

```json
{
    "id": "UUID",
    "timestamp": "ISO-8601 datetime",
    "api_version": "2024-10-25",
    "trace_id": "UUID",
    "span_id": "UUID",
    "parent": {
        // Parent context information
    },
    "name": "event.name.format",
    "body": {
        // Event-specific data
    }
}
```

### Workflow Execution Events

#### Workflow Execution Initiated

```json
{
    "id": "UUID",
    "timestamp": "ISO-8601 datetime",
    "api_version": "2024-10-25",
    "trace_id": "UUID",
    "span_id": "UUID",
    "parent": {
        // Parent context information
    },
    "name": "workflow.execution.initiated",
    "body": {
        "workflow_class": {
            "name": "string",
            "module": "string",
            "bases": []
        },
        "inputs": {
            // Input variables
        }
    }
}
```

#### Workflow Execution Fulfilled

```json
{
    "id": "UUID",
    "timestamp": "ISO-8601 datetime",
    "api_version": "2024-10-25",
    "trace_id": "UUID",
    "span_id": "UUID",
    "parent": {
        // Parent context information
    },
    "name": "workflow.execution.fulfilled",
    "body": {
        "workflow_class": {
            "name": "string",
            "module": "string",
            "bases": []
        },
        "outputs": {
            // Output variables
        }
    }
}
```

#### Workflow Execution Rejected

```json
{
    "id": "UUID",
    "timestamp": "ISO-8601 datetime",
    "api_version": "2024-10-25",
    "trace_id": "UUID",
    "span_id": "UUID",
    "parent": {
        // Parent context information
    },
    "name": "workflow.execution.rejected",
    "body": {
        "workflow_class": {
            "name": "string",
            "module": "string",
            "bases": []
        },
        "error": {
            "code": "ERROR_CODE",
            "message": "Error message"
        }
    }
}
```

### Workflow Usage Calculation Events

```json
{
    "id": "UUID",
    "timestamp": "ISO-8601 datetime",
    "api_version": "2024-10-25",
    "trace_id": "UUID",
    "span_id": "UUID",
    "parent": {
        // Parent context information
    },
    "name": "workflow.usage_calculation.fulfilled",
    "body": {
        "usage": {
             "input_token_count": 123,
             "output_token_count": 456,
             "input_char_count": 789,
             "output_char_count": 101,
             "cache_creation_input_tokens": 0,
             "cache_read_input_tokens": 0,
             "compute_nanos": 1000000000,
        },
        "cost": {
            "value": 0.0123,
            "currency": "USD",
        }
    }
}
```

### Parent Context

The `parent` field provides context about what triggered the event, which can include:

```json
{
    "span_id": "UUID",
    "parent": null,
    "deployment_id": "UUID",
    "deployment_name": "my-deployment",
    "deployment_history_item_id": "UUID",
    "workflow_version_id": "UUID",
    "release_tag_id": "UUID",
    "release_tag_name": "PRODUCTION",
    "external_id": "optional-external-id"
}
```

## Use Cases

The Webhook integration enables several key monitoring and integration capabilities:

1. **Real-time Monitoring**: Track workflow executions as they happen
2. **Custom Alerting**: Build custom alerting systems based on workflow failures or performance metrics
3. **Cost Tracking**: Monitor resource consumption and costs
4. **Integration with External Systems**: Connect Vellum events to your existing monitoring infrastructure
5. **Audit Logging**: Maintain a record of all executions for compliance and debugging
6. **Custom Analytics**: Build custom dashboards and reports using your Vellum data

## Best Practices

When setting up your Webhook integration:

1. **Start with Critical Events**: Begin by monitoring the most important events like execution failures
2. **Implement Proper Error Handling**: Ensure your webhook endpoint can handle occasional failures or retries
3. **Use HMAC Authentication**: For production systems, implement HMAC verification to ensure webhook authenticity
4. **Monitor Webhook Performance**: Ensure your webhook endpoint can handle the volume of events without introducing latency
5. **Implement Idempotency**: Design your webhook handler to be idempotent in case of duplicate events