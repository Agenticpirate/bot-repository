> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Execute Prompt

POST https://predict.vellum.ai/v1/execute-prompt
Content-Type: application/json

Executes a deployed Prompt and returns the result.

Reference: https://docs.vellum.ai/developers/client-sdk/prompts/execute-prompt

## Authentication

- `X-API-KEY` header (required) — API Key authentication via header

## Request

### Body (application/json)

This endpoint expects an object.

- `inputs` (list of object or object or object or object or object or object or object, required) — A list consisting of the Prompt Deployment's input variables and their values.
  - STRING
    - `name` (string, required) — The variable's name
    - `type` (enum, required)
      - Allowed values: `STRING`
    - `value` (string, required)
  - JSON
    - `name` (string, required) — The variable's name
    - `type` (enum, required)
      - Allowed values: `JSON`
    - `value` (any, required, nullable)
  - CHAT_HISTORY
    - `name` (string, required) — The variable's name, as defined in the deployment.
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
  - AUDIO
    - `name` (string, required) — The variable's name
    - `type` (enum, required)
      - Allowed values: `AUDIO`
    - `value` (object, required)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
  - VIDEO
    - `name` (string, required) — The variable's name
    - `type` (enum, required)
      - Allowed values: `VIDEO`
    - `value` (object, required)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
  - IMAGE
    - `name` (string, required) — The variable's name
    - `type` (enum, required)
      - Allowed values: `IMAGE`
    - `value` (object, required)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
  - DOCUMENT
    - `name` (string, required) — The variable's name
    - `type` (enum, required)
      - Allowed values: `DOCUMENT`
    - `value` (object, required)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
- `prompt_deployment_id` (string, optional, nullable) — The ID of the Prompt Deployment. Must provide either this or prompt_deployment_name.
- `prompt_deployment_name` (string, optional, nullable) — The unique name of the Prompt Deployment. Must provide either this or prompt_deployment_id.
- `release_tag` (string, optional, nullable) — Optionally specify a release tag if you want to pin to a specific release of the Prompt Deployment
- `external_id` (string, optional, nullable) — Optionally include a unique identifier for tracking purposes. Must be unique within a given Workspace.
- `expand_meta` (object, optional, nullable) — An optionally specified configuration used to opt in to including additional metadata about this prompt execution in the API response. Corresponding values will be returned under the `meta` key of the API response.
  - `model_name` (boolean, optional, nullable) — If enabled, the response will include the model identifier representing the ML Model invoked by the Prompt.
  - `usage` (boolean, optional, nullable) — If enabled, the response will include model host usage tracking. This may increase latency for some model hosts.
  - `cost` (boolean, optional, nullable) — If enabled, the response will include model host cost tracking. This may increase latency for some model hosts.
  - `finish_reason` (boolean, optional, nullable) — If enabled, the response will include the reason provided by the model for why the execution finished.
  - `latency` (boolean, optional, nullable) — If enabled, the response will include the time in nanoseconds it took to execute the Prompt Deployment.
  - `deployment_release_tag` (boolean, optional, nullable) — If enabled, the response will include the release tag of the Prompt Deployment.
  - `prompt_version_id` (boolean, optional, nullable) — If enabled, the response will include the ID of the Prompt Version backing the deployment.
- `raw_overrides` (object, optional, nullable) — Overrides for the raw API request sent to the model host. Combined with `expand_raw`, it can be used to access new features from models.
  - `body` (map from string to any, optional, nullable)
  - `headers` (map from string to string, optional, nullable) — The raw headers to send to the model host.
  - `url` (string, optional, nullable) — The raw URL to send to the model host.
- `expand_raw` (list of string, optional, nullable) — A list of keys whose values you'd like to directly return from the JSON response of the model provider. Useful if you need lower-level info returned by model providers that Vellum would otherwise omit. Corresponding key/value pairs will be returned under the `raw` key of the API response.
- `metadata` (map from string to any, optional, nullable) — Arbitrary JSON metadata associated with this request. Can be used to capture additional monitoring data such as user id, session id, etc. for future analysis.

## Response

### 200

- `object or object`
  - FULFILLED
    - `execution_id` (string, required) — The ID of the execution.
    - `state` (enum, required)
      - Allowed values: `FULFILLED`
    - `outputs` (list of object or object or object or object or object, required)
      - STRING
        - `type` (enum, required)
          - Allowed values: `STRING`
        - `value` (string, required, nullable)
      - JSON
        - `type` (enum, required)
          - Allowed values: `JSON`
        - `value` (any, required, nullable)
      - ERROR
        - `type` (enum, required)
          - Allowed values: `ERROR`
        - `value` (object, required, nullable)
          - `code` (enum, required) — * `INVALID_REQUEST` - INVALID_REQUEST * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_ERROR` - PROVIDER_ERROR * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `REQUEST_TIMEOUT` - REQUEST_TIMEOUT * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `NODE_CANCELLED` - NODE_CANCELLED * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `CHAT_QUOTA_EXCEEDED` - CHAT_QUOTA_EXCEEDED
            - Allowed values: `INVALID_REQUEST`, `INVALID_INPUTS`, `PROVIDER_ERROR`, `PROVIDER_CREDENTIALS_UNAVAILABLE`, `INTEGRATION_CREDENTIALS_UNAVAILABLE`, `REQUEST_TIMEOUT`, `INTERNAL_SERVER_ERROR`, `USER_DEFINED_ERROR`, `WORKFLOW_CANCELLED`, `NODE_CANCELLED`, `PROVIDER_QUOTA_EXCEEDED`, `CHAT_QUOTA_EXCEEDED`
          - `message` (string, required)
          - `raw_data` (map from string to any, optional, nullable)
      - FUNCTION_CALL
        - `type` (enum, required)
          - Allowed values: `FUNCTION_CALL`
        - `value` (object, required, nullable) — The final resolved function call value.
          - `arguments` (map from string to any, required)
          - `name` (string, required)
          - `id` (string, optional, nullable)
      - THINKING
        - `type` (enum, required)
          - Allowed values: `THINKING`
        - `value` (object, required, nullable) — A value representing a string.
          - `type` (enum, required)
            - Allowed values: `STRING`
          - `value` (string, required, nullable)
    - `meta` (object, optional) — The subset of the metadata tracked by Vellum during prompt execution that the request opted into with `expand_meta`.
      - `model_name` (string, optional, nullable)
      - `latency` (integer, optional, nullable)
      - `deployment_release_tag` (string, optional, nullable)
      - `prompt_version_id` (string, optional, nullable)
      - `finish_reason` (enum, optional, nullable) — * `LENGTH` - LENGTH * `STOP` - STOP * `UNKNOWN` - UNKNOWN
        - Allowed values: `LENGTH`, `STOP`, `UNKNOWN`
      - `usage` (object, optional, nullable)
        - `output_token_count` (integer, optional, nullable)
        - `input_token_count` (integer, optional, nullable)
        - `input_char_count` (integer, optional, nullable)
        - `output_char_count` (integer, optional, nullable)
        - `compute_nanos` (integer, optional, nullable)
        - `cache_creation_input_tokens` (integer, optional, nullable)
        - `cache_read_input_tokens` (integer, optional, nullable)
      - `cost` (object, optional, nullable)
        - `value` (double, required)
        - `unit` (enum, required) — * `USD` - USD
          - Allowed values: `USD`
    - `raw` (map from string to any, optional) — The subset of the raw response from the model that the request opted into with `expand_raw`.
    - `chat_message_metadata` (map from string to any, optional, nullable)
  - REJECTED
    - `execution_id` (string, required) — The ID of the execution.
    - `state` (enum, required)
      - Allowed values: `REJECTED`
    - `error` (object, required)
      - `code` (enum, required) — * `INVALID_REQUEST` - INVALID_REQUEST * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_ERROR` - PROVIDER_ERROR * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `REQUEST_TIMEOUT` - REQUEST_TIMEOUT * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `NODE_CANCELLED` - NODE_CANCELLED * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `CHAT_QUOTA_EXCEEDED` - CHAT_QUOTA_EXCEEDED
        - Allowed values: `INVALID_REQUEST`, `INVALID_INPUTS`, `PROVIDER_ERROR`, `PROVIDER_CREDENTIALS_UNAVAILABLE`, `INTEGRATION_CREDENTIALS_UNAVAILABLE`, `REQUEST_TIMEOUT`, `INTERNAL_SERVER_ERROR`, `USER_DEFINED_ERROR`, `WORKFLOW_CANCELLED`, `NODE_CANCELLED`, `PROVIDER_QUOTA_EXCEEDED`, `CHAT_QUOTA_EXCEEDED`
      - `message` (string, required)
      - `raw_data` (map from string to any, optional, nullable)
    - `meta` (object, optional) — The subset of the metadata tracked by Vellum during prompt execution that the request opted into with `expand_meta`.
      - `model_name` (string, optional, nullable)
      - `latency` (integer, optional, nullable)
      - `deployment_release_tag` (string, optional, nullable)
      - `prompt_version_id` (string, optional, nullable)
      - `finish_reason` (enum, optional, nullable) — * `LENGTH` - LENGTH * `STOP` - STOP * `UNKNOWN` - UNKNOWN
        - Allowed values: `LENGTH`, `STOP`, `UNKNOWN`
      - `usage` (object, optional, nullable)
        - `output_token_count` (integer, optional, nullable)
        - `input_token_count` (integer, optional, nullable)
        - `input_char_count` (integer, optional, nullable)
        - `output_char_count` (integer, optional, nullable)
        - `compute_nanos` (integer, optional, nullable)
        - `cache_creation_input_tokens` (integer, optional, nullable)
        - `cache_read_input_tokens` (integer, optional, nullable)
      - `cost` (object, optional, nullable)
        - `value` (double, required)
        - `unit` (enum, required) — * `USD` - USD
          - Allowed values: `USD`
    - `raw` (map from string to any, optional) — The subset of the raw response from the model that the request opted into with `expand_raw`.

## Errors

### 400 Bad Request Error

- `detail` (string, required) — Details about why the request failed.
- `raw_data` (map from string to any, optional, nullable) — The raw error data structure, if available.

### 403 Forbidden Error

- `detail` (string, required) — Details about why the request failed.
- `raw_data` (map from string to any, optional, nullable) — The raw error data structure, if available.

### 404 Not Found Error

- `detail` (string, required) — Details about why the request failed.
- `raw_data` (map from string to any, optional, nullable) — The raw error data structure, if available.

### 500 Internal Server Error

- `detail` (string, required) — Details about why the request failed.
- `raw_data` (map from string to any, optional, nullable) — The raw error data structure, if available.

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
  "meta": {
    "model_name": "string",
    "latency": 1,
    "deployment_release_tag": "string",
    "prompt_version_id": "string",
    "finish_reason": "LENGTH",
    "usage": {
      "output_token_count": 1,
      "input_token_count": 1,
      "input_char_count": 1,
      "output_char_count": 1,
      "compute_nanos": 1,
      "cache_creation_input_tokens": 1,
      "cache_read_input_tokens": 1
    },
    "cost": {
      "value": 1.1,
      "unit": "USD"
    }
  },
  "raw": {},
  "execution_id": "string",
  "state": "FULFILLED",
  "outputs": [
    {
      "type": "STRING",
      "value": "string"
    }
  ],
  "chat_message_metadata": {}
}
```

**SDK Code**

```python
import requests

url = "https://predict.vellum.ai/v1/execute-prompt"

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
await client.executePrompt({
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

	url := "https://predict.vellum.ai/v1/execute-prompt"

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

url = URI("https://predict.vellum.ai/v1/execute-prompt")

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

HttpResponse<String> response = Unirest.post("https://predict.vellum.ai/v1/execute-prompt")
  .header("X-API-KEY", "<apiKey>")
  .header("Content-Type", "application/json")
  .body("{\n  \"inputs\": [\n    {\n      \"name\": \"string\",\n      \"type\": \"STRING\",\n      \"value\": \"string\"\n    }\n  ]\n}")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://predict.vellum.ai/v1/execute-prompt', [
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

var client = new RestClient("https://predict.vellum.ai/v1/execute-prompt");
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

let request = NSMutableURLRequest(url: NSURL(string: "https://predict.vellum.ai/v1/execute-prompt")! as URL,
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