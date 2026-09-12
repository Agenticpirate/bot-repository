> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Upload Document

POST https://documents.vellum.ai/v1/upload-document
Content-Type: multipart/form-data

Upload a document to be indexed and used for search.

**Note:** Uses a base url of `https://documents.vellum.ai`.


Reference: https://docs.vellum.ai/developers/client-sdk/documents/upload-document

## Authentication

- `X-API-KEY` header (required) — API Key authentication via header

## Request

### Body (multipart/form-data)

This endpoint expects a multipart form containing an optional file.

- `add_to_index_names` (list of string, optional) — Optionally include the names of all indexes that you'd like this document to be included in
- `external_id` (string, optional) — Optionally include an external ID for this document. This is useful if you want to re-upload the same document later when its contents change and would like it to be re-indexed.
- `label` (string, required) — A human-friendly name for this document. Typically the filename.
- `contents` (file, optional) — The file contents of the document. Either contents or url must be provided.
- `url` (string, optional) — A URL from which the document can be downloaded. Either contents or url must be provided.
- `keywords` (list of string, optional) — Optionally include a list of keywords that'll be associated with this document. Used when performing keyword searches.
- `metadata` (string, optional) — A stringified JSON object containing any metadata associated with the document that you'd like to filter upon later.

## Response

### 201

- `document_id` (string, required) — The ID of the newly created document.

## Errors

### 400 Bad Request Error

- `detail` (string, required)

### 404 Not Found Error

- `detail` (string, required)

### 500 Internal Server Error

- `detail` (string, required)

## Examples

**Request**

```json
{
  "label": "string",
  "contents": "<file: <file1>>"
}
```

**Response**

```json
{
  "document_id": "string"
}
```

**SDK Code**

```python
import requests

url = "https://documents.vellum.ai/v1/upload-document"

files = { "contents": "open('<file1>', 'rb')" }
payload = {
    "add_to_index_names": ,
    "external_id": ,
    "label": "string",
    "url": ,
    "keywords": ,
    "metadata": 
}
headers = {"X-API-KEY": "<apiKey>"}

response = requests.post(url, data=payload, files=files, headers=headers)

print(response.json())
```

```javascript
const url = 'https://documents.vellum.ai/v1/upload-document';
const form = new FormData();
form.append('add_to_index_names', '');
form.append('external_id', '');
form.append('label', 'string');
form.append('contents', '<file1>');
form.append('url', '');
form.append('keywords', '');
form.append('metadata', '');

const options = {method: 'POST', headers: {'X-API-KEY': '<apiKey>'}};

options.body = form;

try {
  const response = await fetch(url, options);
  const data = await response.json();
  console.log(data);
} catch (error) {
  console.error(error);
}
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

	url := "https://documents.vellum.ai/v1/upload-document"

	payload := strings.NewReader("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"add_to_index_names\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"external_id\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"label\"\r\n\r\nstring\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"contents\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"url\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"keywords\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"metadata\"\r\n\r\n\r\n-----011000010111000001101001--\r\n")

	req, _ := http.NewRequest("POST", url, payload)

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

url = URI("https://documents.vellum.ai/v1/upload-document")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["X-API-KEY"] = '<apiKey>'
request.body = "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"add_to_index_names\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"external_id\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"label\"\r\n\r\nstring\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"contents\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"url\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"keywords\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"metadata\"\r\n\r\n\r\n-----011000010111000001101001--\r\n"

response = http.request(request)
puts response.read_body
```

```java
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;

HttpResponse<String> response = Unirest.post("https://documents.vellum.ai/v1/upload-document")
  .header("X-API-KEY", "<apiKey>")
  .body("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"add_to_index_names\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"external_id\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"label\"\r\n\r\nstring\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"contents\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"url\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"keywords\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"metadata\"\r\n\r\n\r\n-----011000010111000001101001--\r\n")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://documents.vellum.ai/v1/upload-document', [
  'multipart' => [
    [
        'name' => 'label',
        'contents' => 'string'
    ],
    [
        'name' => 'contents',
        'filename' => '<file1>',
        'contents' => null
    ]
  ]
  'headers' => [
    'X-API-KEY' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
using RestSharp;

var client = new RestClient("https://documents.vellum.ai/v1/upload-document");
var request = new RestRequest(Method.POST);
request.AddHeader("X-API-KEY", "<apiKey>");
request.AddParameter("undefined", "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"add_to_index_names\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"external_id\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"label\"\r\n\r\nstring\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"contents\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"url\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"keywords\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"metadata\"\r\n\r\n\r\n-----011000010111000001101001--\r\n", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["X-API-KEY": "<apiKey>"]
let parameters = [
  [
    "name": "add_to_index_names",
    "value": 
  ],
  [
    "name": "external_id",
    "value": 
  ],
  [
    "name": "label",
    "value": "string"
  ],
  [
    "name": "contents",
    "fileName": "<file1>"
  ],
  [
    "name": "url",
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

let request = NSMutableURLRequest(url: NSURL(string: "https://documents.vellum.ai/v1/upload-document")! as URL,
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