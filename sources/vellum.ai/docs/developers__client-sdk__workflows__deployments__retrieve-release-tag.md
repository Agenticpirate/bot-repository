> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Retrieve Workflow Deployment Release Tag

GET https://api.vellum.ai/v1/workflow-deployments/{id}/release-tags/{name}

Retrieve a Workflow Release Tag by tag name, associated with a specified Workflow Deployment.

Reference: https://docs.vellum.ai/developers/client-sdk/workflows/deployments/retrieve-release-tag

## Authentication

- `X-API-KEY` header (required) — API Key authentication via header

## Request

### Path parameters

- `id` (string, required) — Either the Workflow Deployment's ID or its unique name
- `name` (string, required) — The name of the Release Tag associated with this Workflow Deployment that you'd like to retrieve.

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

headers = {"X-API-KEY": "<apiKey>"}

response = requests.get(url, headers=headers)

print(response.json())
```

```typescript
import { VellumClient } from "vellum-ai";

const client = new VellumClient({ apiKey: "YOUR_API_KEY", apiVersion: "YOUR_API_VERSION" });
await client.workflowDeployments.retrieveWorkflowReleaseTag("id", "name");

```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.vellum.ai/v1/workflow-deployments/id/release-tags/name"

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

url = URI("https://api.vellum.ai/v1/workflow-deployments/id/release-tags/name")

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

HttpResponse<String> response = Unirest.get("https://api.vellum.ai/v1/workflow-deployments/id/release-tags/name")
  .header("X-API-KEY", "<apiKey>")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.vellum.ai/v1/workflow-deployments/id/release-tags/name', [
  'headers' => [
    'X-API-KEY' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
using RestSharp;

var client = new RestClient("https://api.vellum.ai/v1/workflow-deployments/id/release-tags/name");
var request = new RestRequest(Method.GET);
request.AddHeader("X-API-KEY", "<apiKey>");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["X-API-KEY": "<apiKey>"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.vellum.ai/v1/workflow-deployments/id/release-tags/name")! as URL,
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