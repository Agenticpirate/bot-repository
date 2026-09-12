> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Update Document

PATCH https://api.vellum.ai/v1/documents/{id}
Content-Type: multipart/form-data

Update a Document, keying off of either its Vellum-generated ID or its external ID. Particularly useful for updating its metadata.

Reference: https://docs.vellum.ai/developers/client-sdk/documents/update

## Authentication

- `X-API-KEY` header (required) — API Key authentication via header

## Request

### Path parameters

- `id` (string, required)

### Body (multipart/form-data)

This endpoint expects a multipart form.

- `label` (string, optional) — A human-readable label for the document. Defaults to the originally uploaded file's file name.
- `status` (enum, optional) — The current status of the document * `ACTIVE` - Active
- `keywords` (list of string, optional) — A list of keywords that'll be associated with the document. Used as part of keyword search.
- `metadata` (map from string to any, optional) — A JSON object containing any metadata associated with the document that you'd like to filter upon later.

## Response

### 200

- `id` (string, required)
- `last_uploaded_at` (string, required)
- `label` (string, required) — A human-readable label for the document. Defaults to the originally uploaded file's file name.
- `processing_state` (enum, required) — * `QUEUED` - Queued * `PROCESSING` - Processing * `PROCESSED` - Processed * `FAILED` - Failed * `UNKNOWN` - Unknown
  - Allowed values: `QUEUED`, `PROCESSING`, `PROCESSED`, `FAILED`, `UNKNOWN`
- `original_file_url` (string, required, nullable)
- `document_to_document_indexes` (list of object, required)
  - `id` (string, required) — Vellum-generated ID that uniquely identifies this link.
  - `environment_document_index_id` (string, required) — Vellum-generated ID that uniquely identifies the environment index this document is included in.
  - `document_index_id` (string, required, nullable) — Vellum-generated ID that uniquely identifies the index this document is included in.
  - `extracted_text_file_url` (string, required, nullable)
  - `processing_state` (string, required, nullable)
  - `indexing_state` (enum, optional) — An enum value representing where this document is along its indexing lifecycle for this index. * `AWAITING_PROCESSING` - Awaiting Processing * `QUEUED` - Queued * `INDEXING` - Indexing * `INDEXED` - Indexed * `FAILED` - Failed
    - Allowed values: `AWAITING_PROCESSING`, `QUEUED`, `INDEXING`, `INDEXED`, `FAILED`
- `external_id` (string, optional, nullable) — The unique id of this document as it exists in the user's system.
- `status` (enum, optional) — The current status of the document * `ACTIVE` - Active
  - Allowed values: `ACTIVE`
- `keywords` (list of string, optional) — A list of keywords that'll be associated with the document. Used as part of keyword search.
- `metadata` (map from string to any, optional, nullable) — A previously supplied JSON object containing metadata that can be filtered on when searching.

## Examples

**Request**

```json
{}
```

**Response**

```json
{
  "id": "string",
  "last_uploaded_at": "2024-01-15T09:30:00Z",
  "label": "string",
  "processing_state": "QUEUED",
  "original_file_url": "string",
  "document_to_document_indexes": [
    {
      "id": "string",
      "environment_document_index_id": "string",
      "document_index_id": "string",
      "extracted_text_file_url": "string",
      "processing_state": "string",
      "indexing_state": "AWAITING_PROCESSING"
    }
  ],
  "external_id": "string",
  "status": "ACTIVE",
  "keywords": [
    "string"
  ],
  "metadata": {}
}
```

**SDK Code**

```python
import requests

url = "https://api.vellum.ai/v1/documents/id"

payload = "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"label\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"status\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"keywords\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"metadata\"\r\n\r\n\r\n-----011000010111000001101001--\r\n"
headers = {
    "X-API-KEY": "<apiKey>",
    "Content-Type": "multipart/form-data; boundary=---011000010111000001101001"
}

response = requests.patch(url, data=payload, headers=headers)

print(response.json())
```

```typescript
import { VellumClient } from "vellum-ai";

const client = new VellumClient({ apiKey: "YOUR_API_KEY", apiVersion: "YOUR_API_VERSION" });
await client.documents.partialUpdate("id");

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

	url := "https://api.vellum.ai/v1/documents/id"

	payload := strings.NewReader("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"label\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"status\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"keywords\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"metadata\"\r\n\r\n\r\n-----011000010111000001101001--\r\n")

	req, _ := http.NewRequest("PATCH", url, payload)

	req.Header.Add("X-API-KEY", "<apiKey>")
	req.Header.Add("Content-Type", "multipart/form-data; boundary=---011000010111000001101001")

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

url = URI("https://api.vellum.ai/v1/documents/id")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Patch.new(url)
request["X-API-KEY"] = '<apiKey>'
request["Content-Type"] = 'multipart/form-data; boundary=---011000010111000001101001'
request.body = "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"label\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"status\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"keywords\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"metadata\"\r\n\r\n\r\n-----011000010111000001101001--\r\n"

response = http.request(request)
puts response.read_body
```

```java
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;

HttpResponse<String> response = Unirest.patch("https://api.vellum.ai/v1/documents/id")
  .header("X-API-KEY", "<apiKey>")
  .header("Content-Type", "multipart/form-data; boundary=---011000010111000001101001")
  .body("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"label\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"status\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"keywords\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"metadata\"\r\n\r\n\r\n-----011000010111000001101001--\r\n")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('PATCH', 'https://api.vellum.ai/v1/documents/id', [
  'headers' => [
    'Content-Type' => 'multipart/form-data; boundary=---011000010111000001101001',
    'X-API-KEY' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
using RestSharp;

var client = new RestClient("https://api.vellum.ai/v1/documents/id");
var request = new RestRequest(Method.PATCH);
request.AddHeader("X-API-KEY", "<apiKey>");
request.AddHeader("Content-Type", "multipart/form-data; boundary=---011000010111000001101001");
request.AddParameter("multipart/form-data; boundary=---011000010111000001101001", "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"label\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"status\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"keywords\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"metadata\"\r\n\r\n\r\n-----011000010111000001101001--\r\n", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "X-API-KEY": "<apiKey>",
  "Content-Type": "multipart/form-data; boundary=---011000010111000001101001"
]
let parameters = [
  [
    "name": "label",
    "value": 
  ],
  [
    "name": "status",
    "value": 
  ],
  [
    "name": "keywords",
    "value": 
  ],
  [
    "name": "metadata",
    "value": 
  ]
]

let boundary = "---011000010111000001101001"

var body = ""
var error: NSError? = nil
for param in parameters {
  let paramName = param["name"]!
  body += "--\(boundary)\r\n"
  body += "Content-Disposition:form-data; name=\"\(paramName)\""
  if let filename = param["fileName"] {
    let contentType = param["content-type"]!
    let fileContent = String(contentsOfFile: filename, encoding: String.Encoding.utf8)
    if (error != nil) {
      print(error as Any)
    }
    body += "; filename=\"\(filename)\"\r\n"
    body += "Content-Type: \(contentType)\r\n\r\n"
    body += fileContent
  } else if let paramValue = param["value"] {
    body += "\r\n\r\n\(paramValue)"
  }
}

let request = NSMutableURLRequest(url: NSURL(string: "https://api.vellum.ai/v1/documents/id")! as URL,
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