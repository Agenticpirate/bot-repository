> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Check Workflow Execution Status

GET https://predict.vellum.ai/v1/workflows/executions/{execution_id}/status

Checks if a workflow execution is currently executing (not fulfilled, not rejected, and has no end time).
Uses the ClickHouse Prime summary materialized view.

Reference: https://docs.vellum.ai/developers/client-sdk/workflows/check-execution-status

## Authentication

- `X-API-KEY` header (required) — API Key authentication via header

## Request

### Path parameters

- `execution_id` (string, required)

## Response

### 200

- `status` (enum, required) — * `INITIATED` - Initiated * `STREAMING` - Streaming * `FULFILLED` - Fulfilled * `REJECTED` - Rejected * `PENDING` - Pending
  - Allowed values: `INITIATED`, `STREAMING`, `FULFILLED`, `REJECTED`, `PENDING`
- `execution_id` (string, required)
- `outputs` (map from string to any, optional, nullable)
- `error` (object, optional, nullable)
  - `message` (string, optional, nullable)
  - `code` (enum, optional, nullable) — * `WORKFLOW_INITIALIZATION` - WORKFLOW_INITIALIZATION * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `WORKFLOW_TIMEOUT` - WORKFLOW_TIMEOUT * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `NODE_EXECUTION_COUNT_LIMIT_REACHED` - NODE_EXECUTION_COUNT_LIMIT_REACHED * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `NODE_EXECUTION` - NODE_EXECUTION * `NODE_CANCELLED` - NODE_CANCELLED * `NODE_TIMEOUT` - NODE_TIMEOUT * `LLM_PROVIDER` - LLM_PROVIDER * `INVALID_TEMPLATE` - INVALID_TEMPLATE * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR
    - Allowed values: `WORKFLOW_INITIALIZATION`, `WORKFLOW_CANCELLED`, `WORKFLOW_TIMEOUT`, `PROVIDER_CREDENTIALS_UNAVAILABLE`, `INTEGRATION_CREDENTIALS_UNAVAILABLE`, `NODE_EXECUTION_COUNT_LIMIT_REACHED`, `INTERNAL_SERVER_ERROR`, `NODE_EXECUTION`, `NODE_CANCELLED`, `NODE_TIMEOUT`, `LLM_PROVIDER`, `INVALID_TEMPLATE`, `INVALID_INPUTS`, `PROVIDER_QUOTA_EXCEEDED`, `USER_DEFINED_ERROR`
- `execution_detail_url` (string, optional, nullable)

## Errors

### 400 Bad Request Error

- `detail` (string, required)

### 404 Not Found Error

- `detail` (string, required)

### 500 Internal Server Error

- `detail` (string, required)

## Examples

**Response**

```json
{
  "status": "INITIATED",
  "execution_id": "string",
  "outputs": {},
  "error": {
    "message": "string",
    "code": "WORKFLOW_INITIALIZATION"
  },
  "execution_detail_url": "string"
}
```

**SDK Code**

```python
import requests

url = "https://predict.vellum.ai/v1/workflows/executions/execution_id/status"

headers = {"X-API-KEY": "<apiKey>"}

response = requests.get(url, headers=headers)

print(response.json())
```

```typescript
import { VellumClient } from "vellum-ai";

const client = new VellumClient({ apiKey: "YOUR_API_KEY", apiVersion: "YOUR_API_VERSION" });
await client.workflows.workflowExecutionStatus("execution_id");

```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://predict.vellum.ai/v1/workflows/executions/execution_id/status"

	req, _ := http.NewRequest("GET", url, nil)

	req.Header.Add("X-API-KEY", "<apiKey>")

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

url = URI("https://predict.vellum.ai/v1/workflows/executions/execution_id/status")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["X-API-KEY"] = '<apiKey>'

response = http.request(request)
puts response.read_body
```

```java
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;

HttpResponse<String> response = Unirest.get("https://predict.vellum.ai/v1/workflows/executions/execution_id/status")
  .header("X-API-KEY", "<apiKey>")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://predict.vellum.ai/v1/workflows/executions/execution_id/status', [
  'headers' => [
    'X-API-KEY' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
using RestSharp;

var client = new RestClient("https://predict.vellum.ai/v1/workflows/executions/execution_id/status");
var request = new RestRequest(Method.GET);
request.AddHeader("X-API-KEY", "<apiKey>");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["X-API-KEY": "<apiKey>"]

let request = NSMutableURLRequest(url: NSURL(string: "https://predict.vellum.ai/v1/workflows/executions/execution_id/status")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "GET"
request.allHTTPHeaderFields = headers

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