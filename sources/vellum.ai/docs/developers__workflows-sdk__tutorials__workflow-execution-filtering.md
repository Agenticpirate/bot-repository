> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Workflow Execution Filtering and Monitoring

> Learn how to programmatically filter and retrieve Workflow execution data using the Vellum API, including advanced filtering techniques and monitoring patterns.

When working with Workflow Deployments in production, you'll often need to filter and retrieve execution data for monitoring, debugging, or analytics purposes. This guide shows you how to use the Workflow execution API endpoints effectively, including how to construct complex filters programmatically.

## Overview

Vellum provides two key endpoints for working with Workflow execution data:

1. **List Workflow Deployment Executions** - Retrieve and filter executions with advanced query capabilities
2. **Retrieve Workflow Deployment Execution** - Get detailed information about a specific execution, including actuals submissions

#### Basic Execution Retrieval

Start by retrieving recent executions for a Workflow Deployment. This quick example demonstrates how to set up the client and fetch execution data with basic filtering and sorting:

**`Python SDK`**

```python title="Python SDK"
import vellum

client = vellum.VellumClient(api_key="your-api-key")

# List recent executions for a Workflow Deployment
executions = client.workflow_deployments.list_executions(
    id="your-workflow-deployment-id",
    limit=50,  # Number of executions to return
    offset=0   # Starting position for pagination
)

for execution in executions.results:
    print(f"Execution ID: {execution.execution_id}")
    print(f"Status: {execution.state}")
    print(f"Timestamp: {execution.timestamp}")
```

**`TypeScript SDK`**

```typescript title="TypeScript SDK"
import { VellumClient } from 'vellum-ai';

const client = new VellumClient({
    apiKey: 'your-api-key'
});

// List recent executions for a Workflow Deployment
const executions = await client.workflowDeployments.listExecutions({
    id: 'your-workflow-deployment-id',
    limit: 50,  // Number of executions to return
    offset: 0   // Starting position for pagination
});

for (const execution of executions.results) {
    console.log(`Execution ID: ${execution.execution_id}`);
    console.log(`Status: ${execution.state}`);
    console.log(`Timestamp: ${execution.timestamp}`);
}
```

## Advanced Filtering

### Understanding Filter Structure

The `filters` parameter accepts a JSON string that defines complex filtering conditions. Here's the basic structure:

**`Filter JSON Structure`**

```json title="Filter JSON Structure"
{
  "type": "LOGICAL_CONDITION_GROUP",
  "conditions": [
    {
      "type": "LOGICAL_CONDITION",
      "lhs_variable": {"type": "STRING", "value": "field_name"},
      "operator": ">=",
      "rhs_variable": {"type": "STRING", "value": "filter_value"}
    }
  ],
  "combinator": "AND",
  "negated": false
}
```

### Common Filtering Examples

#### Filter by Timestamp Range

**`Python SDK`**

```python title="Python SDK"
import json
from datetime import datetime, timezone

# Create a timestamp filter for executions after a specific date
filter_conditions = {
    "type": "LOGICAL_CONDITION_GROUP",
    "conditions": [
        {
            "type": "LOGICAL_CONDITION",
            "lhs_variable": {"type": "STRING", "value": "timestamp"},
            "operator": ">=",
            "rhs_variable": {"type": "STRING", "value": "2025-09-22T20:42:09.361Z"}
        }
    ],
    "combinator": "AND",
    "negated": False
}

executions = client.workflow_deployments.list_executions(
    id="your-workflow-deployment-id",
    filters=json.dumps(filter_conditions)
)
```

**`TypeScript SDK`**

```typescript title="TypeScript SDK"
// Create a timestamp filter for executions after a specific date
const filterConditions = {
    type: "LOGICAL_CONDITION_GROUP",
    conditions: [
        {
            type: "LOGICAL_CONDITION",
            lhs_variable: { type: "STRING", value: "timestamp" },
            operator: ">=",
            rhs_variable: { type: "STRING", value: "2025-09-22T20:42:09.361Z" }
        }
    ],
    combinator: "AND",
    negated: false
};

const executions = await client.workflowDeployments.listExecutions({
    id: 'your-workflow-deployment-id',
    filters: JSON.stringify(filterConditions)
});
```

#### Filter by Execution Status

**`Python SDK`**

```python title="Python SDK"
# Filter for failed executions
filter_conditions = {
    "type": "LOGICAL_CONDITION_GROUP",
    "conditions": [
        {
            "type": "LOGICAL_CONDITION",
            "lhs_variable": {"type": "STRING", "value": "state"},
            "operator": "==",
            "rhs_variable": {"type": "STRING", "value": "REJECTED"}
        }
    ],
    "combinator": "AND",
    "negated": False
}

failed_executions = client.workflow_deployments.list_executions(
    id="your-workflow-deployment-id",
    filters=json.dumps(filter_conditions)
)
```

**`TypeScript SDK`**

```typescript title="TypeScript SDK"
// Filter for failed executions
const filterConditions = {
    type: "LOGICAL_CONDITION_GROUP",
    conditions: [
        {
            type: "LOGICAL_CONDITION",
            lhs_variable: { type: "STRING", value: "state" },
            operator: "==",
            rhs_variable: { type: "STRING", value: "REJECTED" }
        }
    ],
    combinator: "AND",
    negated: false
};

const failedExecutions = await client.workflowDeployments.listExecutions({
    id: 'your-workflow-deployment-id',
    filters: JSON.stringify(filterConditions)
});
```

#### Complex Multi-Condition Filters

**`Python SDK`**

```python title="Python SDK"
# Filter for executions that are either successful OR failed after a specific date
complex_filter = {
    "type": "LOGICAL_CONDITION_GROUP",
    "conditions": [
        {
            "type": "LOGICAL_CONDITION",
            "lhs_variable": {"type": "STRING", "value": "timestamp"},
            "operator": ">=",
            "rhs_variable": {"type": "STRING", "value": "2025-09-20T00:00:00Z"}
        },
        {
            "type": "LOGICAL_CONDITION_GROUP",
            "conditions": [
                {
                    "type": "LOGICAL_CONDITION",
                    "lhs_variable": {"type": "STRING", "value": "state"},
                    "operator": "==",
                    "rhs_variable": {"type": "STRING", "value": "FULFILLED"}
                },
                {
                    "type": "LOGICAL_CONDITION",
                    "lhs_variable": {"type": "STRING", "value": "state"},
                    "operator": "==",
                    "rhs_variable": {"type": "STRING", "value": "REJECTED"}
                }
            ],
            "combinator": "OR",
            "negated": False
        }
    ],
    "combinator": "AND",
    "negated": False
}

filtered_executions = client.workflow_deployments.list_executions(
    id="your-workflow-deployment-id",
    filters=json.dumps(complex_filter)
)
```

**`TypeScript SDK`**

```typescript title="TypeScript SDK"
// Filter for executions that are either successful OR failed after a specific date
const complexFilter = {
    type: "LOGICAL_CONDITION_GROUP",
    conditions: [
        {
            type: "LOGICAL_CONDITION",
            lhs_variable: { type: "STRING", value: "timestamp" },
            operator: ">=",
            rhs_variable: { type: "STRING", value: "2025-09-20T00:00:00Z" }
        },
        {
            type: "LOGICAL_CONDITION_GROUP",
            conditions: [
                {
                    type: "LOGICAL_CONDITION",
                    lhs_variable: { type: "STRING", value: "state" },
                    operator: "==",
                    rhs_variable: { type: "STRING", value: "FULFILLED" }
                },
                {
                    type: "LOGICAL_CONDITION",
                    lhs_variable: { type: "STRING", value: "state" },
                    operator: "==",
                    rhs_variable: { type: "STRING", value: "REJECTED" }
                }
            ],
            combinator: "OR",
            negated: false
        }
    ],
    combinator: "AND",
    negated: false
};

const filteredExecutions = await client.workflowDeployments.listExecutions({
    id: 'your-workflow-deployment-id',
    filters: JSON.stringify(complexFilter)
});
```

## Ordering Results

Use the `ordering` parameter to sort execution results. Common ordering options include:

* `timestamp` - Sort by execution timestamp (oldest first)
* `-timestamp` - Sort by execution timestamp (newest first)
* `state` - Sort by execution state
* `-state` - Sort by execution state (reverse order)

**`Python SDK`**

```python title="Python SDK"
# Get most recent executions first
executions = client.workflow_deployments.list_executions(
    id="your-workflow-deployment-id",
    ordering="-timestamp",
    limit=20
)
```

**`TypeScript SDK`**

```typescript title="TypeScript SDK"
// Get most recent executions first
const executions = await client.workflowDeployments.listExecutions({
    id: 'your-workflow-deployment-id',
    ordering: '-timestamp',
    limit: 20
});
```

## Retrieving Execution Details and Actuals

Once you have an execution ID, you can retrieve detailed information including submitted actuals:

**`Python SDK`**

```python title="Python SDK"
# Get detailed execution information
execution_detail = client.workflow_deployments.retrieve_execution_event(
    id="your-workflow-deployment-id",
    execution_id="execution-uuid"
)

# Access execution details
print(f"Execution State: {execution_detail.state}")
print(f"Input Values: {execution_detail.inputs}")
print(f"Output Values: {execution_detail.outputs}")

# Access actuals if submitted
if hasattr(execution_detail, 'latest_actual') and execution_detail.latest_actual:
    print(f"Actual submitted at: {execution_detail.latest_actual.timestamp}")
    print(f"Actual output: {execution_detail.latest_actual.output}")
```

**`TypeScript SDK`**

```typescript title="TypeScript SDK"
// Get detailed execution information
const executionDetail = await client.workflowDeployments.retrieveExecutionEvent({
    id: 'your-workflow-deployment-id',
    executionId: 'execution-uuid'
});

// Access execution details
console.log(`Execution State: ${executionDetail.state}`);
console.log(`Input Values:`, executionDetail.inputs);
console.log(`Output Values:`, executionDetail.outputs);

// Access actuals if submitted
if (executionDetail.latest_actual) {
    console.log(`Actual submitted at: ${executionDetail.latest_actual.timestamp}`);
    console.log(`Actual output:`, executionDetail.latest_actual.output);
}
```

## UI Filter Builder Reference

While we recommend using the programmatic approach above, you can also use the Vellum UI to build filters visually and then copy the generated filter structure:

![Vellum UI showing filter builder interface for Workflow executions](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/workflow-execution-ui-filters-1759180972.png)

The URL will contain the encoded filter structure that you can decode and use in your API calls:

**`Decoding UI-Generated Filters`**

```javascript title="Decoding UI-Generated Filters"
// Example URL filter parameter
const encodedFilter = '%7B%22type%22%3A%22LOGICAL_CONDITION_GROUP%22%2C%22conditions%22%3A%5B%7B%22type%22%3A%22LOGICAL_CONDITION%22%2C%22lhs_variable%22%3A%7B%22type%22%3A%22STRING%22%2C%22value%22%3A%22timestamp%22%7D%2C%22operator%22%3A%22%3E%3D%22%2C%22rhs_variable%22%3A%7B%22type%22%3A%22STRING%22%2C%22value%22%3A%222025-09-22T20%3A42%3A09.361Z%22%7D%7D%5D%2C%22combinator%22%3A%22AND%22%2C%22negated%22%3Afalse%7D';

// Decode the filter
const decodedFilter = decodeURIComponent(encodedFilter);
const filterObject = JSON.parse(decodedFilter);

console.log('Filter structure:', filterObject);
```

## Common Filtering Fields

Here are the most commonly used fields for filtering Workflow executions:

| Field          | Type     | Description                 | Example Values                       |
| -------------- | -------- | --------------------------- | ------------------------------------ |
| `timestamp`    | DateTime | Execution timestamp         | `2025-09-22T20:42:09.361Z`           |
| `state`        | String   | Execution state             | `FULFILLED`, `REJECTED`, `INITIATED` |
| `execution_id` | UUID     | Unique execution identifier | `uuid-string`                        |
| `external_id`  | String   | User-provided external ID   | `your-custom-id`                     |

## Supported Operators

When building filter conditions, you can use these operators:

| Operator | Description           | Example Use Case               |
| -------- | --------------------- | ------------------------------ |
| `==`     | Equal to              | Exact state matching           |
| `!=`     | Not equal to          | Exclude specific states        |
| `>=`     | Greater than or equal | Timestamp ranges (after date)  |
| `<=`     | Less than or equal    | Timestamp ranges (before date) |
| `>`      | Greater than          | Strict timestamp filtering     |
| `<`      | Less than             | Strict timestamp filtering     |

## Production Monitoring Patterns

### Real-time Error Monitoring

**`Python SDK - Error Monitoring`**

```python title="Python SDK - Error Monitoring"
import json
from datetime import datetime, timedelta

def monitor_failed_executions(deployment_id, hours_back=1):
    """Monitor for failed executions in the last N hours."""
    
    # Calculate timestamp for filtering
    cutoff_time = datetime.utcnow() - timedelta(hours=hours_back)
    cutoff_iso = cutoff_time.isoformat() + 'Z'
    
    # Build filter for recent failures
    filter_conditions = {
        "type": "LOGICAL_CONDITION_GROUP",
        "conditions": [
            {
                "type": "LOGICAL_CONDITION",
                "lhs_variable": {"type": "STRING", "value": "timestamp"},
                "operator": ">=",
                "rhs_variable": {"type": "STRING", "value": cutoff_iso}
            },
            {
                "type": "LOGICAL_CONDITION",
                "lhs_variable": {"type": "STRING", "value": "state"},
                "operator": "==",
                "rhs_variable": {"type": "STRING", "value": "REJECTED"}
            }
        ],
        "combinator": "AND",
        "negated": False
    }
    
    # Retrieve failed executions
    failed_executions = client.workflow_deployments.list_executions(
        id=deployment_id,
        filters=json.dumps(filter_conditions),
        ordering="-timestamp"
    )
    
    # Process failures
    for execution in failed_executions.results:
        print(f"ALERT: Execution {execution.execution_id} failed at {execution.timestamp}")
        
        # Get detailed error information
        detail = client.workflow_deployments.retrieve_execution_event(
            id=deployment_id,
            execution_id=execution.execution_id
        )
        
        if hasattr(detail, 'error') and detail.error:
            print(f"Error: {detail.error.message}")

# Usage
monitor_failed_executions("your-deployment-id", hours_back=2)
```

### Performance Analytics

**`Python SDK - Performance Analytics`**

```python title="Python SDK - Performance Analytics"
def analyze_execution_performance(deployment_id, days_back=7):
    """Analyze execution performance over time."""
    
    from datetime import datetime, timedelta
    
    # Get executions from the last week
    cutoff_time = datetime.utcnow() - timedelta(days=days_back)
    cutoff_iso = cutoff_time.isoformat() + 'Z'
    
    filter_conditions = {
        "type": "LOGICAL_CONDITION_GROUP",
        "conditions": [
            {
                "type": "LOGICAL_CONDITION",
                "lhs_variable": {"type": "STRING", "value": "timestamp"},
                "operator": ">=",
                "rhs_variable": {"type": "STRING", "value": cutoff_iso}
            }
        ],
        "combinator": "AND",
        "negated": False
    }
    
    executions = client.workflow_deployments.list_executions(
        id=deployment_id,
        filters=json.dumps(filter_conditions),
        limit=1000,  # Adjust based on your volume
        ordering="-timestamp"
    )
    
    # Analyze results
    total_count = len(executions.results)
    successful_count = len([e for e in executions.results if e.state == "FULFILLED"])
    failed_count = len([e for e in executions.results if e.state == "REJECTED"])
    
    print(f"Execution Summary (Last {days_back} days):")
    print(f"Total: {total_count}")
    print(f"Successful: {successful_count} ({successful_count/total_count*100:.1f}%)")
    print(f"Failed: {failed_count} ({failed_count/total_count*100:.1f}%)")
    
    return {
        "total": total_count,
        "successful": successful_count,
        "failed": failed_count,
        "success_rate": successful_count/total_count if total_count > 0 else 0
    }
```

## Next Steps

* Explore the [List Workflow Deployment Executions API reference](https://docs.vellum.ai/developers/client-sdk/workflows/deployments/list-executions) for complete parameter details
* Learn about [Retrieve Workflow Deployment Execution Event API](https://docs.vellum.ai/developers/client-sdk/workflows/deployments/retrieve-execution-event) for detailed execution information
* Set up [monitoring and webhooks](/product/monitoring/webhooks) for real-time execution notifications
* Implement [Workflow execution actuals](/developers/client-sdk/workflows/submit-workflow-execution-actuals) to track quality metrics