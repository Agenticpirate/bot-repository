> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Delete Test Case

DELETE https://api.vellum.ai/v1/test-suites/{id}/test-cases/{test_case_id}

Deletes an existing test case for a test suite, keying off of the test case id.


Reference: https://docs.vellum.ai/developers/client-sdk/test-suites/test-cases/delete

## Authentication

- `X-API-KEY` header (required) — API Key authentication via header

## Request

### Path parameters

- `id` (string, required) — Either the Test Suites' ID or its unique name
- `test_case_id` (string, required) — An id identifying the test case that you'd like to delete

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

url = "https://api.vellum.ai/v1/test-suites/id/test-cases/test_case_id"

headers = {"X-API-KEY": "<apiKey>"}

response = requests.delete(url, headers=headers)

print(response.json())
```

```typescript
import { VellumClient } from "vellum-ai";

const client = new VellumClient({ apiKey: "YOUR_API_KEY", apiVersion: "YOUR_API_VERSION" });
await client.testSuites.deleteTestSuiteTestCase("id", "test_case_id");

```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.vellum.ai/v1/test-suites/id/test-cases/test_case_id"

	req, _ := http.NewRequest("DELETE", url, nil)

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

url = URI("https://api.vellum.ai/v1/test-suites/id/test-cases/test_case_id")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Delete.new(url)
request["X-API-KEY"] = '<apiKey>'

response = http.request(request)
puts response.read_body
```

```java
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;

HttpResponse<String> response = Unirest.delete("https://api.vellum.ai/v1/test-suites/id/test-cases/test_case_id")
  .header("X-API-KEY", "<apiKey>")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('DELETE', 'https://api.vellum.ai/v1/test-suites/id/test-cases/test_case_id', [
  'headers' => [
    'X-API-KEY' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
using RestSharp;

var client = new RestClient("https://api.vellum.ai/v1/test-suites/id/test-cases/test_case_id");
var request = new RestRequest(Method.DELETE);
request.AddHeader("X-API-KEY", "<apiKey>");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["X-API-KEY": "<apiKey>"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.vellum.ai/v1/test-suites/id/test-cases/test_case_id")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "DELETE"
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