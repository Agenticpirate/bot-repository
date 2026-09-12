> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Add Document

POST https://api.vellum.ai/v1/document-indexes/{id}/documents/{document_id}

Adds a previously uploaded Document to the specified Document Index.

Reference: https://docs.vellum.ai/developers/client-sdk/document-indexes/add-document

## Authentication

- `X-API-KEY` header (required) — API Key authentication via header

## Request

### Path parameters

- `document_id` (string, required) — Either the Vellum-generated ID or the originally supplied external_id that uniquely identifies the Document you'd like to add.
- `id` (string, required) — Either the Vellum-generated ID or the originally specified name that uniquely identifies the Document Index to which you'd like to add the Document.

## Response

### 204

No response body

## Examples

**Response**

```json
{}
```

**SDK Code**

```python
import requests

url = "https://api.vellum.ai/v1/document-indexes/id/documents/document_id"

headers = {"X-API-KEY": "<apiKey>"}

response = requests.post(url, headers=headers)

print(response.json())
```

```typescript
import { VellumClient } from "vellum-ai";

const client = new VellumClient({ apiKey: "YOUR_API_KEY", apiVersion: "YOUR_API_VERSION" });
await client.documentIndexes.addDocument("document_id", "id");

```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.vellum.ai/v1/document-indexes/id/documents/document_id"

	req, _ := http.NewRequest("POST", url, nil)

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

url = URI("https://api.vellum.ai/v1/document-indexes/id/documents/document_id")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["X-API-KEY"] = '<apiKey>'

response = http.request(request)
puts response.read_body
```

```java
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;

HttpResponse<String> response = Unirest.post("https://api.vellum.ai/v1/document-indexes/id/documents/document_id")
  .header("X-API-KEY", "<apiKey>")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.vellum.ai/v1/document-indexes/id/documents/document_id', [
  'headers' => [
    'X-API-KEY' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
using RestSharp;

var client = new RestClient("https://api.vellum.ai/v1/document-indexes/id/documents/document_id");
var request = new RestRequest(Method.POST);
request.AddHeader("X-API-KEY", "<apiKey>");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["X-API-KEY": "<apiKey>"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.vellum.ai/v1/document-indexes/id/documents/document_id")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "POST"
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