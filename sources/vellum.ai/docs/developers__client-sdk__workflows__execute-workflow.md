> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Execute Workflow

POST https://predict.vellum.ai/v1/execute-workflow
Content-Type: application/json

Executes a deployed Workflow and returns its outputs.

Reference: https://docs.vellum.ai/developers/client-sdk/workflows/execute-workflow

## Authentication

- `X-API-KEY` header (required) — API Key authentication via header

## Request

### Body (application/json)

This endpoint expects an object.

- `inputs` (list of object or object or object or object or object or object or object or object, required) — The list of inputs defined in the Workflow's Deployment with their corresponding values.
  - STRING
    - `name` (string, required) — The variable's name, as defined in the Workflow.
    - `type` (enum, required)
      - Allowed values: `STRING`
    - `value` (string, required)
  - JSON
    - `name` (string, required) — The variable's name, as defined in the Workflow.
    - `type` (enum, required)
      - Allowed values: `JSON`
    - `value` (any, required, nullable)
  - CHAT_HISTORY
    - `name` (string, required) — The variable's name, as defined in the Workflow.
    - `type` (enum, required)
      - Allowed values: `CHAT_HISTORY`
    - `value` (list of object, required)
      - `role` (enum, required) — * `SYSTEM` - System * `ASSISTANT` - Assistant * `USER` - User * `FUNCTION` - Function
        - Allowed values: `SYSTEM`, `ASSISTANT`, `USER`, `FUNCTION`
      - `text` (string, optional, nullable)
      - `content` (object or object or object or object or object or object or object, optional, nullable)
        - STRING
          - `type` (enum, required)
            - Allowed values: `STRING`
          - `value` (string, required)
        - FUNCTION_CALL
          - `type` (enum, required)
            - Allowed values: `FUNCTION_CALL`
          - `value` (object, required) — The final resolved function call value.
            - `name` (string, required)
            - `arguments` (map from string to any, required)
            - `id` (string, optional, nullable)
        - ARRAY
          - `type` (enum, required)
            - Allowed values: `ARRAY`
          - `value` (list of object or object or object or object or object or object, required)
            - STRING
            - FUNCTION_CALL
            - AUDIO
            - VIDEO
            - IMAGE
            - DOCUMENT
        - AUDIO
          - `type` (enum, required)
            - Allowed values: `AUDIO`
          - `value` (object, required)
            - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
            - `metadata` (map from string to any, optional, nullable)
        - VIDEO
          - `type` (enum, required)
            - Allowed values: `VIDEO`
          - `value` (object, required)
            - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
            - `metadata` (map from string to any, optional, nullable)
        - IMAGE
          - `type` (enum, required)
            - Allowed values: `IMAGE`
          - `value` (object, required)
            - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
            - `metadata` (map from string to any, optional, nullable)
        - DOCUMENT
          - `type` (enum, required)
            - Allowed values: `DOCUMENT`
          - `value` (object, required)
            - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
            - `metadata` (map from string to any, optional, nullable)
      - `source` (string, optional, nullable) — An optional identifier representing who or what generated this message.
      - `metadata` (map from string to any, optional, nullable)
  - NUMBER
    - `name` (string, required) — The variable's name, as defined in the Workflow.
    - `type` (enum, required)
      - Allowed values: `NUMBER`
    - `value` (double, required)
  - AUDIO
    - `name` (string, required) — The variable's name, as defined in the Workflow.
    - `type` (enum, required)
      - Allowed values: `AUDIO`
    - `value` (object, required)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
  - VIDEO
    - `name` (string, required) — The variable's name, as defined in the Workflow.
    - `type` (enum, required)
      - Allowed values: `VIDEO`
    - `value` (object, required)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
  - IMAGE
    - `name` (string, required) — The variable's name, as defined in the Workflow.
    - `type` (enum, required)
      - Allowed values: `IMAGE`
    - `value` (object, required)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
  - DOCUMENT
    - `name` (string, required) — The variable's name, as defined in the Workflow.
    - `type` (enum, required)
      - Allowed values: `DOCUMENT`
    - `value` (object, required)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
- `expand_meta` (object, optional, nullable) — An optionally specified configuration used to opt in to including additional metadata about this workflow execution in the API response. Corresponding values will be returned under the `execution_meta` key within NODE events in the response stream.
  - `usage` (boolean, optional, nullable) — If enabled, the Prompt Node FULFILLED events will include model host usage tracking. This may increase latency for some model hosts.
  - `cost` (boolean, optional, nullable) — If enabled, the Prompt Node FULFILLED events will include model host cost tracking. This may increase latency for some model hosts.
  - `model_name` (boolean, optional, nullable) — If enabled, the Prompt Node FULFILLED events will include model host name
- `workflow_deployment_id` (string, optional, nullable) — The ID of the Workflow Deployment. Must provide either this or workflow_deployment_name.
- `workflow_deployment_name` (string, optional, nullable) — The name of the Workflow Deployment. Must provide either this or workflow_deployment_id.
- `release_tag` (string, optional, nullable) — Optionally specify a release tag if you want to pin to a specific release of the Workflow Deployment
- `external_id` (string, optional, nullable) — Optionally include a unique identifier for tracking purposes. Must be unique within a given Workspace.
- `metadata` (map from string to any, optional, nullable) — Arbitrary JSON metadata associated with this request. Can be used to capture additional monitoring data such as user id, session id, etc. for future analysis.
- `previous_execution_id` (string, optional, nullable) — The ID of a previous Workflow Execution to reference for initial State loading.

## Response

### 200

- `execution_id` (string, required)
- `data` (object or object, required)
  - FULFILLED
    - `id` (string, required)
    - `state` (enum, required)
      - Allowed values: `FULFILLED`
    - `ts` (string, required)
    - `outputs` (list of object or object or object or object or object or object or object or object or object or object or object or object, required)
      - STRING
        - `id` (string, required)
        - `name` (string, required) — The output's name, as defined in the workflow
        - `type` (enum, required)
          - Allowed values: `STRING`
        - `value` (string, required, nullable)
      - NUMBER
        - `id` (string, required)
        - `name` (string, required) — The output's name, as defined in the workflow
        - `type` (enum, required)
          - Allowed values: `NUMBER`
        - `value` (double, required, nullable)
      - JSON
        - `id` (string, required)
        - `name` (string, required) — The output's name, as defined in the workflow
        - `type` (enum, required)
          - Allowed values: `JSON`
        - `value` (any, required, nullable)
      - CHAT_HISTORY
        - `id` (string, required)
        - `name` (string, required) — The output's name, as defined in the workflow
        - `type` (enum, required)
          - Allowed values: `CHAT_HISTORY`
        - `value` (list of object, required, nullable)
          - `role` (enum, required) — * `SYSTEM` - System * `ASSISTANT` - Assistant * `USER` - User * `FUNCTION` - Function
            - Allowed values: `SYSTEM`, `ASSISTANT`, `USER`, `FUNCTION`
          - `text` (string, optional, nullable)
          - `content` (object or object or object or object or object or object or object, optional, nullable)
            - STRING
            - FUNCTION_CALL
            - ARRAY
            - AUDIO
            - VIDEO
            - IMAGE
            - DOCUMENT
          - `source` (string, optional, nullable) — An optional identifier representing who or what generated this message.
          - `metadata` (map from string to any, optional, nullable)
      - SEARCH_RESULTS
        - `id` (string, required)
        - `name` (string, required) — The output's name, as defined in the workflow
        - `type` (enum, required)
          - Allowed values: `SEARCH_RESULTS`
        - `value` (list of object, required, nullable)
          - `text` (string, required) — The text of the chunk that matched the search query.
          - `score` (double, required) — A score representing how well the chunk matches the search query.
          - `keywords` (list of string, required)
          - `document` (object, required) — The document that contains the chunk that matched the search query.
            - `label` (string, required) — The human-readable name for the document.
            - `id` (string, optional, nullable) — The ID of the document.
            - `external_id` (string, optional, nullable) — The unique ID of the document as represented in an external system and specified when it was originally uploaded.
            - `metadata` (map from string to any, optional, nullable) — A previously supplied JSON object containing metadata that can be filtered on when searching.
          - `meta` (object, optional, nullable) — Additional information about the search result.
            - `source` (object, optional, nullable)
      - ARRAY
        - `id` (string, required)
        - `name` (string, required) — The output's name, as defined in the workflow
        - `type` (enum, required)
          - Allowed values: `ARRAY`
        - `value` (list of object or object or object or object or object or object or object or object or object or object or object or object or object, required, nullable)
          - STRING
            - `type` (enum, required)
            - `value` (string, required, nullable)
          - NUMBER
            - `type` (enum, required)
            - `value` (double, required, nullable)
          - JSON
            - `type` (enum, required)
            - `value` (any, required, nullable)
          - AUDIO
            - `type` (enum, required)
            - `value` (object, required, nullable)
          - VIDEO
            - `type` (enum, required)
            - `value` (object, required, nullable)
          - IMAGE
            - `type` (enum, required)
            - `value` (object, required, nullable)
          - DOCUMENT
            - `type` (enum, required)
            - `value` (object, required, nullable)
          - FUNCTION_CALL
            - `type` (enum, required)
            - `value` (object, required, nullable) — The final resolved function call value.
          - ERROR
            - `type` (enum, required)
            - `value` (object, required, nullable)
          - ARRAY
            - `type` (enum, required)
            - `value` (list of object or object or object or object or object or object or object or object or object or object or object or object or object, required, nullable)
          - CHAT_HISTORY
            - `type` (enum, required)
            - `value` (list of object, required, nullable)
          - SEARCH_RESULTS
            - `type` (enum, required)
            - `value` (list of object, required, nullable)
          - THINKING
            - `type` (enum, required)
            - `value` (object, required, nullable) — A value representing a string.
      - ERROR
        - `id` (string, required)
        - `name` (string, required) — The output's name, as defined in the workflow
        - `type` (enum, required)
          - Allowed values: `ERROR`
        - `value` (object, required, nullable)
          - `code` (enum, required) — * `INVALID_REQUEST` - INVALID_REQUEST * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_ERROR` - PROVIDER_ERROR * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `REQUEST_TIMEOUT` - REQUEST_TIMEOUT * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `NODE_CANCELLED` - NODE_CANCELLED * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `CHAT_QUOTA_EXCEEDED` - CHAT_QUOTA_EXCEEDED
            - Allowed values: `INVALID_REQUEST`, `INVALID_INPUTS`, `PROVIDER_ERROR`, `PROVIDER_CREDENTIALS_UNAVAILABLE`, `INTEGRATION_CREDENTIALS_UNAVAILABLE`, `REQUEST_TIMEOUT`, `INTERNAL_SERVER_ERROR`, `USER_DEFINED_ERROR`, `WORKFLOW_CANCELLED`, `NODE_CANCELLED`, `PROVIDER_QUOTA_EXCEEDED`, `CHAT_QUOTA_EXCEEDED`
          - `message` (string, required)
          - `raw_data` (map from string to any, optional, nullable)
      - FUNCTION_CALL
        - `id` (string, required)
        - `name` (string, required) — The output's name, as defined in the workflow
        - `type` (enum, required)
          - Allowed values: `FUNCTION_CALL`
        - `value` (object, required, nullable) — The final resolved function call value.
          - `arguments` (map from string to any, required)
          - `name` (string, required)
          - `id` (string, optional, nullable)
      - IMAGE
        - `id` (string, required)
        - `name` (string, required) — The output's name, as defined in the workflow
        - `type` (enum, required)
          - Allowed values: `IMAGE`
        - `value` (object, required, nullable)
          - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
          - `metadata` (map from string to any, optional, nullable)
      - AUDIO
        - `id` (string, required)
        - `name` (string, required) — The output's name, as defined in the workflow
        - `type` (enum, required)
          - Allowed values: `AUDIO`
        - `value` (object, required, nullable)
          - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
          - `metadata` (map from string to any, optional, nullable)
      - VIDEO
        - `id` (string, required)
        - `name` (string, required) — The output's name, as defined in the workflow
        - `type` (enum, required)
          - Allowed values: `VIDEO`
        - `value` (object, required, nullable)
          - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
          - `metadata` (map from string to any, optional, nullable)
      - DOCUMENT
        - `id` (string, required)
        - `name` (string, required) — The output's name, as defined in the workflow
        - `type` (enum, required)
          - Allowed values: `DOCUMENT`
        - `value` (object, required, nullable)
          - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
          - `metadata` (map from string to any, optional, nullable)
  - REJECTED
    - `id` (string, required)
    - `state` (enum, required)
      - Allowed values: `REJECTED`
    - `ts` (string, required)
    - `error` (object, required)
      - `message` (string, required)
      - `code` (enum, required) — * `WORKFLOW_INITIALIZATION` - WORKFLOW_INITIALIZATION * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `WORKFLOW_TIMEOUT` - WORKFLOW_TIMEOUT * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `NODE_EXECUTION_COUNT_LIMIT_REACHED` - NODE_EXECUTION_COUNT_LIMIT_REACHED * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `NODE_EXECUTION` - NODE_EXECUTION * `NODE_CANCELLED` - NODE_CANCELLED * `NODE_TIMEOUT` - NODE_TIMEOUT * `LLM_PROVIDER` - LLM_PROVIDER * `INVALID_TEMPLATE` - INVALID_TEMPLATE * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR
        - Allowed values: `WORKFLOW_INITIALIZATION`, `WORKFLOW_CANCELLED`, `WORKFLOW_TIMEOUT`, `PROVIDER_CREDENTIALS_UNAVAILABLE`, `INTEGRATION_CREDENTIALS_UNAVAILABLE`, `NODE_EXECUTION_COUNT_LIMIT_REACHED`, `INTERNAL_SERVER_ERROR`, `NODE_EXECUTION`, `NODE_CANCELLED`, `NODE_TIMEOUT`, `LLM_PROVIDER`, `INVALID_TEMPLATE`, `INVALID_INPUTS`, `PROVIDER_QUOTA_EXCEEDED`, `USER_DEFINED_ERROR`
      - `raw_data` (map from string to any or string, optional, nullable)
      - `stacktrace` (string, optional, nullable)
- `external_id` (string, optional, nullable)
- `run_id` (string, optional, nullable, deprecated)

## Errors

### 400 Bad Request Error

- `map from string to any`

### 404 Not Found Error

- `map from string to any`

### 500 Internal Server Error

- `detail` (string, required) — Details about why the request failed.

## Examples

**Request**

```json
{
  "inputs": [
    {
      "name": "string",
      "type": "STRING",
      "value": "string"
    }
  ]
}
```

**Response**

```json
{
  "execution_id": "string",
  "data": {
    "id": "string",
    "state": "FULFILLED",
    "ts": "2024-01-15T09:30:00Z",
    "outputs": [
      {
        "id": "string",
        "name": "string",
        "type": "STRING",
        "value": "string"
      }
    ]
  },
  "external_id": "string",
  "run_id": "string"
}
```

**SDK Code**

```python
import requests

url = "https://predict.vellum.ai/v1/execute-workflow"

payload = { "inputs": [
        {
            "name": "string",
            "type": "STRING",
            "value": "string"
        }
    ] }
headers = {
    "X-API-KEY": "<apiKey>",
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)

print(response.json())
```

```typescript
import { VellumClient } from "vellum-ai";

const client = new VellumClient({ apiKey: "YOUR_API_KEY", apiVersion: "YOUR_API_VERSION" });
await client.executeWorkflow({
    inputs: [{
            name: "x",
            type: "STRING",
            value: "value"
        }, {
            name: "x",
            type: "STRING",
            value: "value"
        }]
});

```

```go
package main

import (
	"fmt"
	"strings"
	"net/http"
	"io"
)

func main() {

	url := "https://predict.vellum.ai/v1/execute-workflow"

	payload := strings.NewReader("{\n  \"inputs\": [\n    {\n      \"name\": \"string\",\n      \"type\": \"STRING\",\n      \"value\": \"string\"\n    }\n  ]\n}")

	req, _ := http.NewRequest("POST", url, payload)

	req.Header.Add("X-API-KEY", "<apiKey>")
	req.Header.Add("Content-Type", "application/json")

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(res)
	fmt.Println(string(body))

}
```

```ruby
require 'uri'
require 'net/http'

url = URI("https://predict.vellum.ai/v1/execute-workflow")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["X-API-KEY"] = '<apiKey>'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"inputs\": [\n    {\n      \"name\": \"string\",\n      \"type\": \"STRING\",\n      \"value\": \"string\"\n    }\n  ]\n}"

response = http.request(request)
puts response.read_body
```

```java
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;

HttpResponse<String> response = Unirest.post("https://predict.vellum.ai/v1/execute-workflow")
  .header("X-API-KEY", "<apiKey>")
  .header("Content-Type", "application/json")
  .body("{\n  \"inputs\": [\n    {\n      \"name\": \"string\",\n      \"type\": \"STRING\",\n      \"value\": \"string\"\n    }\n  ]\n}")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://predict.vellum.ai/v1/execute-workflow', [
  'body' => '{
  "inputs": [
    {
      "name": "string",
      "type": "STRING",
      "value": "string"
    }
  ]
}',
  'headers' => [
    'Content-Type' => 'application/json',
    'X-API-KEY' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
using RestSharp;

var client = new RestClient("https://predict.vellum.ai/v1/execute-workflow");
var request = new RestRequest(Method.POST);
request.AddHeader("X-API-KEY", "<apiKey>");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"inputs\": [\n    {\n      \"name\": \"string\",\n      \"type\": \"STRING\",\n      \"value\": \"string\"\n    }\n  ]\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "X-API-KEY": "<apiKey>",
  "Content-Type": "application/json"
]
let parameters = ["inputs": [
    [
      "name": "string",
      "type": "STRING",
      "value": "string"
    ]
  ]] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://predict.vellum.ai/v1/execute-workflow")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "POST"
request.allHTTPHeaderFields = headers
request.httpBody = postData as Data

let session = URLSession.shared
let dataTask = session.dataTask(with: request as URLRequest, completionHandler: { (data, response, error) -> Void in
  if (error != nil) {
    print(error as Any)
  } else {
    let httpResponse = response as? HTTPURLResponse
    print(httpResponse)
  }
})

dataTask.resume()
```