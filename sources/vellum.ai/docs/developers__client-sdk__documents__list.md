> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# List Documents

GET https://api.vellum.ai/v1/documents

Used to list documents. Optionally filter on supported fields.

Reference: https://docs.vellum.ai/developers/client-sdk/documents/list

## Authentication

- `X-API-KEY` header (required) — API Key authentication via header

## Request

### Query parameters

- `document_index_id` (string, optional) — Filter down to only those documents that are included in the specified index. You may provide either the Vellum-generated ID or the unique name of the index specified upon initial creation.
- `limit` (integer, optional) — Number of results to return per page.
- `offset` (integer, optional) — The initial index from which to return the results.
- `ordering` (string, optional) — Which field to use when ordering the results.
- `search` (string, optional) — A search term.

## Response

### 200

- `count` (integer, optional)
- `next` (string, optional, nullable)
- `previous` (string, optional, nullable)
- `results` (list of object, optional)
  - `id` (string, required) — Vellum-generated ID that uniquely identifies this document.
  - `last_uploaded_at` (string, required) — A timestamp representing when this document was most recently uploaded.
  - `label` (string, required) — Human-friendly name for this document.
  - `processing_state` (enum, required) — * `QUEUED` - Queued * `PROCESSING` - Processing * `PROCESSED` - Processed * `FAILED` - Failed * `UNKNOWN` - Unknown
    - Allowed values: `QUEUED`, `PROCESSING`, `PROCESSED`, `FAILED`, `UNKNOWN`
  - `document_to_document_indexes` (list of object, required)
    - `id` (string, required) — Vellum-generated ID that uniquely identifies this link.
    - `environment_document_index_id` (string, required) — Vellum-generated ID that uniquely identifies the environment index this document is included in.
    - `document_index_id` (string, required, nullable) — Vellum-generated ID that uniquely identifies the index this document is included in.
    - `processing_state` (string, required, nullable)
    - `indexing_state` (enum, optional) — An enum value representing where this document is along its indexing lifecycle for this index. * `AWAITING_PROCESSING` - Awaiting Processing * `QUEUED` - Queued * `INDEXING` - Indexing * `INDEXED` - Indexed * `FAILED` - Failed
      - Allowed values: `AWAITING_PROCESSING`, `QUEUED`, `INDEXING`, `INDEXED`, `FAILED`
  - `external_id` (string, optional, nullable) — The external ID that was originally provided when uploading the document.
  - `processing_failure_reason` (enum, optional, nullable) — An enum value representing why the document could not be processed. Is null unless processing_state is FAILED. * `EXCEEDED_CHARACTER_LIMIT` - Exceeded Character Limit * `INVALID_FILE` - Invalid File * `INVALID_CREDENTIALS` - Invalid Credentials
    - Allowed values: `EXCEEDED_CHARACTER_LIMIT`, `INVALID_FILE`, `INVALID_CREDENTIALS`
  - `status` (enum, optional) — The document's current status. * `ACTIVE` - Active
    - Allowed values: `ACTIVE`
  - `keywords` (list of string, optional) — A list of keywords associated with this document. Originally provided when uploading the document.
  - `metadata` (map from string to any, optional, nullable) — A previously supplied JSON object containing metadata that can be filtered on when searching.

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
      "last_uploaded_at": "2024-01-15T09:30:00Z",
      "label": "string",
      "processing_state": "QUEUED",
      "document_to_document_indexes": [
        {
          "id": "string",
          "environment_document_index_id": "string",
          "document_index_id": "string",
          "processing_state": "string",
          "indexing_state": "AWAITING_PROCESSING"
        }
      ],
      "external_id": "string",
      "processing_failure_reason": "EXCEEDED_CHARACTER_LIMIT",
      "status": "ACTIVE",
      "keywords": [
        "string"
      ],
      "metadata": {}
    }
  ]
}
```

**SDK Code**

```python
import requests

url = "https://api.vellum.ai/v1/documents"

headers = {"X-API-KEY": "<apiKey>"}

response = requests.get(url, headers=headers)

print(response.json())
```

```typescript
import { VellumClient } from "vellum-ai";

const client = new VellumClient({ apiKey: "YOUR_API_KEY", apiVersion: "YOUR_API_VERSION" });
await client.documents.list();

```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.vellum.ai/v1/documents"

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

url = URI("https://api.vellum.ai/v1/documents")

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

HttpResponse<String> response = Unirest.get("https://api.vellum.ai/v1/documents")
  .header("X-API-KEY", "<apiKey>")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.vellum.ai/v1/documents', [
  'headers' => [
    'X-API-KEY' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
using RestSharp;

var client = new RestClient("https://api.vellum.ai/v1/documents");
var request = new RestRequest(Method.GET);
request.AddHeader("X-API-KEY", "<apiKey>");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["X-API-KEY": "<apiKey>"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.vellum.ai/v1/documents")! as URL,
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