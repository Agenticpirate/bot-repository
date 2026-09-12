> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# API Versioning

> Learn how to use Vellum's X-API-VERSION header to control which version of the API you're using and manage breaking changes.

Vellum uses date-based API versioning via request headers to give you control over when to enable new API features that may introduce breaking changes. This allows you to upgrade to new features on your own timeline while maintaining backward compatibility.

## Why API Versioning Exists

API versioning in Vellum serves several important purposes:

* **Backward Compatibility**: Ensures your existing integrations continue to work when new features are released
* **Controlled Upgrades**: Allows you to test and adopt new features when you're ready, rather than being forced to handle breaking changes immediately
* **Feature Gating**: Enables access to new capabilities like Reasoning Outputs and enhanced response formats
* **Stable Production**: Keeps your production systems running smoothly while new features are being developed

## How to Use API Versioning

### Setting the API Version

Specify which version of Vellum's API you want to use by including the `X-API-VERSION` header in your requests:

**`cURL`**

```bash title="cURL"
curl --request POST \
  --url "https://predict.vellum.ai/v1/execute-prompt" \
  --header "Content-Type: application/json" \
  --header "X-API-KEY: $VELLUM_API_KEY" \
  --header "X-API-VERSION: 2025-07-30" \
  --data '{
    "prompt_deployment_name": "your-prompt-name",
    "release_tag": "LATEST"
  }'
```

**`Python SDK`**

```python title="Python SDK"
from vellum import Vellum

client = Vellum(
    api_key="your-api-key",
    api_version="2025-07-30"  # Specify version in client initialization (default in SDK v1.0.0+)
)

result = client.execute_prompt(
    prompt_deployment_name="your-prompt-name",
    release_tag="LATEST"
)
```

**`Node.js SDK`**

```typescript title="Node.js SDK"
import { VellumClient } from 'vellum-ai';

const vellum = new VellumClient({
  apiKey: 'your-api-key',
  apiVersion: '2025-07-30'  // Specify version in client initialization (default in SDK v1.0.0+)
});

const result = await vellum.executePrompt({
  promptDeploymentName: 'your-prompt-name',
  releaseTag: 'LATEST'
});
```

### Using API Versioning in Sandboxes

API versioning is available in both Prompt Sandboxes and Workflows Sandboxes, allowing you to specify which version of the Vellum API you want to use when testing and developing your prompts and workflows. This gives you the same level of control over new features and breaking changes in your development environment.

To set the API version in a sandbox:

**For Prompt Sandboxes:**

1. Open your prompt in the Prompt Sandbox
2. Click on the Prompt Editor Settings/Prompt Comparison Settings
3. Select your desired API version from the API Version Selector

**For Workflows Sandboxes:**

1. Open your workflow in the Workflows Sandbox
2. Click on the Workflow Builder Settings
3. Select your desired API version from the API Version Selector

This enhancement ensures consistency between your development and production environments, allowing you to test new API features before deploying them to production. The API version selector works the same way across both sandbox environments - simply choose your desired API version to access the corresponding feature set.

This provides a unified experience whether you're working with Prompt Deployments, Workflow Deployments, or developing in either sandbox environment.

### Default Behavior

The default API version behavior differs depending on how you make requests:

* **Raw API requests**: If you don't specify an `X-API-VERSION` header, Vellum will use the default version (`2024-10-25`) to ensure backward compatibility with existing integrations.
* **SDK v1.0.0+**: The latest API version (`2025-07-30`) is used by default, giving you access to the newest features automatically. You can override this to use a prior API version if you wish.
* **SDK versions prior to 1.0.0**: Defaults to using API version `2024-10-25`, but can be overridden.

### SDK Version Requirements

Different SDK versions support different API versions:

* **SDK versions prior to 1.0.0**: Only support API version `2024-10-25`
* **SDK versions 1.0.0 and later**: Support both `2024-10-25` and `2025-07-30`, with `2025-07-30` as the default

Make sure to upgrade your SDK to version 1.0.0 or later to access the latest API features.

## Available API Versions

### `2024-10-25` (Legacy Default)

This is the original API version that maintains full backward compatibility. It's used by default for raw API requests when no `X-API-VERSION` header is provided.

**Features:**

* Standard prompt execution responses
* Traditional output formats
* Full compatibility with all existing integrations

### `2025-07-30` (Latest, SDK Default)

The latest API version that includes new features and improvements. This is the default in our SDKs beginning v1.0.0.

**New Features:**

* **Reasoning Outputs**: Support for thinking/reasoning blocks from compatible models
* **Enhanced Response Format**: Differentiated blocks in API responses for reasoning-capable models
* **Future Features**: This version will continue to receive new capabilities as they're developed

## Breaking Changes Across Versions

### Changes in `2025-07-30`

#### Reasoning Outputs Support

The most significant change in `2025-07-30` is the introduction of Reasoning Outputs for models that support thinking/reasoning capabilities.

**Non-Streaming Output Before (`2024-10-25`):**

```json
{
  "execution_id": "3e973c88-86c2-45ae-bd0f-c72e9c43ddb4",
  "state": "FULFILLED",
  "outputs": [
    {
      "type": "STRING",
      "value": "The answer is 42."
    }
  ]
}
```

**Non-Streaming Output After (`2025-07-30`):**

```json
{
  "execution_id": "1b37a0be-d089-4518-9ac5-867135eab960",
  "state": "FULFILLED",
  "outputs": [
    {
      "type": "THINKING",
      "value": {
        "type": "STRING",
        "value": "Let me think about that question. A quick google search claims that the meaning to life is 42."
      }
    },
    {
      "type": "STRING",
      "value": "The answer is 42."
    }
  ]
}
```

Streaming outputs also support Reasoning Outputs with the API Version set to `2025-07-30`.

**Streaming Output before (`2024-10-25`):**

```json
{
  "state": "INITIATED",
  "execution_id": "1df0213a-9946-47f8-ac8d-e11359748c4e"
}
{
  "state": "STREAMING",
  "output": {
    "type": "STRING",
    "value": "The"
  },
  "output_index": 0,
  "execution_id": "1df0213a-9946-47f8-ac8d-e11359748c4e"
}
{
  "state": "STREAMING",
  "output": {
    "type": "STRING",
    "value": " answer"
  },
  "output_index": 0,
  "execution_id": "1df0213a-9946-47f8-ac8d-e11359748c4e"
}
... # The rest of the streaming deltas
{
  "state": "FULFILLED",
  "outputs": [
    {
      "type": "STRING",
      "value": "The answer is 42."
    }
  ],
  "execution_id": "1df0213a-9946-47f8-ac8d-e11359748c4e"
}
```

**Streaming Output After (`2025-07-30`):**

```json
{
  "state": "INITIATED",
  "execution_id": "e3a40c85-20e1-421c-83da-f3dbbc9dd1e4"
}
{
  "state": "STREAMING",
  "output": {
    "type": "THINKING",
    "value": {
      "type": "STRING",
      "value": "Let me"
    }
  },
  "output_index": 0,
  "execution_id": "e3a40c85-20e1-421c-83da-f3dbbc9dd1e4"
}
{
  "state": "STREAMING",
  "output": {
    "type": "THINKING",
    "value": {
      "type": "STRING",
      "value": " think"
    }
  },
  "output_index": 0,
  "execution_id": "e3a40c85-20e1-421c-83da-f3dbbc9dd1e4"
}
... # The rest of the Reasoning streaming deltas
{
  "state": "STREAMING",
  "output": {
    "type": "STRING",
    "value": "The"
  },
  "output_index": 1,
  "execution_id": "e3a40c85-20e1-421c-83da-f3dbbc9dd1e4"
}
{
  "state": "STREAMING",
  "output": {
    "type": "STRING",
    "value": " answer"
  },
  "output_index": 1,
  "execution_id": "e3a40c85-20e1-421c-83da-f3dbbc9dd1e4"
}
... # The rest of the Final deltas
{
  "state": "FULFILLED",
  "outputs": [
    {
      "type": "THINKING",
      "value": {
        "type": "STRING",
        "value": "Let me think about that question. A quick google search claims that the meaning to life is 42."
      }
    },
    {
      "type": "STRING",
      "value": "The answer is 42."
    }
  ],
  "execution_id": "e3a40c85-20e1-421c-83da-f3dbbc9dd1e4"
}
```

If your application parses API responses and expects a specific structure, you may need to update your code to handle the new `THINKING` output type and introduction of additional outputs when upgrading to `2025-07-30`.

#### Thinking Output in Workflows

With API version `2025-07-30`, thinking output support has been extended to Prompt Nodes and Prompt Deployment Nodes within the Workflows Sandbox. This enhancement brings the same transparency and insight capabilities directly into your workflow development process.

When a Prompt Node or Prompt Deployment Node executes with a model that supports reasoning outputs, you can view the model's thinking process directly in the node's results view. This provides valuable debugging and development insights, allowing you to understand how the model arrives at its conclusions within your workflow context.

**Important:** While the thinking output is visible for your review and debugging purposes, downstream nodes in your workflow will only receive the final output - the thinking process remains isolated to the results view. This ensures your workflow logic remains unaffected while providing you with valuable insight into the model's reasoning process.

#### Models Affected

Reasoning Outputs are currently supported by:

* All Anthropic Claude models with reasoning capabilities
* All OpenAI Models with reasoning capabilities invoked via Responses API

Only models that actually support reasoning will include the `THINKING` output in responses. Standard models will continue to return responses in the same format as before.

## Best Practices

### Testing New Versions

1. **Test in Development**: Always test new API versions in your development environment first
2. **Gradual Rollout**: Consider rolling out API version changes gradually across your systems
3. **Monitor Responses**: Watch for any changes in response structure that might affect your application

### Version Management

1. **Pin Versions**: Explicitly specify the API version in your requests rather than relying on defaults
2. **Document Usage**: Keep track of which API versions you're using across different parts of your application
3. **Plan Upgrades**: Review changelog entries for new API versions to understand what changes to expect

## Migration Guide

### Upgrading to `2025-07-30`

1. **Update SDK**: Upgrade to SDK version 1.0.0 or later
2. **Test Reasoning Models**: If you use reasoning-capable models, test that your application handles the new `thinking` field appropriately
3. **Update Headers**: Add `X-API-VERSION: 2025-07-30` to your API requests (or rely on SDK v1.0.0+ defaults)
4. **Monitor**: Watch for any unexpected behavior after the upgrade

### Handling Reasoning Outputs

If you're upgrading to `2025-07-30` and use reasoning-capable models, you may need to update your response handling:

**`Python`**

```python title="Python"
# Handle both thinking and non-thinking responses
result = client.execute_prompt(
    prompt_deployment_name="your-prompt-name",
    release_tag="LATEST"
)

result = client.execute_prompt(
    prompt_deployment_name="testing",
    release_tag="LATEST",
)

compiled_result = result.outputs

for result in compiled_result:
    if result.type == "THINKING":
        print(f"Thinking Output: {result.value.value}\n")
    elif result.type == "STRING":
        print(f"Final Output: {result.value}\n")

```

**`TypeScript`**

```typescript title="TypeScript"
// Handle both thinking and non-thinking responses
const result = await vellum.executePrompt({
  promptDeploymentName: 'your-prompt-name',
  releaseTag: 'LATEST'
});

if (result.state === "FULFILLED") {
  const compiledResult = result.outputs;

  for (const output of compiledResult) {
    if (output.type === "THINKING") {
      console.log(`Thinking Output: ${output.value.value}\n`);
    } else if (output.type === "STRING") {
      console.log(`Final Output: ${output.value}\n`);
    }
  }
} else {
  console.log("Request was rejected:", result);
```

## Future Versions

Vellum will continue to release new API versions as new features are developed. Each new version will be documented with:

* A comprehensive list of new features
* Breaking changes and migration guidance
* SDK compatibility requirements
* Examples of new capabilities

Stay tuned to the [changelog](/changelog) for announcements of new API versions and features.