> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Submit Prompt Execution Actuals

POST https://predict.vellum.ai/v1/submit-completion-actuals
Content-Type: application/json

Used to submit feedback regarding the quality of previously generated completions.

Reference: https://docs.vellum.ai/developers/client-sdk/prompts/submit-completion-actuals

## Authentication

- `X-API-KEY` header (required) — API Key authentication via header

## Request

### Body (application/json)

This endpoint expects an object.

- `actuals` (list of object, required) — Feedback regarding the quality of previously generated completions
  - `id` (string, optional, nullable) — The Vellum-generated ID of a previously generated completion. Must provide either this or external_id.
  - `external_id` (string, optional, nullable) — The external ID that was originally provided when generating the completion that you'd now like to submit actuals for. Must provide either this or id.
  - `text` (string, optional, nullable) — Text representing what the completion _should_ have been.
  - `quality` (double, optional, nullable) — A number between 0 and 1 representing the quality of the completion. 0 is the worst, 1 is the best.
  - `timestamp` (string, optional, nullable) — Optionally provide the timestamp representing when this feedback was collected. Used for reporting purposes.
  - `metadata` (map from string to any, optional, nullable) — Optionally provide additional metadata about the feedback submission.
- `deployment_id` (string, optional, nullable) — The ID of the deployment. Must provide either this or deployment_name.
- `deployment_name` (string, optional, nullable) — The name of the deployment. Must provide either this or deployment_id.

## Response

### 200

No response body

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
  "actuals": [
    {}
  ]
}
```

**Response**

```json
{}
```

**SDK Code**

```python
import requests

url = "https://predict.vellum.ai/v1/submit-completion-actuals"

payload = { "actuals": [{}] }
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
await client.submitCompletionActuals({
    actuals: [{}, {}]
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

	url := "https://predict.vellum.ai/v1/submit-completion-actuals"

	payload := strings.NewReader("{\n  \"actuals\": [\n    {}\n  ]\n}")

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

url = URI("https://predict.vellum.ai/v1/submit-completion-actuals")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["X-API-KEY"] = '<apiKey>'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"actuals\": [\n    {}\n  ]\n}"

response = http.request(request)
puts response.read_body
```

```java
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;

HttpResponse<String> response = Unirest.post("https://predict.vellum.ai/v1/submit-completion-actuals")
  .header("X-API-KEY", "<apiKey>")
  .header("Content-Type", "application/json")
  .body("{\n  \"actuals\": [\n    {}\n  ]\n}")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://predict.vellum.ai/v1/submit-completion-actuals', [
  'body' => '{
  "actuals": [
    {}
  ]
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

var client = new RestClient("https://predict.vellum.ai/v1/submit-completion-actuals");
var request = new RestRequest(Method.POST);
request.AddHeader("X-API-KEY", "<apiKey>");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"actuals\": [\n    {}\n  ]\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "X-API-KEY": "<apiKey>",
  "Content-Type": "application/json"
]
let parameters = ["actuals": [[]]] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://predict.vellum.ai/v1/submit-completion-actuals")! as URL,
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