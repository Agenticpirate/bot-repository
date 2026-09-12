> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Upsert Prompt Sandbox Scenario

POST https://api.vellum.ai/v1/sandboxes/{id}/scenarios
Content-Type: application/json

Upserts a new scenario for a sandbox, keying off of the optionally provided scenario id.

If an id is provided and has a match, the scenario will be updated. If no id is provided or no match
is found, a new scenario will be appended to the end.

Note that a full replacement of the scenario is performed, so any fields not provided will be removed
or overwritten with default values.

Reference: https://docs.vellum.ai/developers/client-sdk/prompts/sandboxes/upsert-scenario

## Authentication

- `X-API-KEY` header (required) — API Key authentication via header

## Request

### Path parameters

- `id` (string, required) — A UUID string identifying this sandbox.

### Body (application/json)

This endpoint expects an object.

- `inputs` (list of object or object or object or object or object or object or object, required) — The inputs for the scenario
  - STRING
    - `type` (enum, required)
      - Allowed values: `STRING`
    - `value` (string, required, nullable)
    - `name` (string, required)
  - JSON
    - `type` (enum, required)
      - Allowed values: `JSON`
    - `value` (any, required, nullable)
    - `name` (string, required)
  - CHAT_HISTORY
    - `type` (enum, required)
      - Allowed values: `CHAT_HISTORY`
    - `value` (list of object, required, nullable)
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
    - `name` (string, required)
  - AUDIO
    - `type` (enum, required)
      - Allowed values: `AUDIO`
    - `value` (object, required)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
    - `name` (string, required)
  - VIDEO
    - `type` (enum, required)
      - Allowed values: `VIDEO`
    - `value` (object, required)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
    - `name` (string, required)
  - IMAGE
    - `type` (enum, required)
      - Allowed values: `IMAGE`
    - `value` (object, required)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
    - `name` (string, required)
  - DOCUMENT
    - `type` (enum, required)
      - Allowed values: `DOCUMENT`
    - `value` (object, required)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
    - `name` (string, required)
- `label` (string, optional, default: Untitled Scenario)
- `scenario_id` (string, optional) — The id of the scenario to update. If none is provided, an id will be generated and a new scenario will be appended.

## Response

### 200

- `inputs` (list of object or object or object or object or object or object or object, required) — The inputs for the scenario
  - STRING
    - `type` (enum, required)
      - Allowed values: `STRING`
    - `value` (string, required, nullable)
    - `input_variable_id` (string, required)
  - JSON
    - `type` (enum, required)
      - Allowed values: `JSON`
    - `value` (any, required, nullable)
    - `input_variable_id` (string, required)
  - CHAT_HISTORY
    - `type` (enum, required)
      - Allowed values: `CHAT_HISTORY`
    - `value` (list of object, required, nullable)
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
    - `input_variable_id` (string, required)
  - AUDIO
    - `type` (enum, required)
      - Allowed values: `AUDIO`
    - `value` (object, required, nullable)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
    - `input_variable_id` (string, required)
  - VIDEO
    - `type` (enum, required)
      - Allowed values: `VIDEO`
    - `value` (object, required, nullable)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
    - `input_variable_id` (string, required)
  - IMAGE
    - `type` (enum, required)
      - Allowed values: `IMAGE`
    - `value` (object, required, nullable)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
    - `input_variable_id` (string, required)
  - DOCUMENT
    - `type` (enum, required)
      - Allowed values: `DOCUMENT`
    - `value` (object, required, nullable)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
    - `input_variable_id` (string, required)
- `id` (string, required) — The id of the scenario
- `label` (string, optional, default: Untitled Scenario)

## Examples

### Example 1

**Request**

```json
{
  "inputs": [
    {
      "type": "CHAT_HISTORY",
      "value": [
        {
          "text": "What's your favorite color?",
          "role": "USER"
        },
        {
          "text": "AI's don't have a favorite color.... Yet.",
          "role": "ASSISTANT"
        }
      ],
      "name": "chat_history"
    }
  ],
  "label": "Scenario 2",
  "id": "50c55d1d-4c37-4c83-afc1-9d895f286320"
}
```

**Response**

```json
{
  "inputs": [
    {
      "type": "STRING",
      "value": "string",
      "input_variable_id": "string"
    }
  ],
  "id": "string",
  "label": "Untitled Scenario"
}
```

**SDK Code**

```python
import requests

url = "https://api.vellum.ai/v1/sandboxes/id/scenarios"

payload = {
    "inputs": [
        {
            "type": "CHAT_HISTORY",
            "value": [
                {
                    "text": "What's your favorite color?",
                    "role": "USER"
                },
                {
                    "text": "AI's don't have a favorite color.... Yet.",
                    "role": "ASSISTANT"
                }
            ],
            "name": "chat_history"
        }
    ],
    "label": "Scenario 2",
    "id": "50c55d1d-4c37-4c83-afc1-9d895f286320"
}
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
await client.sandboxes.upsertSandboxScenario("id", {
    inputs: [{
            type: "STRING",
            name: "x"
        }, {
            type: "STRING",
            name: "x"
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

	url := "https://api.vellum.ai/v1/sandboxes/id/scenarios"

	payload := strings.NewReader("{\n  \"inputs\": [\n    {\n      \"type\": \"CHAT_HISTORY\",\n      \"value\": [\n        {\n          \"text\": \"What's your favorite color?\",\n          \"role\": \"USER\"\n        },\n        {\n          \"text\": \"AI's don't have a favorite color.... Yet.\",\n          \"role\": \"ASSISTANT\"\n        }\n      ],\n      \"name\": \"chat_history\"\n    }\n  ],\n  \"label\": \"Scenario 2\",\n  \"id\": \"50c55d1d-4c37-4c83-afc1-9d895f286320\"\n}")

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

url = URI("https://api.vellum.ai/v1/sandboxes/id/scenarios")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["X-API-KEY"] = '<apiKey>'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"inputs\": [\n    {\n      \"type\": \"CHAT_HISTORY\",\n      \"value\": [\n        {\n          \"text\": \"What's your favorite color?\",\n          \"role\": \"USER\"\n        },\n        {\n          \"text\": \"AI's don't have a favorite color.... Yet.\",\n          \"role\": \"ASSISTANT\"\n        }\n      ],\n      \"name\": \"chat_history\"\n    }\n  ],\n  \"label\": \"Scenario 2\",\n  \"id\": \"50c55d1d-4c37-4c83-afc1-9d895f286320\"\n}"

response = http.request(request)
puts response.read_body
```

```java
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;

HttpResponse<String> response = Unirest.post("https://api.vellum.ai/v1/sandboxes/id/scenarios")
  .header("X-API-KEY", "<apiKey>")
  .header("Content-Type", "application/json")
  .body("{\n  \"inputs\": [\n    {\n      \"type\": \"CHAT_HISTORY\",\n      \"value\": [\n        {\n          \"text\": \"What's your favorite color?\",\n          \"role\": \"USER\"\n        },\n        {\n          \"text\": \"AI's don't have a favorite color.... Yet.\",\n          \"role\": \"ASSISTANT\"\n        }\n      ],\n      \"name\": \"chat_history\"\n    }\n  ],\n  \"label\": \"Scenario 2\",\n  \"id\": \"50c55d1d-4c37-4c83-afc1-9d895f286320\"\n}")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.vellum.ai/v1/sandboxes/id/scenarios', [
  'body' => '{
  "inputs": [
    {
      "type": "CHAT_HISTORY",
      "value": [
        {
          "text": "What\'s your favorite color?",
          "role": "USER"
        },
        {
          "text": "AI\'s don\'t have a favorite color.... Yet.",
          "role": "ASSISTANT"
        }
      ],
      "name": "chat_history"
    }
  ],
  "label": "Scenario 2",
  "id": "50c55d1d-4c37-4c83-afc1-9d895f286320"
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

var client = new RestClient("https://api.vellum.ai/v1/sandboxes/id/scenarios");
var request = new RestRequest(Method.POST);
request.AddHeader("X-API-KEY", "<apiKey>");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"inputs\": [\n    {\n      \"type\": \"CHAT_HISTORY\",\n      \"value\": [\n        {\n          \"text\": \"What's your favorite color?\",\n          \"role\": \"USER\"\n        },\n        {\n          \"text\": \"AI's don't have a favorite color.... Yet.\",\n          \"role\": \"ASSISTANT\"\n        }\n      ],\n      \"name\": \"chat_history\"\n    }\n  ],\n  \"label\": \"Scenario 2\",\n  \"id\": \"50c55d1d-4c37-4c83-afc1-9d895f286320\"\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "X-API-KEY": "<apiKey>",
  "Content-Type": "application/json"
]
let parameters = [
  "inputs": [
    [
      "type": "CHAT_HISTORY",
      "value": [
        [
          "text": "What's your favorite color?",
          "role": "USER"
        ],
        [
          "text": "AI's don't have a favorite color.... Yet.",
          "role": "ASSISTANT"
        ]
      ],
      "name": "chat_history"
    ]
  ],
  "label": "Scenario 2",
  "id": "50c55d1d-4c37-4c83-afc1-9d895f286320"
] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.vellum.ai/v1/sandboxes/id/scenarios")! as URL,
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

### Example 2

**Request**

```json
{
  "inputs": [
    {
      "type": "STRING",
      "value": "Hello, world!",
      "name": "var_1"
    },
    {
      "type": "STRING",
      "value": "Why hello, there!",
      "name": "var_2"
    }
  ],
  "label": "Scenario 1",
  "id": "3ee58bf2-1e5c-415e-8b6c-02ca8b77f29d"
}
```

**Response**

```json
{
  "inputs": [
    {
      "type": "STRING",
      "value": "string",
      "input_variable_id": "string"
    }
  ],
  "id": "string",
  "label": "Untitled Scenario"
}
```

**SDK Code**

```python
import requests

url = "https://api.vellum.ai/v1/sandboxes/id/scenarios"

payload = {
    "inputs": [
        {
            "type": "STRING",
            "value": "Hello, world!",
            "name": "var_1"
        },
        {
            "type": "STRING",
            "value": "Why hello, there!",
            "name": "var_2"
        }
    ],
    "label": "Scenario 1",
    "id": "3ee58bf2-1e5c-415e-8b6c-02ca8b77f29d"
}
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
await client.sandboxes.upsertSandboxScenario("id", {
    inputs: [{
            type: "STRING",
            name: "x"
        }, {
            type: "STRING",
            name: "x"
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

	url := "https://api.vellum.ai/v1/sandboxes/id/scenarios"

	payload := strings.NewReader("{\n  \"inputs\": [\n    {\n      \"type\": \"STRING\",\n      \"value\": \"Hello, world!\",\n      \"name\": \"var_1\"\n    },\n    {\n      \"type\": \"STRING\",\n      \"value\": \"Why hello, there!\",\n      \"name\": \"var_2\"\n    }\n  ],\n  \"label\": \"Scenario 1\",\n  \"id\": \"3ee58bf2-1e5c-415e-8b6c-02ca8b77f29d\"\n}")

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

url = URI("https://api.vellum.ai/v1/sandboxes/id/scenarios")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["X-API-KEY"] = '<apiKey>'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"inputs\": [\n    {\n      \"type\": \"STRING\",\n      \"value\": \"Hello, world!\",\n      \"name\": \"var_1\"\n    },\n    {\n      \"type\": \"STRING\",\n      \"value\": \"Why hello, there!\",\n      \"name\": \"var_2\"\n    }\n  ],\n  \"label\": \"Scenario 1\",\n  \"id\": \"3ee58bf2-1e5c-415e-8b6c-02ca8b77f29d\"\n}"

response = http.request(request)
puts response.read_body
```

```java
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;

HttpResponse<String> response = Unirest.post("https://api.vellum.ai/v1/sandboxes/id/scenarios")
  .header("X-API-KEY", "<apiKey>")
  .header("Content-Type", "application/json")
  .body("{\n  \"inputs\": [\n    {\n      \"type\": \"STRING\",\n      \"value\": \"Hello, world!\",\n      \"name\": \"var_1\"\n    },\n    {\n      \"type\": \"STRING\",\n      \"value\": \"Why hello, there!\",\n      \"name\": \"var_2\"\n    }\n  ],\n  \"label\": \"Scenario 1\",\n  \"id\": \"3ee58bf2-1e5c-415e-8b6c-02ca8b77f29d\"\n}")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.vellum.ai/v1/sandboxes/id/scenarios', [
  'body' => '{
  "inputs": [
    {
      "type": "STRING",
      "value": "Hello, world!",
      "name": "var_1"
    },
    {
      "type": "STRING",
      "value": "Why hello, there!",
      "name": "var_2"
    }
  ],
  "label": "Scenario 1",
  "id": "3ee58bf2-1e5c-415e-8b6c-02ca8b77f29d"
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

var client = new RestClient("https://api.vellum.ai/v1/sandboxes/id/scenarios");
var request = new RestRequest(Method.POST);
request.AddHeader("X-API-KEY", "<apiKey>");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"inputs\": [\n    {\n      \"type\": \"STRING\",\n      \"value\": \"Hello, world!\",\n      \"name\": \"var_1\"\n    },\n    {\n      \"type\": \"STRING\",\n      \"value\": \"Why hello, there!\",\n      \"name\": \"var_2\"\n    }\n  ],\n  \"label\": \"Scenario 1\",\n  \"id\": \"3ee58bf2-1e5c-415e-8b6c-02ca8b77f29d\"\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "X-API-KEY": "<apiKey>",
  "Content-Type": "application/json"
]
let parameters = [
  "inputs": [
    [
      "type": "STRING",
      "value": "Hello, world!",
      "name": "var_1"
    ],
    [
      "type": "STRING",
      "value": "Why hello, there!",
      "name": "var_2"
    ]
  ],
  "label": "Scenario 1",
  "id": "3ee58bf2-1e5c-415e-8b6c-02ca8b77f29d"
] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.vellum.ai/v1/sandboxes/id/scenarios")! as URL,
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