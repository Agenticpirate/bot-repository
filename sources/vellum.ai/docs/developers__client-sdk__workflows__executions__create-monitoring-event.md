> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Create Monitoring Event

POST https://api.vellum.ai/monitoring/v1/events
Content-Type: application/json

Accept an event or list of events and publish them to ClickHouse for analytics processing.

Reference: https://docs.vellum.ai/developers/client-sdk/workflows/executions/create-monitoring-event

## Authentication

- `X-API-KEY` header (required) — API Key authentication via header

## Request

### Body (application/json)

This endpoint expects a list of object or object or object or object or object or object or object or object or object or object or object or object or object or object or object or object or object or object or object or object or object or object or object or object or object or object or object or object.

- `list of object or object or object or object or object or object or object or object or object or object or object or object or object or object or object or object or object or object or object or object or object or object or object or object or object or object or object or object`

## Response

### 201

- `count` (integer, required) — Number of events processed
- `success` (boolean, optional, default: true) — Indicates whether the event was published successfully.

## Errors

### 400 Bad Request Error

- `detail` (string, required) — Message informing the user of the error.

### 401 Unauthorized Error

- `detail` (string, required) — Message informing the user of the error.

### 403 Forbidden Error

- `detail` (string, required) — Message informing the user of the error.

### 429 Too Many Requests Error

- `detail` (string, required) — Message informing the user of the error.

## Examples

**Request**

```json
[
  {
    "name": "node.execution.initiated",
    "body": {
      "node_definition": {
        "name": "string",
        "module": [
          "string"
        ],
        "id": "string"
      },
      "inputs": {}
    },
    "id": "string",
    "timestamp": "2024-01-15T09:30:00Z",
    "trace_id": "string",
    "span_id": "string"
  }
]
```

**Response**

```json
{
  "count": 1,
  "success": true
}
```

**SDK Code**

```python
import requests

url = "https://api.vellum.ai/monitoring/v1/events"

payload = [
    {
        "name": "node.execution.initiated",
        "body": {
            "node_definition": {
                "name": "string",
                "module": ["string"],
                "id": "string"
            },
            "inputs": {}
        },
        "id": "string",
        "timestamp": "2024-01-15T09:30:00Z",
        "trace_id": "string",
        "span_id": "string"
    }
]
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
await client.events.create([{
        name: "node.execution.initiated",
        body: {
            nodeDefinition: {
                name: "name",
                module: ["module", "module"],
                id: "id"
            },
            inputs: {
                "inputs": {
                    "key": "value"
                }
            }
        },
        id: "id",
        timestamp: "2024-01-15T09:30:00Z",
        traceId: "trace_id",
        spanId: "span_id"
    }, {
        name: "node.execution.initiated",
        body: {
            nodeDefinition: {
                name: "name",
                module: ["module", "module"],
                id: "id"
            },
            inputs: {
                "inputs": {
                    "key": "value"
                }
            }
        },
        id: "id",
        timestamp: "2024-01-15T09:30:00Z",
        traceId: "trace_id",
        spanId: "span_id"
    }]);

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

	url := "https://api.vellum.ai/monitoring/v1/events"

	payload := strings.NewReader("[\n  {\n    \"name\": \"node.execution.initiated\",\n    \"body\": {\n      \"node_definition\": {\n        \"name\": \"string\",\n        \"module\": [\n          \"string\"\n        ],\n        \"id\": \"string\"\n      },\n      \"inputs\": {}\n    },\n    \"id\": \"string\",\n    \"timestamp\": \"2024-01-15T09:30:00Z\",\n    \"trace_id\": \"string\",\n    \"span_id\": \"string\"\n  }\n]")

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

url = URI("https://api.vellum.ai/monitoring/v1/events")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["X-API-KEY"] = '<apiKey>'
request["Content-Type"] = 'application/json'
request.body = "[\n  {\n    \"name\": \"node.execution.initiated\",\n    \"body\": {\n      \"node_definition\": {\n        \"name\": \"string\",\n        \"module\": [\n          \"string\"\n        ],\n        \"id\": \"string\"\n      },\n      \"inputs\": {}\n    },\n    \"id\": \"string\",\n    \"timestamp\": \"2024-01-15T09:30:00Z\",\n    \"trace_id\": \"string\",\n    \"span_id\": \"string\"\n  }\n]"

response = http.request(request)
puts response.read_body
```

```java
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;

HttpResponse<String> response = Unirest.post("https://api.vellum.ai/monitoring/v1/events")
  .header("X-API-KEY", "<apiKey>")
  .header("Content-Type", "application/json")
  .body("[\n  {\n    \"name\": \"node.execution.initiated\",\n    \"body\": {\n      \"node_definition\": {\n        \"name\": \"string\",\n        \"module\": [\n          \"string\"\n        ],\n        \"id\": \"string\"\n      },\n      \"inputs\": {}\n    },\n    \"id\": \"string\",\n    \"timestamp\": \"2024-01-15T09:30:00Z\",\n    \"trace_id\": \"string\",\n    \"span_id\": \"string\"\n  }\n]")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.vellum.ai/monitoring/v1/events', [
  'body' => '[
  {
    "name": "node.execution.initiated",
    "body": {
      "node_definition": {
        "name": "string",
        "module": [
          "string"
        ],
        "id": "string"
      },
      "inputs": {}
    },
    "id": "string",
    "timestamp": "2024-01-15T09:30:00Z",
    "trace_id": "string",
    "span_id": "string"
  }
]',
  'headers' => [
    'Content-Type' => 'application/json',
    'X-API-KEY' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
using RestSharp;

var client = new RestClient("https://api.vellum.ai/monitoring/v1/events");
var request = new RestRequest(Method.POST);
request.AddHeader("X-API-KEY", "<apiKey>");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "[\n  {\n    \"name\": \"node.execution.initiated\",\n    \"body\": {\n      \"node_definition\": {\n        \"name\": \"string\",\n        \"module\": [\n          \"string\"\n        ],\n        \"id\": \"string\"\n      },\n      \"inputs\": {}\n    },\n    \"id\": \"string\",\n    \"timestamp\": \"2024-01-15T09:30:00Z\",\n    \"trace_id\": \"string\",\n    \"span_id\": \"string\"\n  }\n]", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "X-API-KEY": "<apiKey>",
  "Content-Type": "application/json"
]
let parameters = [
  [
    "name": "node.execution.initiated",
    "body": [
      "node_definition": [
        "name": "string",
        "module": ["string"],
        "id": "string"
      ],
      "inputs": []
    ],
    "id": "string",
    "timestamp": "2024-01-15T09:30:00Z",
    "trace_id": "string",
    "span_id": "string"
  ]
] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.vellum.ai/monitoring/v1/events")! as URL,
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