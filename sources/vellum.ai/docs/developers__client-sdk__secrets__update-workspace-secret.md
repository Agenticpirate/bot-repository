> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Update Workspace Secret

PATCH https://api.vellum.ai/v1/workspace-secrets/{id}
Content-Type: application/json

Used to update a Workspace Secret given its ID or name.

Reference: https://docs.vellum.ai/developers/client-sdk/secrets/update-workspace-secret

## Authentication

- `X-API-KEY` header (required) — API Key authentication via header

## Request

### Path parameters

- `id` (string, required) — Either the Workspace Secret's ID or its unique name

### Body (application/json)

This endpoint expects an object.

- `label` (string, optional)
- `value` (string, optional)

## Response

### 200

- `id` (string, required)
- `modified` (string, required)
- `name` (string, required)
- `label` (string, required)
- `secret_type` (enum, required) — * `USER_DEFINED` - User Defined * `HMAC` - Hmac * `INTERNAL_API_KEY` - Internal Api Key * `EXTERNALLY_PROVISIONED` - Externally Provisioned
  - Allowed values: `USER_DEFINED`, `HMAC`, `INTERNAL_API_KEY`, `EXTERNALLY_PROVISIONED`

## Examples

**Request**

```json
{}
```

**Response**

```json
{
  "id": "string",
  "modified": "2024-01-15T09:30:00Z",
  "name": "string",
  "label": "string",
  "secret_type": "USER_DEFINED"
}
```

**SDK Code**

```python
import requests

url = "https://api.vellum.ai/v1/workspace-secrets/id"

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
await client.workspaceSecrets.partialUpdate("id");

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

	url := "https://api.vellum.ai/v1/workspace-secrets/id"

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

url = URI("https://api.vellum.ai/v1/workspace-secrets/id")

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

HttpResponse<String> response = Unirest.patch("https://api.vellum.ai/v1/workspace-secrets/id")
  .header("X-API-KEY", "<apiKey>")
  .header("Content-Type", "application/json")
  .body("{}")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('PATCH', 'https://api.vellum.ai/v1/workspace-secrets/id', [
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

var client = new RestClient("https://api.vellum.ai/v1/workspace-secrets/id");
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

let request = NSMutableURLRequest(url: NSURL(string: "https://api.vellum.ai/v1/workspace-secrets/id")! as URL,
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