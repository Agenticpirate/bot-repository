> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# List Folder Entities

GET https://api.vellum.ai/v1/folder-entities

List all folder entities within a specified folder.

Reference: https://docs.vellum.ai/developers/client-sdk/folders/list-folder-entities

## Authentication

- `X-API-KEY` header (required) — API Key authentication via header

## Request

### Query parameters

- `entity_status` (enum, optional) — Filter down to only those objects whose entities have a status matching the status specified. * `ACTIVE` - Active * `ARCHIVED` - Archived * `PENDING_DELETION` - Pending Deletion
  - Allowed values: `ACTIVE`, `ARCHIVED`, `PENDING_DELETION`
- `limit` (integer, optional) — Number of results to return per page.
- `offset` (integer, optional) — The initial index from which to return the results.
- `ordering` (string, optional) — Which field to use when ordering the results.
- `parent_folder_id` (string, required) — Filter down to only those entities whose parent folder has the specified ID. To filter by an entity's parent folder, provide the ID of the parent folder. To filter by the root directory, provide a string representing the entity type of the root directory. Supported root directories include: - PROMPT_SANDBOX - WORKFLOW_SANDBOX - DOCUMENT_INDEX - TEST_SUITE

## Response

### 200

- `count` (integer, optional)
- `next` (string, optional, nullable)
- `previous` (string, optional, nullable)
- `results` (list of object or object or object or object or object or object, optional)
  - FOLDER
    - `id` (string, required)
    - `type` (enum, required)
      - Allowed values: `FOLDER`
    - `data` (object, required)
      - `id` (string, required)
      - `label` (string, required)
      - `created` (string, required)
      - `modified` (string, required)
      - `has_contents` (boolean, required)
  - PROMPT_SANDBOX
    - `id` (string, required)
    - `type` (enum, required)
      - Allowed values: `PROMPT_SANDBOX`
    - `data` (object, required)
      - `id` (string, required)
      - `label` (string, required)
      - `created` (string, required)
      - `modified` (string, required)
      - `status` (enum, required) — * `ACTIVE` - Active * `ARCHIVED` - Archived * `PENDING_DELETION` - Pending Deletion
        - Allowed values: `ACTIVE`, `ARCHIVED`, `PENDING_DELETION`
      - `description` (string, optional, nullable)
      - `last_deployed_on` (string, optional, nullable)
  - WORKFLOW_SANDBOX
    - `id` (string, required)
    - `type` (enum, required)
      - Allowed values: `WORKFLOW_SANDBOX`
    - `data` (object, required)
      - `id` (string, required)
      - `label` (string, required)
      - `created` (string, required)
      - `modified` (string, required)
      - `status` (enum, required) — * `ACTIVE` - Active * `ARCHIVED` - Archived * `PENDING_DELETION` - Pending Deletion
        - Allowed values: `ACTIVE`, `ARCHIVED`, `PENDING_DELETION`
      - `display_data` (object, required, nullable) — Information used to display this Workflow Sandbox.
        - `icon` (object, optional, nullable) — The icon associated with this Workflow Sandbox.
          - `src` (string, optional, nullable)
          - `color` (string, optional, nullable)
      - `description` (string, optional, nullable)
      - `last_deployed_on` (string, optional, nullable)
  - DOCUMENT_INDEX
    - `id` (string, required)
    - `type` (enum, required)
      - Allowed values: `DOCUMENT_INDEX`
    - `data` (object, required)
      - `id` (string, required)
      - `label` (string, required)
      - `created` (string, required)
      - `modified` (string, required)
      - `status` (enum, required) — * `ACTIVE` - Active * `ARCHIVED` - Archived * `PENDING_DELETION` - Pending Deletion
        - Allowed values: `ACTIVE`, `ARCHIVED`, `PENDING_DELETION`
      - `indexing_config` (object, required)
        - `vectorizer` (object or object or object or object or object or object or object or object or object or object or object or object, required)
          - text-embedding-3-small
            - `config` (object, required) — Configuration for using an OpenAI vectorizer.
            - `model_name` (enum, required)
          - text-embedding-3-large
            - `config` (object, required) — Configuration for using an OpenAI vectorizer.
            - `model_name` (enum, required)
          - text-embedding-ada-002
            - `config` (object, required) — Configuration for using an OpenAI vectorizer.
            - `model_name` (enum, required)
          - intfloat/multilingual-e5-large
            - `model_name` (enum, required)
            - `config` (map from string to any, optional, nullable)
          - sentence-transformers/multi-qa-mpnet-base-cos-v1
            - `model_name` (enum, required)
            - `config` (map from string to any, optional, nullable)
          - sentence-transformers/multi-qa-mpnet-base-dot-v1
            - `model_name` (enum, required)
            - `config` (map from string to any, optional, nullable)
          - hkunlp/instructor-xl
            - `model_name` (enum, required)
            - `config` (object, required) — Configuration for using an Instructor vectorizer.
          - text-embedding-004
            - `model_name` (enum, required)
            - `config` (object, required)
          - text-multilingual-embedding-002
            - `model_name` (enum, required)
            - `config` (object, required)
          - gemini-embedding-001
            - `model_name` (enum, required)
            - `config` (object, required)
          - BAAI/bge-small-en-v1.5
            - `model_name` (enum, required)
          - private-vectorizer
            - `model_name` (enum, required)
        - `chunking` (object or object or object or object, optional, nullable)
          - reducto-chunker
            - `chunker_name` (enum, required)
            - `chunker_config` (object, optional) — Configuration for Reducto chunking
          - sentence-chunker
            - `chunker_name` (enum, required)
            - `chunker_config` (object, optional) — Configuration for sentence chunking
          - token-overlapping-window-chunker
            - `chunker_name` (enum, required)
            - `chunker_config` (object, optional) — Configuration for token overlapping window chunking
          - delimiter-chunker
            - `chunker_name` (enum, required)
            - `chunker_config` (object, optional)
  - TEST_SUITE
    - `id` (string, required)
    - `type` (enum, required)
      - Allowed values: `TEST_SUITE`
    - `data` (object, required)
      - `id` (string, required)
      - `label` (string, required)
      - `created` (string, required)
      - `modified` (string, required)
      - `status` (enum, required) — * `ACTIVE` - Active * `ARCHIVED` - Archived * `PENDING_DELETION` - Pending Deletion
        - Allowed values: `ACTIVE`, `ARCHIVED`, `PENDING_DELETION`
  - DATASET
    - `id` (string, required)
    - `type` (enum, required)
      - Allowed values: `DATASET`
    - `data` (object, required)
      - `id` (string, required)
      - `label` (string, required)
      - `name` (string, required)
      - `created` (string, required)
      - `modified` (string, required)
      - `description` (string, optional, nullable)

## Examples

**Response**

```json
{
  "count": 123,
  "next": "http://api.example.org/accounts/?offset=400&limit=100",
  "previous": "http://api.example.org/accounts/?offset=200&limit=100",
  "results": [
    {
      "id": "string",
      "type": "FOLDER",
      "data": {
        "id": "string",
        "label": "string",
        "created": "2024-01-15T09:30:00Z",
        "modified": "2024-01-15T09:30:00Z",
        "has_contents": true
      }
    }
  ]
}
```

**SDK Code**

```python
import requests

url = "https://api.vellum.ai/v1/folder-entities"

querystring = {"parent_folder_id":"parent_folder_id"}

headers = {"X-API-KEY": "<apiKey>"}

response = requests.get(url, headers=headers, params=querystring)

print(response.json())
```

```typescript
import { VellumClient } from "vellum-ai";

const client = new VellumClient({ apiKey: "YOUR_API_KEY", apiVersion: "YOUR_API_VERSION" });
await client.folderEntities.list({
    parentFolderId: "parent_folder_id"
});

```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.vellum.ai/v1/folder-entities?parent_folder_id=parent_folder_id"

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

url = URI("https://api.vellum.ai/v1/folder-entities?parent_folder_id=parent_folder_id")

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

HttpResponse<String> response = Unirest.get("https://api.vellum.ai/v1/folder-entities?parent_folder_id=parent_folder_id")
  .header("X-API-KEY", "<apiKey>")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.vellum.ai/v1/folder-entities?parent_folder_id=parent_folder_id', [
  'headers' => [
    'X-API-KEY' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
using RestSharp;

var client = new RestClient("https://api.vellum.ai/v1/folder-entities?parent_folder_id=parent_folder_id");
var request = new RestRequest(Method.GET);
request.AddHeader("X-API-KEY", "<apiKey>");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["X-API-KEY": "<apiKey>"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.vellum.ai/v1/folder-entities?parent_folder_id=parent_folder_id")! as URL,
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