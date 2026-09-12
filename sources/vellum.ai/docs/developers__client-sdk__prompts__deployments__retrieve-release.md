> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Retrieve Prompt Deployment Release

GET https://api.vellum.ai/v1/deployments/{id}/releases/{release_id_or_release_tag}

Retrieve a specific Prompt Deployment Release by either its UUID or the name of a Release Tag that points to it.

Reference: https://docs.vellum.ai/developers/client-sdk/prompts/deployments/retrieve-release

## Authentication

- `X-API-KEY` header (required) — API Key authentication via header

## Request

### Path parameters

- `id` (string, required) — Either the Prompt Deployment's ID or its unique name
- `release_id_or_release_tag` (string, required) — Either the UUID of Prompt Deployment Release you'd like to retrieve, or the name of a Release Tag that's pointing to the Prompt Deployment Release you'd like to retrieve.

## Response

### 200

- `id` (string, required)
- `created` (string, required)
- `environment` (object, required)
  - `id` (string, required)
  - `name` (string, required)
  - `label` (string, required)
- `created_by` (object, required, nullable)
  - `id` (string, required)
  - `email` (string, required)
  - `full_name` (string, optional)
- `prompt_version` (object, required)
  - `id` (string, required)
  - `ml_model_to_workspace_id` (string, required)
  - `build_config` (object, required) — Configuration used to build this prompt version.
    - SANDBOX
      - `source` (enum, required)
        - Allowed values: `SANDBOX`
      - `sandbox_id` (string, required)
      - `sandbox_snapshot_id` (string, required)
      - `prompt_id` (string, required)
- `deployment` (object, required)
  - `id` (string, required)
  - `name` (string, required)
- `release_tags` (list of object, required)
  - `name` (string, required) — The name of the Release Tag
  - `source` (enum, required) — The source of how the Release Tag was originally created * `SYSTEM` - System * `USER` - User
    - Allowed values: `SYSTEM`, `USER`
- `reviews` (list of object, required)
  - `id` (string, required)
  - `created` (string, required)
  - `reviewer` (object, required)
    - `id` (string, required)
    - `full_name` (string, optional)
  - `state` (enum, required) — * `APPROVED` - Approved * `CHANGES_REQUESTED` - Changes Requested * `COMMENTED` - Commented
    - Allowed values: `APPROVED`, `CHANGES_REQUESTED`, `COMMENTED`
- `description` (string, optional)

## Examples

**Response**

```json
{
  "id": "string",
  "created": "2024-01-15T09:30:00Z",
  "environment": {
    "id": "string",
    "name": "string",
    "label": "string"
  },
  "created_by": {
    "id": "string",
    "email": "string",
    "full_name": "string"
  },
  "prompt_version": {
    "id": "string",
    "ml_model_to_workspace_id": "string",
    "build_config": {
      "source": "SANDBOX",
      "sandbox_id": "string",
      "sandbox_snapshot_id": "string",
      "prompt_id": "string"
    }
  },
  "deployment": {
    "id": "string",
    "name": "string"
  },
  "release_tags": [
    {
      "name": "string",
      "source": "SYSTEM"
    }
  ],
  "reviews": [
    {
      "id": "string",
      "created": "2024-01-15T09:30:00Z",
      "reviewer": {
        "id": "string",
        "full_name": "string"
      },
      "state": "APPROVED"
    }
  ],
  "description": "string"
}
```

**SDK Code**

```python
import requests

url = "https://api.vellum.ai/v1/deployments/id/releases/release_id_or_release_tag"

headers = {"X-API-KEY": "<apiKey>"}

response = requests.get(url, headers=headers)

print(response.json())
```

```typescript
import { VellumClient } from "vellum-ai";

const client = new VellumClient({ apiKey: "YOUR_API_KEY", apiVersion: "YOUR_API_VERSION" });
await client.deployments.retrievePromptDeploymentRelease("id", "release_id_or_release_tag");

```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.vellum.ai/v1/deployments/id/releases/release_id_or_release_tag"

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

url = URI("https://api.vellum.ai/v1/deployments/id/releases/release_id_or_release_tag")

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

HttpResponse<String> response = Unirest.get("https://api.vellum.ai/v1/deployments/id/releases/release_id_or_release_tag")
  .header("X-API-KEY", "<apiKey>")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.vellum.ai/v1/deployments/id/releases/release_id_or_release_tag', [
  'headers' => [
    'X-API-KEY' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
using RestSharp;

var client = new RestClient("https://api.vellum.ai/v1/deployments/id/releases/release_id_or_release_tag");
var request = new RestRequest(Method.GET);
request.AddHeader("X-API-KEY", "<apiKey>");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["X-API-KEY": "<apiKey>"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.vellum.ai/v1/deployments/id/releases/release_id_or_release_tag")! as URL,
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