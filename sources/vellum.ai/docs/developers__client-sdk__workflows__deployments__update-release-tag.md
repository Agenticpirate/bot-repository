> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Update Workflow Deployment Release Tag

PATCH https://api.vellum.ai/v1/workflow-deployments/{id}/release-tags/{name}
Content-Type: application/json

Updates an existing Release Tag associated with the specified Workflow Deployment.

Reference: https://docs.vellum.ai/developers/client-sdk/workflows/deployments/update-release-tag

## Authentication

- `X-API-KEY` header (required) — API Key authentication via header

## Request

### Path parameters

- `id` (string, required) — Either the Workflow Deployment's ID or its unique name
- `name` (string, required) — The name of the Release Tag associated with this Workflow Deployment that you'd like to update.

### Body (application/json)

This endpoint expects an object.

- `history_item_id` (string, optional) — The ID of the Workflow Deployment History Item to tag

## Response

### 200

- `name` (string, required) — The name of the Release Tag
- `source` (enum, required) — The source of how the Release Tag was originally created * `SYSTEM` - System * `USER` - User
  - Allowed values: `SYSTEM`, `USER`
- `history_item` (object, required) — Deprecated. Reference the `release` field instead.
  - `id` (string, required)
  - `timestamp` (string, required)
- `release` (object, required) — The Release that this Release Tag points to.
  - `id` (string, required)
  - `timestamp` (string, required)

## Examples

**Request**

```json
{}
```

**Response**

```json
{
  "name": "string",
  "source": "SYSTEM",
  "history_item": {
    "id": "string",
    "timestamp": "2024-01-15T09:30:00Z"
  },
  "release": {
    "id": "string",
    "timestamp": "2024-01-15T09:30:00Z"
  }
}
```

**SDK Code**

```python
import requests

url = "https://api.vellum.ai/v1/workflow-deployments/id/release-tags/name"

payload = {}
headers = {
    "X-API-KEY": "<apiKey>",
    "Content-Type": "application/json"
}

response = requests.patch(url, json=payload, headers=headers)

print(response.json())
```

```typescript
import { VellumClient } from "vellum-ai";

const client = new VellumClient({ apiKey: "YOUR_API_KEY", apiVersion: "YOUR_API_VERSION" });
await client.workflowDeployments.updateWorkflowReleaseTag("id", "name");

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

	url := "https://api.vellum.ai/v1/workflow-deployments/id/release-tags/name"

	payload := strings.NewReader("{}")

	req, _ := http.NewRequest("PATCH", url, payload)

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

url = URI("https://api.vellum.ai/v1/workflow-deployments/id/release-tags/name")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Patch.new(url)
request["X-API-KEY"] = '<apiKey>'
request["Content-Type"] = 'application/json'
request.body = "{}"

response = http.request(request)
puts response.read_body
```

```java
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;

HttpResponse<String> response = Unirest.patch("https://api.vellum.ai/v1/workflow-deployments/id/release-tags/name")
  .header("X-API-KEY", "<apiKey>")
  .header("Content-Type", "application/json")
  .body("{}")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('PATCH', 'https://api.vellum.ai/v1/workflow-deployments/id/release-tags/name', [
  'body' => '{}',
  'headers' => [
    'Content-Type' => 'application/json',
    'X-API-KEY' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
using RestSharp;

var client = new RestClient("https://api.vellum.ai/v1/workflow-deployments/id/release-tags/name");
var request = new RestRequest(Method.PATCH);
request.AddHeader("X-API-KEY", "<apiKey>");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "X-API-KEY": "<apiKey>",
  "Content-Type": "application/json"
]
let parameters = [] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.vellum.ai/v1/workflow-deployments/id/release-tags/name")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "PATCH"
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