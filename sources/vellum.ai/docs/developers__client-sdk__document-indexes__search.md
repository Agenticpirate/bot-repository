> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Search

POST https://predict.vellum.ai/v1/search
Content-Type: application/json

Perform a search against a document index.

Reference: https://docs.vellum.ai/developers/client-sdk/document-indexes/search

## Authentication

- `X-API-KEY` header (required) — API Key authentication via header

## Request

### Body (application/json)

This endpoint expects an object.

- `query` (string, required) — The query to search for.
- `index_id` (string, optional, nullable) — The ID of the index to search against. Must provide either this, index_name or document_index.
- `index_name` (string, optional, nullable) — The name of the index to search against. Must provide either this, index_id or document_index.
- `options` (object, optional, nullable) — Configuration options for the search.
  - `limit` (integer, optional, nullable, default: 10) — The maximum number of results to return.
  - `weights` (object, optional, nullable) — The weights to use for the search. Must add up to 1.0.
    - `semantic_similarity` (double, optional, default: 0.8) — The relative weight to give to semantic similarity
    - `keywords` (double, optional, default: 0.2) — The relative weight to give to keywords
  - `result_merging` (object, optional, nullable) — The configuration for merging results.
    - `enabled` (boolean, optional, default: true) — Whether to enable merging results
  - `filters` (object, optional, nullable) — The filters to apply to the search.
    - `external_ids` (list of string, optional, nullable) — The document external IDs to filter by
    - `metadata` (object or object or object, optional, nullable) — The metadata filters to apply to the search
      - MetadataFilterConfigRequest
        - `combinator` (enum, optional, nullable) — * `and` - AND * `or` - OR
          - Allowed values: `and`, `or`
        - `negated` (boolean, optional, nullable)
        - `rules` (list of object, optional, nullable)
          - `combinator` (enum, optional, nullable) — * `and` - AND * `or` - OR
            - Allowed values: `and`, `or`
          - `negated` (boolean, optional, nullable)
          - `rules` (list of object, optional, nullable)
          - `field` (string, optional, nullable)
          - `operator` (enum, optional, nullable) — * `=` - EQUALS * `!=` - DOES\_NOT\_EQUAL * `<` - LESS\_THAN * `>` - GREATER\_THAN * `<=` - LESS\_THAN\_OR\_EQUAL\_TO * `>=` - GREATER\_THAN\_OR\_EQUAL\_TO * `contains` - CONTAINS * `beginsWith` - BEGINS\_WITH * `endsWith` - ENDS\_WITH * `doesNotContain` - DOES\_NOT\_CONTAIN * `doesNotBeginWith` - DOES\_NOT\_BEGIN\_WITH * `doesNotEndWith` - DOES\_NOT\_END\_WITH * `null` - NULL * `notNull` - NOT\_NULL * `in` - IN * `notIn` - NOT\_IN * `between` - BETWEEN * `notBetween` - NOT\_BETWEEN * `concat` - CONCAT * `+` - ADD * `-` - MINUS * `blank` - BLANK * `notBlank` - NOT\_BLANK * `coalesce` - COALESCE * `accessField` - ACCESS\_FIELD * `parseJson` - PARSE\_JSON * `and` - AND * `or` - OR * `isError` - IS\_ERROR * `length` - LENGTH
            - Allowed values: `=`, `!=`, `<`, `>`, `<=`, `>=`, `contains`, `beginsWith`, `endsWith`, `doesNotContain`, `doesNotBeginWith`, `doesNotEndWith`, `null`, `notNull`, `in`, `notIn`, `between`, `notBetween`, `concat`, `+`, `-`, `blank`, `notBlank`, `coalesce`, `accessField`, `parseJson`, `and`, `or`, `isError`, `length`
          - `value` (string, optional, nullable)
        - `field` (string, optional, nullable)
        - `operator` (enum, optional, nullable) — * `=` - EQUALS * `!=` - DOES\_NOT\_EQUAL * `<` - LESS\_THAN * `>` - GREATER\_THAN * `<=` - LESS\_THAN\_OR\_EQUAL\_TO * `>=` - GREATER\_THAN\_OR\_EQUAL\_TO * `contains` - CONTAINS * `beginsWith` - BEGINS\_WITH * `endsWith` - ENDS\_WITH * `doesNotContain` - DOES\_NOT\_CONTAIN * `doesNotBeginWith` - DOES\_NOT\_BEGIN\_WITH * `doesNotEndWith` - DOES\_NOT\_END\_WITH * `null` - NULL * `notNull` - NOT\_NULL * `in` - IN * `notIn` - NOT\_IN * `between` - BETWEEN * `notBetween` - NOT\_BETWEEN * `concat` - CONCAT * `+` - ADD * `-` - MINUS * `blank` - BLANK * `notBlank` - NOT\_BLANK * `coalesce` - COALESCE * `accessField` - ACCESS\_FIELD * `parseJson` - PARSE\_JSON * `and` - AND * `or` - OR * `isError` - IS\_ERROR * `length` - LENGTH
          - Allowed values: `=`, `!=`, `<`, `>`, `<=`, `>=`, `contains`, `beginsWith`, `endsWith`, `doesNotContain`, `doesNotBeginWith`, `doesNotEndWith`, `null`, `notNull`, `in`, `notIn`, `between`, `notBetween`, `concat`, `+`, `-`, `blank`, `notBlank`, `coalesce`, `accessField`, `parseJson`, `and`, `or`, `isError`, `length`
        - `value` (string, optional, nullable)
- `document_index` (string, optional, nullable) — Either the index name or index ID to search against. Must provide either this, index_id or index_name.

## Response

### 200

- `results` (list of object, required) — The results of the search. Each result represents a chunk that matches the search query.
  - `text` (string, required) — The text of the chunk that matched the search query.
  - `score` (double, required) — A score representing how well the chunk matches the search query.
  - `keywords` (list of string, required)
  - `document` (object, required) — The document that contains the chunk that matched the search query.
    - `label` (string, required) — The human-readable name for the document.
    - `id` (string, optional, nullable) — The ID of the document.
    - `external_id` (string, optional, nullable) — The unique ID of the document as represented in an external system and specified when it was originally uploaded.
    - `metadata` (map from string to any, optional, nullable) — A previously supplied JSON object containing metadata that can be filtered on when searching.
  - `meta` (object, optional, nullable) — Additional information about the search result.
    - `source` (object, optional, nullable)
      - PDF
        - `document_type` (enum, required)
          - Allowed values: `PDF`
        - `start_page_num` (integer, required, nullable) — The 1-indexed page number where the chunk starts in the document. Only available for supported chunking strategies and document types.
        - `end_page_num` (integer, required, nullable) — The 1-indexed page number where the chunk ends in the document. Only available for supported chunking strategies and document types.

## Errors

### 400 Bad Request Error

- `detail` (string, required) — Details about why the request failed.

### 404 Not Found Error

- `detail` (string, required) — Details about why the request failed.

### 500 Internal Server Error

- `detail` (string, required) — Details about why the request failed.

## Examples

**Request**

```json
{
  "query": "string"
}
```

**Response**

```json
{
  "results": [
    {
      "text": "string",
      "score": 1.1,
      "keywords": [
        "string"
      ],
      "document": {
        "label": "string",
        "id": "string",
        "external_id": "string",
        "metadata": {}
      },
      "meta": {
        "source": {
          "document_type": "PDF",
          "start_page_num": 1,
          "end_page_num": 1
        }
      }
    }
  ]
}
```

**SDK Code**

```python
import requests

url = "https://predict.vellum.ai/v1/search"

payload = { "query": "string" }
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
await client.search({
    query: "x"
});

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

	url := "https://predict.vellum.ai/v1/search"

	payload := strings.NewReader("{\n  \"query\": \"string\"\n}")

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

url = URI("https://predict.vellum.ai/v1/search")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["X-API-KEY"] = '<apiKey>'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"query\": \"string\"\n}"

response = http.request(request)
puts response.read_body
```

```java
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;

HttpResponse<String> response = Unirest.post("https://predict.vellum.ai/v1/search")
  .header("X-API-KEY", "<apiKey>")
  .header("Content-Type", "application/json")
  .body("{\n  \"query\": \"string\"\n}")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://predict.vellum.ai/v1/search', [
  'body' => '{
  "query": "string"
}',
  'headers' => [
    'Content-Type' => 'application/json',
    'X-API-KEY' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
using RestSharp;

var client = new RestClient("https://predict.vellum.ai/v1/search");
var request = new RestRequest(Method.POST);
request.AddHeader("X-API-KEY", "<apiKey>");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"query\": \"string\"\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "X-API-KEY": "<apiKey>",
  "Content-Type": "application/json"
]
let parameters = ["query": "string"] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://predict.vellum.ai/v1/search")! as URL,
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