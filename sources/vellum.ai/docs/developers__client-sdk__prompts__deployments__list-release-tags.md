> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# List Prompt Deployment Release Tags

GET https://api.vellum.ai/v1/deployments/{id}/release-tags

List Release Tags associated with the specified Prompt Deployment

Reference: https://docs.vellum.ai/developers/client-sdk/prompts/deployments/list-release-tags

## Authentication

- `X-API-KEY` header (required) — API Key authentication via header

## Request

### Path parameters

- `id` (string, required) — Either the Prompt Deployment's ID or its unique name

### Query parameters

- `limit` (integer, optional) — Number of results to return per page.
- `offset` (integer, optional) — The initial index from which to return the results.
- `ordering` (string, optional) — Which field to use when ordering the results.
- `source` (enum, optional)
  - Allowed values: `SYSTEM`, `USER`

## Response

### 200

- `count` (integer, optional)
- `next` (string, optional, nullable)
- `previous` (string, optional, nullable)
- `results` (list of object, optional)
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
  "count": 123,
  "next": "http://api.example.org/accounts/?offset=400&limit=100",
  "previous": "http://api.example.org/accounts/?offset=200&limit=100",
  "results": [
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
  ]
}
```

**SDK Code**

```python
import requests

url = "https://api.vellum.ai/v1/deployments/id/release-tags"

headers = {"X-API-KEY": "<apiKey>"}

response = requests.get(url, headers=headers)

print(response.json())
```

```typescript
import { VellumClient } from "vellum-ai";

const client = new VellumClient({ apiKey: "YOUR_API_KEY", apiVersion: "YOUR_API_VERSION" });
await client.deployments.listDeploymentReleaseTags("id");

```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.vellum.ai/v1/deployments/id/release-tags"

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

url = URI("https://api.vellum.ai/v1/deployments/id/release-tags")

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

HttpResponse<String> response = Unirest.get("https://api.vellum.ai/v1/deployments/id/release-tags")
  .header("X-API-KEY", "<apiKey>")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.vellum.ai/v1/deployments/id/release-tags', [
  'headers' => [
    'X-API-KEY' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
using RestSharp;

var client = new RestClient("https://api.vellum.ai/v1/deployments/id/release-tags");
var request = new RestRequest(Method.GET);
request.AddHeader("X-API-KEY", "<apiKey>");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["X-API-KEY": "<apiKey>"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.vellum.ai/v1/deployments/id/release-tags")! as URL,
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