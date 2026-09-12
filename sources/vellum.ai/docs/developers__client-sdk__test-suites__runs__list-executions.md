> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# List Test Suite Executions

GET https://api.vellum.ai/v1/test-suite-runs/{id}/executions

Reference: https://docs.vellum.ai/developers/client-sdk/test-suites/runs/list-executions

## Authentication

- `X-API-KEY` header (required) — API Key authentication via header

## Request

### Path parameters

- `id` (string, required) — A UUID string identifying this test suite run.

### Query parameters

- `expand` (list of string, optional) — The response fields to expand for more information. - 'metric_results.metric_label' expands the metric label for each metric result. - 'metric_results.metric_definition' expands the metric definition for each metric result. - 'metric_results.metric_definition.name' expands the metric definition name for each metric result.
- `limit` (integer, optional) — Number of results to return per page.
- `offset` (integer, optional) — The initial index from which to return the results.

## Response

### 200

- `count` (integer, required)
- `next` (string, required, nullable)
- `previous` (string, required, nullable)
- `results` (list of object, required)
  - `id` (string, required)
  - `test_case_id` (string, required)
  - `outputs` (list of object or object or object or object or object or object or object or object, required)
    - STRING
      - `name` (string, required)
      - `type` (enum, required)
        - Allowed values: `STRING`
      - `value` (string, required, nullable)
      - `output_variable_id` (string, required)
    - NUMBER
      - `name` (string, required)
      - `type` (enum, required)
        - Allowed values: `NUMBER`
      - `value` (double, required, nullable)
      - `output_variable_id` (string, required)
    - JSON
      - `name` (string, required)
      - `type` (enum, required)
        - Allowed values: `JSON`
      - `value` (any, required, nullable)
      - `output_variable_id` (string, required)
    - CHAT_HISTORY
      - `name` (string, required)
      - `type` (enum, required)
        - Allowed values: `CHAT_HISTORY`
      - `value` (list of object, required, nullable)
        - `role` (enum, required) — * `SYSTEM` - System * `ASSISTANT` - Assistant * `USER` - User * `FUNCTION` - Function
          - Allowed values: `SYSTEM`, `ASSISTANT`, `USER`, `FUNCTION`
        - `text` (string, optional, nullable)
        - `content` (object or object or object or object or object or object or object, optional, nullable)
          - STRING
            - `type` (enum, required)
            - `value` (string, required)
          - FUNCTION_CALL
            - `type` (enum, required)
            - `value` (object, required) — The final resolved function call value.
          - ARRAY
            - `type` (enum, required)
            - `value` (list of object or object or object or object or object or object, required)
          - AUDIO
            - `type` (enum, required)
            - `value` (object, required)
          - VIDEO
            - `type` (enum, required)
            - `value` (object, required)
          - IMAGE
            - `type` (enum, required)
            - `value` (object, required)
          - DOCUMENT
            - `type` (enum, required)
            - `value` (object, required)
        - `source` (string, optional, nullable) — An optional identifier representing who or what generated this message.
        - `metadata` (map from string to any, optional, nullable)
      - `output_variable_id` (string, required)
    - SEARCH_RESULTS
      - `name` (string, required)
      - `type` (enum, required)
        - Allowed values: `SEARCH_RESULTS`
      - `value` (list of object, required, nullable)
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
      - `output_variable_id` (string, required)
    - ERROR
      - `name` (string, required)
      - `type` (enum, required)
        - Allowed values: `ERROR`
      - `value` (object, required, nullable)
        - `code` (enum, required) — * `INVALID_REQUEST` - INVALID_REQUEST * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_ERROR` - PROVIDER_ERROR * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `REQUEST_TIMEOUT` - REQUEST_TIMEOUT * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `NODE_CANCELLED` - NODE_CANCELLED * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `CHAT_QUOTA_EXCEEDED` - CHAT_QUOTA_EXCEEDED
          - Allowed values: `INVALID_REQUEST`, `INVALID_INPUTS`, `PROVIDER_ERROR`, `PROVIDER_CREDENTIALS_UNAVAILABLE`, `INTEGRATION_CREDENTIALS_UNAVAILABLE`, `REQUEST_TIMEOUT`, `INTERNAL_SERVER_ERROR`, `USER_DEFINED_ERROR`, `WORKFLOW_CANCELLED`, `NODE_CANCELLED`, `PROVIDER_QUOTA_EXCEEDED`, `CHAT_QUOTA_EXCEEDED`
        - `message` (string, required)
        - `raw_data` (map from string to any, optional, nullable)
      - `output_variable_id` (string, required)
    - FUNCTION_CALL
      - `name` (string, required)
      - `type` (enum, required)
        - Allowed values: `FUNCTION_CALL`
      - `value` (object, required, nullable) — The final resolved function call value.
        - `arguments` (map from string to any, required)
        - `name` (string, required)
        - `id` (string, optional, nullable)
      - `output_variable_id` (string, required)
    - ARRAY
      - `name` (string, required)
      - `type` (enum, required)
        - Allowed values: `ARRAY`
      - `value` (list of object or object or object or object or object or object or object or object or object or object or object or object or object, required, nullable)
        - STRING
          - `type` (enum, required)
            - Allowed values: `STRING`
          - `value` (string, required, nullable)
        - NUMBER
          - `type` (enum, required)
            - Allowed values: `NUMBER`
          - `value` (double, required, nullable)
        - JSON
          - `type` (enum, required)
            - Allowed values: `JSON`
          - `value` (any, required, nullable)
        - AUDIO
          - `type` (enum, required)
            - Allowed values: `AUDIO`
          - `value` (object, required, nullable)
            - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
            - `metadata` (map from string to any, optional, nullable)
        - VIDEO
          - `type` (enum, required)
            - Allowed values: `VIDEO`
          - `value` (object, required, nullable)
            - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
            - `metadata` (map from string to any, optional, nullable)
        - IMAGE
          - `type` (enum, required)
            - Allowed values: `IMAGE`
          - `value` (object, required, nullable)
            - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
            - `metadata` (map from string to any, optional, nullable)
        - DOCUMENT
          - `type` (enum, required)
            - Allowed values: `DOCUMENT`
          - `value` (object, required, nullable)
            - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
            - `metadata` (map from string to any, optional, nullable)
        - FUNCTION_CALL
          - `type` (enum, required)
            - Allowed values: `FUNCTION_CALL`
          - `value` (object, required, nullable) — The final resolved function call value.
            - `arguments` (map from string to any, required)
            - `name` (string, required)
            - `id` (string, optional, nullable)
        - ERROR
          - `type` (enum, required)
            - Allowed values: `ERROR`
          - `value` (object, required, nullable)
            - `code` (enum, required) — * `INVALID_REQUEST` - INVALID_REQUEST * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_ERROR` - PROVIDER_ERROR * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `REQUEST_TIMEOUT` - REQUEST_TIMEOUT * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `NODE_CANCELLED` - NODE_CANCELLED * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `CHAT_QUOTA_EXCEEDED` - CHAT_QUOTA_EXCEEDED
            - `message` (string, required)
            - `raw_data` (map from string to any, optional, nullable)
        - ARRAY
          - `type` (enum, required)
            - Allowed values: `ARRAY`
          - `value` (list of object or object or object or object or object or object or object or object or object or object or object or object or object, required, nullable)
        - CHAT_HISTORY
          - `type` (enum, required)
            - Allowed values: `CHAT_HISTORY`
          - `value` (list of object, required, nullable)
            - `role` (enum, required) — * `SYSTEM` - System * `ASSISTANT` - Assistant * `USER` - User * `FUNCTION` - Function
            - `text` (string, optional, nullable)
            - `content` (object or object or object or object or object or object or object, optional, nullable)
            - `source` (string, optional, nullable) — An optional identifier representing who or what generated this message.
            - `metadata` (map from string to any, optional, nullable)
        - SEARCH_RESULTS
          - `type` (enum, required)
            - Allowed values: `SEARCH_RESULTS`
          - `value` (list of object, required, nullable)
            - `text` (string, required) — The text of the chunk that matched the search query.
            - `score` (double, required) — A score representing how well the chunk matches the search query.
            - `keywords` (list of string, required)
            - `document` (object, required) — The document that contains the chunk that matched the search query.
            - `meta` (object, optional, nullable) — Additional information about the search result.
        - THINKING
          - `type` (enum, required)
            - Allowed values: `THINKING`
          - `value` (object, required, nullable) — A value representing a string.
            - `type` (enum, required)
            - `value` (string, required, nullable)
      - `output_variable_id` (string, required)
  - `metric_results` (list of object, required)
    - `metric_id` (string, required)
    - `outputs` (list of object or object or object or object or object, required)
      - STRING
        - `value` (string, required, nullable)
        - `name` (string, required)
        - `type` (enum, optional) — * `STRING` - STRING
          - Allowed values: `STRING`
      - NUMBER
        - `value` (double, required, nullable)
        - `name` (string, required)
        - `type` (enum, optional) — * `NUMBER` - NUMBER
          - Allowed values: `NUMBER`
      - JSON
        - `value` (any, required, nullable)
        - `name` (string, required)
        - `type` (enum, optional) — * `JSON` - JSON
          - Allowed values: `JSON`
      - ERROR
        - `value` (object, required)
          - `code` (enum, required) — * `INVALID_REQUEST` - INVALID_REQUEST * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_ERROR` - PROVIDER_ERROR * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `REQUEST_TIMEOUT` - REQUEST_TIMEOUT * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `NODE_CANCELLED` - NODE_CANCELLED * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `CHAT_QUOTA_EXCEEDED` - CHAT_QUOTA_EXCEEDED
            - Allowed values: `INVALID_REQUEST`, `INVALID_INPUTS`, `PROVIDER_ERROR`, `PROVIDER_CREDENTIALS_UNAVAILABLE`, `INTEGRATION_CREDENTIALS_UNAVAILABLE`, `REQUEST_TIMEOUT`, `INTERNAL_SERVER_ERROR`, `USER_DEFINED_ERROR`, `WORKFLOW_CANCELLED`, `NODE_CANCELLED`, `PROVIDER_QUOTA_EXCEEDED`, `CHAT_QUOTA_EXCEEDED`
          - `message` (string, required)
          - `raw_data` (map from string to any, optional, nullable)
        - `name` (string, required)
        - `type` (enum, optional) — * `ERROR` - ERROR
          - Allowed values: `ERROR`
      - ARRAY
        - `value` (list of object or object or object or object or object or object or object or object or object or object or object or object or object, required, nullable)
          - STRING
            - `type` (enum, required)
            - `value` (string, required, nullable)
          - NUMBER
            - `type` (enum, required)
            - `value` (double, required, nullable)
          - JSON
            - `type` (enum, required)
            - `value` (any, required, nullable)
          - AUDIO
            - `type` (enum, required)
            - `value` (object, required, nullable)
          - VIDEO
            - `type` (enum, required)
            - `value` (object, required, nullable)
          - IMAGE
            - `type` (enum, required)
            - `value` (object, required, nullable)
          - DOCUMENT
            - `type` (enum, required)
            - `value` (object, required, nullable)
          - FUNCTION_CALL
            - `type` (enum, required)
            - `value` (object, required, nullable) — The final resolved function call value.
          - ERROR
            - `type` (enum, required)
            - `value` (object, required, nullable)
          - ARRAY
            - `type` (enum, required)
            - `value` (list of object or object or object or object or object or object or object or object or object or object or object or object or object, required, nullable)
          - CHAT_HISTORY
            - `type` (enum, required)
            - `value` (list of object, required, nullable)
          - SEARCH_RESULTS
            - `type` (enum, required)
            - `value` (list of object, required, nullable)
          - THINKING
            - `type` (enum, required)
            - `value` (object, required, nullable) — A value representing a string.
        - `name` (string, required)
        - `type` (enum, optional) — * `ARRAY` - ARRAY
          - Allowed values: `ARRAY`
    - `metric_label` (string, optional)
    - `metric_definition` (object, optional)
      - `id` (string, optional)
      - `label` (string, optional)
      - `name` (string, optional)

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
      "test_case_id": "string",
      "outputs": [
        {
          "name": "string",
          "type": "STRING",
          "value": "string",
          "output_variable_id": "string"
        }
      ],
      "metric_results": [
        {
          "metric_id": "string",
          "outputs": [
            {
              "value": "string",
              "type": "STRING",
              "name": "string"
            }
          ],
          "metric_label": "string",
          "metric_definition": {
            "id": "string",
            "label": "string",
            "name": "string"
          }
        }
      ]
    }
  ]
}
```

**SDK Code**

```python
import requests

url = "https://api.vellum.ai/v1/test-suite-runs/id/executions"

headers = {"X-API-KEY": "<apiKey>"}

response = requests.get(url, headers=headers)

print(response.json())
```

```typescript
import { VellumClient } from "vellum-ai";

const client = new VellumClient({ apiKey: "YOUR_API_KEY", apiVersion: "YOUR_API_VERSION" });
await client.testSuiteRuns.listExecutions("id");

```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.vellum.ai/v1/test-suite-runs/id/executions"

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

url = URI("https://api.vellum.ai/v1/test-suite-runs/id/executions")

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

HttpResponse<String> response = Unirest.get("https://api.vellum.ai/v1/test-suite-runs/id/executions")
  .header("X-API-KEY", "<apiKey>")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.vellum.ai/v1/test-suite-runs/id/executions', [
  'headers' => [
    'X-API-KEY' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
using RestSharp;

var client = new RestClient("https://api.vellum.ai/v1/test-suite-runs/id/executions");
var request = new RestRequest(Method.GET);
request.AddHeader("X-API-KEY", "<apiKey>");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["X-API-KEY": "<apiKey>"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.vellum.ai/v1/test-suite-runs/id/executions")! as URL,
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