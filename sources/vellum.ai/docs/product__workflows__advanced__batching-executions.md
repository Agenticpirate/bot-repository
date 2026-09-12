> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Batching Executions

> Process large volumes of Workflow executions efficiently using async execution and automatic queuing.

When you need to process many Workflow executions at once, the async execution endpoint is ideal for batch processing. Async executions automatically queue when you exceed your concurrency limit, allowing you to initiate many executions quickly without waiting for each one to complete.

## Why Use Async Execution for Batch Jobs

Async execution is perfect for batch processing scenarios because:

* **Automatic queuing**: Executions automatically queue when you exceed your concurrency limit
* **Non-blocking**: You can initiate many executions quickly without waiting for completion
* **Efficient resource usage**: Executions process as capacity becomes available
* **Scalable**: Handle large batches without overwhelming your system

## Basic Batch Job Pattern

The simplest pattern is to initiate all executions at once. They'll queue automatically if needed:

**`Python SDK - Basic Batch Job`**

```python title="Python SDK - Basic Batch Job"
import vellum
from typing import List

client = vellum.VellumClient(api_key="your-api-key")

# Process a batch of items
items_to_process = [
    {"user_query": "Process item 1"},
    {"user_query": "Process item 2"},
    {"user_query": "Process item 3"},
    # ... many more items
]

# Initiate all executions - they'll queue automatically if needed
execution_ids = []
for i, item in enumerate(items_to_process):
    response = client.execute_workflow_async(
        workflow_deployment_name="your-workflow",
        inputs=[
            vellum.WorkflowRequestStringInput(
                name="user_query",
                value=item["user_query"]
            )
        ],
        external_id=f"batch-item-{i}"  # Track each item
    )
    execution_ids.append(response.execution_id)
    print(f"Initiated execution {i+1}/{len(items_to_process)}: {response.execution_id}")

print(f"\nInitiated {len(execution_ids)} executions. They'll process as capacity becomes available.")
```

**`TypeScript SDK - Basic Batch Job`**

```typescript title="TypeScript SDK - Basic Batch Job"
import { VellumClient } from 'vellum-ai';

const client = new VellumClient({ apiKey: 'your-api-key' });

// Process a batch of items
const itemsToProcess = [
    { userQuery: 'Process item 1' },
    { userQuery: 'Process item 2' },
    { userQuery: 'Process item 3' },
    // ... many more items
];

// Initiate all executions - they'll queue automatically if needed
const executionIds: string[] = [];
for (let i = 0; i < itemsToProcess.length; i++) {
    const item = itemsToProcess[i];
    const response = await client.executeWorkflowAsync({
        workflowDeploymentName: 'your-workflow',
        inputs: [
            {
                name: 'user_query',
                value: item.userQuery,
                type: 'STRING'
            }
        ],
        externalId: `batch-item-${i}`  // Track each item
    });
    executionIds.push(response.executionId);
    console.log(`Initiated execution ${i + 1}/${itemsToProcess.length}: ${response.executionId}`);
}

console.log(`\nInitiated ${executionIds.length} executions. They'll process as capacity becomes available.`);
```

## Tracking Batch Job Completion

After initiating your batch, you have several options for tracking completion:

### Option 1: Webhooks (Recommended)

The most efficient approach is to use webhooks to receive completion notifications. See our [Long Running Workflows guide](/product/workflows/advanced/long-running-workflows) for webhook setup details.

**`Python SDK - Batch Job with Webhooks`**

```python title="Python SDK - Batch Job with Webhooks"
import vellum

client = vellum.VellumClient(api_key="your-api-key")

# Initiate batch executions
items_to_process = [/* your items */]
execution_ids = []

for i, item in enumerate(items_to_process):
    response = client.execute_workflow_async(
        workflow_deployment_name="your-workflow",
        inputs=[/* your inputs */],
        external_id=f"batch-item-{i}"  # Use external_id for webhook correlation
    )
    execution_ids.append(response.execution_id)

# Store execution_ids for tracking
# Webhooks will notify you when each execution completes
print(f"Initiated {len(execution_ids)} executions. Webhooks will notify on completion.")
```

### Option 2: Status Polling

Poll the status endpoint to check completion. This is useful when you need to wait for results before proceeding:

**`Python SDK - Batch Job with Status Polling`**

```python title="Python SDK - Batch Job with Status Polling"
import vellum
import time
from typing import Dict, List

client = vellum.VellumClient(api_key="your-api-key")

# Initiate batch executions
items_to_process = [] # your items here
execution_ids = []

for i, item in enumerate(items_to_process):
    response = client.execute_workflow_async(
        workflow_deployment_name="your-workflow",
        inputs=[], # your inputs here
        external_id=f"batch-item-{i}"
    )
    execution_ids.append(response.execution_id)

# Poll for completion
results: Dict[str, dict] = {}
pending = set(execution_ids)

while pending:
    for execution_id in list(pending):
        try:
            status_response = client.workflows.workflow_execution_status(
                execution_id=execution_id
            )

            if status_response.status == "FULFILLED":
                results[execution_id] = {
                    "status": "completed",
                    "outputs": status_response.outputs
                }
                pending.remove(execution_id)
                print(f"Completed: {execution_id}")
            elif status_response.status == "REJECTED":
                results[execution_id] = {
                    "status": "failed"
                }
                pending.remove(execution_id)
                print(f"Failed: {execution_id}")
        except Exception as e:
            print(f"Error checking {execution_id}: {e}")

    if pending:
        print(f"Still processing {len(pending)} executions...")
        time.sleep(30)  # Poll every 30 seconds

print(f"\nBatch complete! Processed {len(results)} executions.")
```

### Option 3: Hybrid Approach

Initiate executions and periodically check status, but rely on webhooks for final notification:

**`Python SDK - Hybrid Approach`**

```python title="Python SDK - Hybrid Approach"
import vellum
import time

client = vellum.VellumClient(api_key="your-api-key")

# Initiate batch executions
items_to_process = [/* your items */]
execution_ids = []

for i, item in enumerate(items_to_process):
    response = client.execute_workflow_async(
        workflow_deployment_name="your-workflow",
        inputs=[/* your inputs */],
        external_id=f"batch-item-{i}"
    )
    execution_ids.append(response.execution_id)

# Optional: Quick status check after a delay
time.sleep(60)  # Wait 1 minute

# Check how many have completed so far
completed = 0
for execution_id in execution_ids:
    try:
        status = client.workflows.workflow_execution_status(execution_id=execution_id)
        if status.status in ["FULFILLED", "REJECTED"]:
            completed += 1
    except:
        pass

print(f"Progress: {completed}/{len(execution_ids)} completed")
print("Webhooks will notify when remaining executions complete.")
```

## Best Practices

#### Use External IDs for Tracking

Always include an `external_id` when initiating batch executions. This allows you to correlate webhook events with your internal records, making it easy to track which item in your batch corresponds to each execution.

#### Monitor Concurrency Limits

Be aware of your organization's concurrency limits. While async executions queue automatically, understanding your limits helps you plan batch sizes and processing times.

#### Handle Failures Gracefully

Some executions in a batch may fail. Use webhooks or status polling to identify failures and implement retry logic or error handling as needed.

#### Use Webhooks for Large Batches

For large batches (hundreds or thousands of executions), webhooks are more efficient than polling. They reduce API calls and provide real-time notifications.

#### Batch Size Considerations

There's no hard limit on batch size, but consider:

* Your organization's concurrency limits
* Processing time per execution
* Webhook endpoint capacity
* Error handling complexity

## Related Documentation

* [Long Running Workflows](/product/workflows/advanced/long-running-workflows) - Detailed guide on async execution patterns
* [Webhooks Configuration](/product/monitoring/webhooks) - Set up webhooks for completion notifications
* [API Reference - Execute Workflow Async](/developers/api-reference/workflows/execute-workflow-async)
* [API Reference - Check Workflow Execution Status](/developers/api-reference/workflows/check-execution-status)