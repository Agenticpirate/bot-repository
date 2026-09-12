> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Long Running Workflows

> Best practices for handling workflows that take extended time to complete, including asynchronous execution patterns and timeout management.

When building production applications with Vellum Workflows, you may encounter scenarios where Workflows take several minutes or longer to complete. This guide covers best practices for handling these long-running Workflows effectively.

## Understanding the Challenge

Long-running Workflows can present challenges in production environments:

* **Client timeouts**: HTTP clients may timeout before Workflow completion
* **Resource constraints**: Keeping connections open for extended periods
* **Error handling**: Managing failures in long-running processes
* **User experience**: Providing feedback during extended operations

## Recommended Approaches

### Option 1: Webhooks (Recommended)

The most robust approach for long-running Workflows is to execute them asynchronously and use webhooks to receive completion notifications. See our [Webhooks documentation](/product/monitoring/webhooks) for detailed setup instructions.

### Configure Webhooks

Set up webhook endpoints in your Vellum organization to receive Workflow execution events:

1. Navigate to **Organization Settings** → **Webhooks**
2. Add your webhook endpoint URL
3. Configure authentication (API key, Bearer token, or HMAC)
4. Select the events you want to receive:
   * `workflow.execution.initiated`
   * `workflow.execution.fulfilled`
   * `workflow.execution.rejected`

For security, we recommend using HMAC authentication for webhook endpoints. See our [HMAC Authentication guide](/product/security/hmac-authentication) for implementation details.

### Execute Workflow

Use the **async execution endpoint** to initiate your Workflow and immediately receive an `execution_id` for correlation. You can also provide your own `external_id` (such as a job\_id, content\_id, document\_id, or any entity in your system):

**`Python SDK - Async Execution with external_id`**

```python title="Python SDK - Async Execution with external_id"
import vellum

client = vellum.VellumClient(api_key="your-api-key")

# Use async endpoint to get execution_id immediately
response = client.execute_workflow_async(
    workflow_deployment_name="your-workflow",
    inputs=[
        vellum.WorkflowRequestStringInput(
            name="user_query",
            value="Process this complex request"
        )
    ],
    external_id="task-12345"  # Your internal task ID for correlation
)

execution_id = response.execution_id
print(f"Workflow started with execution_id: {execution_id}")
# Store execution_id for later correlation with webhook
```

**`TypeScript SDK - Async Execution with external_id`**

```typescript title="TypeScript SDK - Async Execution with external_id"
import { VellumClient } from 'vellum-ai';

const client = new VellumClient({ apiKey: 'your-api-key' });

// Use async endpoint to get execution_id immediately
const response = await client.executeWorkflowAsync({
    workflowDeploymentName: 'your-workflow',
    inputs: [
        {
            name: 'user_query',
            value: 'Process this complex request',
            type: 'STRING'
        }
    ],
    externalId: 'task-12345'  // Your internal task ID for correlation
});

const executionId = response.executionId;
console.log(`Workflow started with execution_id: ${executionId}`);
// Store execution_id for later correlation with webhook
```

You can also use the streaming endpoint (`execute_workflow_stream`) if you want to receive the `execution_id` from the first event, but the async endpoint (`execute_workflow_async`) is simpler and more efficient for webhook-based patterns since it returns the `execution_id` directly without requiring you to handle a stream.

### Handle Webhook Events

Process webhook events to update your application state:

**`Flask Webhook Handler`**

```python title="Flask Webhook Handler"
from flask import Flask, request, jsonify
import hmac
import hashlib

app = Flask(__name__)

@app.route('/webhook/vellum', methods=['POST'])
def handle_vellum_webhook():
    # Verify HMAC signature (recommended)
    signature = request.headers.get('X-Vellum-Signature')
    timestamp = request.headers.get('X-Vellum-Timestamp')
    
    if not verify_hmac_signature(request.data, signature, timestamp):
        return jsonify({'error': 'Invalid signature'}), 401
    
    event = request.json
    
    if event['type'] == 'workflow.execution.fulfilled':
        # Workflow completed successfully
        external_id = event['data']['parent']['external_id']
        outputs = event['data']['outputs']
        
        # Update your internal task status
        update_task_status(external_id, 'completed', outputs)
        
    elif event['type'] == 'workflow.execution.rejected':
        # Workflow failed
        external_id = event['data']['parent']['external_id']
        error = event['data']['error']
        
        # Update your internal task status
        update_task_status(external_id, 'failed', error)
    
    return jsonify({'status': 'received'}), 200

def verify_hmac_signature(payload, signature, timestamp):
    # Implement HMAC verification
    # See our HMAC Authentication documentation for implementation details:
    # https://docs.vellum.ai/product/security/hmac-authentication
    pass

def update_task_status(external_id, status, data):
    # Update your database/system with the Workflow result
    print(f"Task {external_id} status: {status}")
```

**`Express.js Webhook Handler`**

```javascript title="Express.js Webhook Handler"
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

app.post('/webhook/vellum', (req, res) => {
    // Verify HMAC signature (recommended)
    const signature = req.headers['x-vellum-signature'];
    const timestamp = req.headers['x-vellum-timestamp'];
    
    if (!verifyHmacSignature(req.body, signature, timestamp)) {
        return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const event = req.body;
    
    if (event.type === 'workflow.execution.fulfilled') {
        // Workflow completed successfully
        const externalId = event.data.parent.external_id;
        const outputs = event.data.outputs;
        
        // Update your internal task status
        updateTaskStatus(externalId, 'completed', outputs);
        
    } else if (event.type === 'workflow.execution.rejected') {
        // Workflow failed
        const externalId = event.data.parent.external_id;
        const error = event.data.error;
        
        // Update your internal task status
        updateTaskStatus(externalId, 'failed', error);
    }
    
    res.json({ status: 'received' });
});

function updateTaskStatus(externalId, status, data) {
    // Update your database/system with the Workflow result
    console.log(`Task ${externalId} status: ${status}`);
}
```

### Option 2: Async Execution with Status Polling

Use the [async execution endpoint](https://docs.vellum.ai/developers/client-sdk/workflows/execute-workflow-async) to initiate a Workflow and immediately receive an `execution_id`, then poll for the execution status using the [Check Workflow Execution Status endpoint](https://docs.vellum.ai/developers/client-sdk/workflows/check-execution-status). This is the recommended approach for polling-based async execution.

Async executions automatically queue when you exceed your concurrency limit, making this endpoint ideal for batch jobs where you don't need everything to complete at once. You can initiate many executions quickly and they'll process as capacity becomes available:

**`Python SDK - Async Execution with Status Polling`**

```python title="Python SDK - Async Execution with Status Polling"
import vellum
import time

client = vellum.VellumClient(api_key="your-api-key")

# Step 1: Start Workflow asynchronously and get execution_id
response = client.execute_workflow_async(
    workflow_deployment_name="your-workflow",
    inputs=[
        vellum.WorkflowRequestStringInput(
            name="user_query",
            value="Process this complex request"
        )
    ],
    external_id="task-12345"  # Optional: your internal ID for tracking
)

execution_id = response.execution_id
print(f"Workflow started with execution_id: {execution_id}")

# Step 2: Poll for execution status
while True:
    try:
        # Check execution status
        status_response = client.check_workflow_execution_status(
            execution_id=execution_id
        )
        
        if status_response.status == "FULFILLED":
            print("Workflow completed successfully!")
            print(f"Results: {status_response.outputs}")
            if status_response.execution_detail_url:
                print(f"View details: {status_response.execution_detail_url}")
            break
        elif status_response.status == "REJECTED":
            print("Workflow failed!")
            break
        elif status_response.status == "PENDING":
            print("Workflow is still pending...")
            time.sleep(5)  # Poll every 5 seconds for pending
        else:
            print(f"Workflow still running... Status: {status_response.status}")
            time.sleep(30)  # Poll every 30 seconds for running workflows
            
    except Exception as e:
        print(f"Error checking execution status: {e}")
        time.sleep(30)
```

**`TypeScript SDK - Async Execution with Status Polling`**

```typescript title="TypeScript SDK - Async Execution with Status Polling"
import { VellumClient } from 'vellum-ai';

const client = new VellumClient({ apiKey: 'your-api-key' });

// Step 1: Start Workflow asynchronously and get execution_id
const response = await client.executeWorkflowAsync({
    workflowDeploymentName: 'your-workflow',
    inputs: [
        {
            name: 'user_query',
            value: 'Process this complex request',
            type: 'STRING'
        }
    ],
    externalId: 'task-12345'  // Optional: your internal ID for tracking
});

const executionId = response.executionId;
console.log(`Workflow started with execution_id: ${executionId}`);

// Step 2: Poll for execution status
while (true) {
    try {
        // Check execution status
        const statusResponse = await client.checkWorkflowExecutionStatus({
            executionId: executionId
        });
        
        if (statusResponse.status === 'FULFILLED') {
            console.log('Workflow completed successfully!');
            console.log('Results:', statusResponse.outputs);
            if (statusResponse.executionDetailUrl) {
                console.log(`View details: ${statusResponse.executionDetailUrl}`);
            }
            break;
        } else if (statusResponse.status === 'REJECTED') {
            console.log('Workflow failed!');
            break;
        } else if (statusResponse.status === 'PENDING') {
            console.log('Workflow is still pending...');
            await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds for pending
        } else {
            console.log(`Workflow still running... Status: ${statusResponse.status}`);
            await new Promise(resolve => setTimeout(resolve, 30000)); // Poll every 30 seconds for running workflows
        }
        
    } catch (error) {
        console.error('Error checking execution status:', error);
        await new Promise(resolve => setTimeout(resolve, 30000));
    }
}
```

The status endpoint returns the current execution state (`PENDING`, `FULFILLED`, `REJECTED`, etc.), along with outputs and an execution detail URL once the workflow completes. This makes it ideal for polling-based async execution patterns.

For batch processing scenarios where you need to process many Workflow executions at once, see our [Batch Jobs guide](/product/workflows/advanced/batch-jobs) for detailed patterns and best practices.

### Option 3: API Node

This approach is beneficial when you want to specify a specific callback URL or payload format. You can use an API Node at the end of your Workflow to send results directly to your system:

### Workflow Design

1. **Add an API Node** at the end of your Workflow
2. **Configure the API Node** to POST results to your callback endpoint
3. **Include your task ID** in the API Node payload

### API Node Configuration

Configure the API Node with:

* **URL**: Your callback endpoint
* **Method**: POST
* **Headers**: Include authentication if needed
* **Body**: Include Workflow outputs and your task ID

### Option 4: Streaming Updates

For Workflows where you want to provide real-time progress updates, use the streaming execution endpoint. This can still be problematic if updates are *really* long, but at least enables you to stream updated messaging from your LLMs as they invoke tools:

**`Python Streaming`**

```python title="Python Streaming"
import vellum

client = vellum.VellumClient(api_key="your-api-key")

# Stream Workflow execution for real-time updates
stream = client.execute_workflow_stream(
    workflow_deployment_name="your-workflow",
    inputs=[
        vellum.WorkflowRequestStringInput(
            name="user_query",
            value="Process this complex request"
        )
    ],
    external_id="task-12345"
)

for event in stream:
    if event.type == "workflow.execution.initiated":
        print(f"Workflow started: {event.execution_id}")
    elif event.type == "workflow.execution.streaming":
        # Handle intermediate results
        print(f"Progress update: {event.data}")
    elif event.type == "workflow.execution.fulfilled":
        print(f"Workflow completed: {event.data.outputs}")
        break
    elif event.type == "workflow.execution.rejected":
        print(f"Workflow failed: {event.data.error}")
        break
```

**`TypeScript Streaming`**

```typescript title="TypeScript Streaming"
import { VellumClient } from 'vellum-ai';

const client = new VellumClient({ apiKey: 'your-api-key' });

// Stream Workflow execution for real-time updates
const stream = await client.executeWorkflowStream({
    workflowDeploymentName: 'your-workflow',
    inputs: [
        {
            name: 'user_query',
            value: 'Process this complex request',
            type: 'STRING'
        }
    ],
    externalId: 'task-12345'
});

for await (const event of stream) {
    if (event.type === 'workflow.execution.initiated') {
        console.log(`Workflow started: ${event.executionId}`);
    } else if (event.type === 'workflow.execution.streaming') {
        // Handle intermediate results
        console.log(`Progress update:`, event.data);
    } else if (event.type === 'workflow.execution.fulfilled') {
        console.log(`Workflow completed:`, event.data.outputs);
        break;
    } else if (event.type === 'workflow.execution.rejected') {
        console.log(`Workflow failed:`, event.data.error);
        break;
    }
}
```

Streaming connections should still have reasonable timeout limits. For very long Workflows (>10 minutes), webhooks are still the recommended approach.

## Timeout Management

### Client-Side Timeouts

When using synchronous execution, configure appropriate timeouts:

**`Python with Timeout`**

```python title="Python with Timeout"
import vellum
from vellum.core import RequestOptions

client = vellum.VellumClient(api_key="your-api-key")

try:
    response = client.execute_workflow(
        workflow_deployment_name="your-workflow",
        inputs=[...],
        request_options=RequestOptions(
            timeout_in_seconds=600  # 10 minute timeout
        )
    )
except TimeoutError:
    print("Workflow execution timed out")
    # Handle timeout - workflow may still be running
```

**`TypeScript with Timeout`**

```typescript title="TypeScript with Timeout"
import { VellumClient } from 'vellum-ai';

const client = new VellumClient({ 
    apiKey: 'your-api-key',
    timeoutInSeconds: 600  // 10 minute timeout
});

try {
    const response = await client.executeWorkflow({
        workflowDeploymentName: 'your-workflow',
        inputs: [...]
    });
} catch (error) {
    if (error.name === 'TimeoutError') {
        console.log('Workflow execution timed out');
        // Handle timeout - workflow may still be running
    }
}
```

### Infrastructure Considerations

#### AWS Lambda

If using AWS Lambda, be aware of the 15-minute maximum execution time:

**`Lambda Handler Pattern`**

```python title="Lambda Handler Pattern"
import json
import vellum

def lambda_handler(event, context):
    client = vellum.VellumClient(api_key=os.environ['VELLUM_API_KEY'])
    
    # For long Workflows, use async pattern
    response = client.execute_workflow(
        workflow_deployment_name="long-running-workflow",
        inputs=event['inputs'],
        external_id=event['task_id']  # Use for webhook correlation
    )
    
    # Return immediately with execution_id
    return {
        'statusCode': 200,
        'body': json.dumps({
            'execution_id': response.execution_id,
            'status': 'initiated',
            'message': 'Workflow started. Results will be sent via webhook.'
        })
    }
```

#### Container Environments

For containerized applications, ensure your containers can handle long-running connections if using streaming:

**`Docker Configuration`**

```yaml title="Docker Configuration"
# Dockerfile
FROM python:3.11
# ... other setup ...

# Set appropriate timeouts
ENV REQUESTS_TIMEOUT=900
ENV WORKFLOW_TIMEOUT=900

# Health check for long-running processes
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1
```

## Error Handling and Retry Strategies

### Workflow-Level Retry

For Workflows that may fail due to transient issues, implement retry logic:

**`Python Retry Logic`**

```python title="Python Retry Logic"
import time
import vellum
from typing import Optional

def execute_workflow_with_retry(
    client: vellum.VellumClient,
    workflow_name: str,
    inputs: list,
    external_id: str,
    max_retries: int = 3,
    retry_delay: int = 60
) -> Optional[str]:
    """Execute Workflow with retry logic for transient failures."""
    
    for attempt in range(max_retries + 1):
        try:
            response = client.execute_workflow(
                workflow_deployment_name=workflow_name,
                inputs=inputs,
                external_id=f"{external_id}-attempt-{attempt}"
            )
            return response.execution_id
            
        except Exception as e:
            if attempt == max_retries:
                print(f"Workflow failed after {max_retries} retries: {e}")
                return None
            
            print(f"Attempt {attempt + 1} failed: {e}. Retrying in {retry_delay}s...")
            time.sleep(retry_delay)
    
    return None
```

### Node-Level Resilience

Prompts may experience nondeterministic errors from model providers. Longer running Workflows are particularly prone to these issues. To mitigate this, it's a good idea to implement retry logic with [Node Adornemnts](/product/workflows/nodes/node-adornments). You can also disable streaming from the Model Settings while editing a Prompt to mitigate other nondeterministic connection issues.

Use Node Adornments to add resilience to individual Workflow nodes:

* **Retry Node Adornments**: Automatically retry failed nodes
* **Try Node Adornments**: Gracefully handle node failures with fallback paths

See our [Node Adornments documentation](/product/workflows/nodes/node-adornments) for detailed configuration.

## Monitoring and Observability

### Execution Tracking

Monitor long-running Workflows through the Monitoring tab of your Workflow Deployment (see our [monitoring documentation](/product/deployments/observability) for details):

1. **Executions Tab**: View real-time execution status
2. **Timeline View**: Analyze execution flow and bottlenecks
3. **Cost Tracking**: Monitor resource usage for long Workflows

## Best Practices Summary

#### Use Webhooks for Production

Always use webhook-based async execution for Workflows that may take more than a few minutes. This provides the most reliable and scalable approach.

#### Include External IDs

Always include an `external_id` when executing Workflows to correlate webhook events with your internal processes.

#### Implement Proper Error Handling

Handle both Workflow-level failures and infrastructure timeouts gracefully. Consider retry strategies for transient failures.

#### Monitor Execution Times

Track Workflow execution times to identify performance bottlenecks and optimize your Workflows.

#### Secure Webhook Endpoints

Use HMAC authentication to secure your webhook endpoints and verify that events are coming from Vellum.

#### Design for Resilience

Use Node Adornments (Retry, Try) to make individual Workflow components more resilient to transient failures.

## Related Documentation

* [Batch Jobs](/product/workflows/advanced/batch-jobs) - Process large volumes of Workflow executions efficiently
* [Webhooks Configuration](/product/monitoring/webhooks)
* [HMAC Authentication](/product/security/hmac-authentication)
* [Node Adornments](/product/workflows/nodes/node-adornments)
* [Workflow Monitoring](/product/deployments/observability-in-production)
* [API Reference - Execute Workflow](/developers/api-reference/workflow-deployments/execute-workflow)
* [API Reference - Execute Workflow Async](/developers/api-reference/workflows/execute-workflow-async)
* [API Reference - Check Workflow Execution Status](/developers/api-reference/workflows/check-execution-status)