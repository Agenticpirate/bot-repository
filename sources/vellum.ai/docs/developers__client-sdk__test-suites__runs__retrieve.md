> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Retrieve Test Suite Run

GET https://api.vellum.ai/v1/test-suite-runs/{id}

Retrieve a specific Test Suite Run by ID

Reference: https://docs.vellum.ai/developers/client-sdk/test-suites/runs/retrieve

## Authentication

- `X-API-KEY` header (required) — API Key authentication via header

## Request

### Path parameters

- `id` (string, required) — A UUID string identifying this test suite run.

## Response

### 200

- `id` (string, required)
- `created` (string, required)
- `test_suite` (object, required)
  - `id` (string, required)
  - `history_item_id` (string, required)
  - `label` (string, required)
- `state` (enum, required) — The current state of this run * `QUEUED` - Queued * `RUNNING` - Running * `COMPLETE` - Complete * `FAILED` - Failed * `CANCELLED` - Cancelled
  - Allowed values: `QUEUED`, `RUNNING`, `COMPLETE`, `FAILED`, `CANCELLED`
- `exec_config` (object or object or object or object or object, optional, nullable) — Configuration that defines how the Test Suite should be run
  - DEPLOYMENT_RELEASE_TAG
    - `data` (object, required)
      - `deployment_id` (string, required) — The ID of the Prompt Deployment to run the Test Suite against.
      - `tag` (string, optional, default: LATEST) — A tag identifying which release of the Prompt Deployment to run the Test Suite against. Useful for testing past versions of the Prompt Deployment
    - `type` (enum, optional) — * `DEPLOYMENT_RELEASE_TAG` - DEPLOYMENT_RELEASE_TAG
      - Allowed values: `DEPLOYMENT_RELEASE_TAG`
    - `test_case_ids` (list of string, optional, nullable) — Optionally specify a subset of test case ids to run. If not provided, all test cases within the test suite will be run by default.
  - PROMPT_SANDBOX_HISTORY_ITEM
    - `data` (object, required)
      - `history_item_id` (string, required) — The ID of the Prompt Sandbox History Item that the Test Suite will run against.
      - `prompt_variant_id` (string, required) — The ID of the Prompt Variant within the Prompt Sandbox History Item that you'd like to run the Test Suite against.
    - `type` (enum, optional) — * `PROMPT_SANDBOX_HISTORY_ITEM` - PROMPT_SANDBOX_HISTORY_ITEM
      - Allowed values: `PROMPT_SANDBOX_HISTORY_ITEM`
    - `test_case_ids` (list of string, optional, nullable) — Optionally specify a subset of test case ids to run. If not provided, all test cases within the test suite will be run by default.
  - WORKFLOW_RELEASE_TAG
    - `data` (object, required)
      - `workflow_deployment_id` (string, required) — The ID of the Workflow Deployment to run the Test Suite against.
      - `tag` (string, optional, default: LATEST) — A tag identifying which release of the Workflow Deployment to run the Test Suite against. Useful for testing past versions of the Workflow Deployment
    - `type` (enum, optional) — * `WORKFLOW_RELEASE_TAG` - WORKFLOW_RELEASE_TAG
      - Allowed values: `WORKFLOW_RELEASE_TAG`
    - `test_case_ids` (list of string, optional, nullable) — Optionally specify a subset of test case ids to run. If not provided, all test cases within the test suite will be run by default.
  - WORKFLOW_SANDBOX_HISTORY_ITEM
    - `data` (object, required)
      - `history_item_id` (string, required) — The ID of the Workflow Sandbox History Item that the Test Suite will run against.
      - `workflow_variant_id` (string, required) — The ID of the Workflow Variant within the Workflow Sandbox History Item that you'd like to run the Test Suite against.
    - `type` (enum, optional) — * `WORKFLOW_SANDBOX_HISTORY_ITEM` - WORKFLOW_SANDBOX_HISTORY_ITEM
      - Allowed values: `WORKFLOW_SANDBOX_HISTORY_ITEM`
    - `test_case_ids` (list of string, optional, nullable) — Optionally specify a subset of test case ids to run. If not provided, all test cases within the test suite will be run by default.
  - EXTERNAL
    - `data` (object, required)
      - `executions` (list of object, required) — The executions of some callable external to Vellum whose outputs you would like to evaluate.
        - `outputs` (list of object or object or object or object or object or object or object or object or object or object or object or object, required) — The output values of a callable that was executed against a Test Case outside of Vellum
          - STRING
            - `type` (enum, required)
            - `value` (string, required, nullable)
            - `name` (string, required)
          - NUMBER
            - `type` (enum, required)
            - `value` (double, required, nullable)
            - `name` (string, required)
          - JSON
            - `type` (enum, required)
            - `value` (any, required, nullable)
            - `name` (string, required)
          - CHAT_HISTORY
            - `type` (enum, required)
            - `value` (list of object, required, nullable)
            - `name` (string, required)
          - SEARCH_RESULTS
            - `type` (enum, required)
            - `value` (list of object, required, nullable)
            - `name` (string, required)
          - ERROR
            - `type` (enum, required)
            - `value` (object, required, nullable)
            - `name` (string, required)
          - FUNCTION_CALL
            - `type` (enum, required)
            - `value` (object, required, nullable) — The final resolved function call value.
            - `name` (string, required)
          - ARRAY
            - `type` (enum, required)
            - `value` (list of object or object or object or object or object or object or object or object or object or object or object or object or object, required, nullable)
            - `name` (string, required)
          - AUDIO
            - `type` (enum, required)
            - `value` (object, required, nullable)
            - `name` (string, required)
          - VIDEO
            - `type` (enum, required)
            - `value` (object, required, nullable)
            - `name` (string, required)
          - IMAGE
            - `type` (enum, required)
            - `value` (object, required, nullable)
            - `name` (string, required)
          - DOCUMENT
            - `type` (enum, required)
            - `value` (object, required, nullable)
            - `name` (string, required)
        - `test_case_id` (string, required)
    - `test_case_ids` (list of string, optional, nullable) — Optionally specify a subset of test case ids to run. If not provided, all test cases within the test suite will be run by default.
    - `type` (enum, optional) — * `EXTERNAL` - EXTERNAL
      - Allowed values: `EXTERNAL`
- `progress` (object, optional)
  - `number_of_requested_test_cases` (integer, required)
  - `number_of_completed_test_cases` (integer, required)

## Examples

**Response**

```json
{
  "id": "string",
  "created": "2024-01-15T09:30:00Z",
  "test_suite": {
    "id": "string",
    "history_item_id": "string",
    "label": "string"
  },
  "state": "QUEUED",
  "exec_config": {
    "type": "DEPLOYMENT_RELEASE_TAG",
    "data": {
      "deployment_id": "string",
      "tag": "LATEST"
    },
    "test_case_ids": [
      "string"
    ]
  },
  "progress": {
    "number_of_requested_test_cases": 1,
    "number_of_completed_test_cases": 1
  }
}
```

**SDK Code**

```python
import requests

url = "https://api.vellum.ai/v1/test-suite-runs/id"

headers = {"X-API-KEY": "<apiKey>"}

response = requests.get(url, headers=headers)

print(response.json())
```

```typescript
import { VellumClient } from "vellum-ai";

const client = new VellumClient({ apiKey: "YOUR_API_KEY", apiVersion: "YOUR_API_VERSION" });
await client.testSuiteRuns.retrieve("id");

```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.vellum.ai/v1/test-suite-runs/id"

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

url = URI("https://api.vellum.ai/v1/test-suite-runs/id")

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

HttpResponse<String> response = Unirest.get("https://api.vellum.ai/v1/test-suite-runs/id")
  .header("X-API-KEY", "<apiKey>")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.vellum.ai/v1/test-suite-runs/id', [
  'headers' => [
    'X-API-KEY' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
using RestSharp;

var client = new RestClient("https://api.vellum.ai/v1/test-suite-runs/id");
var request = new RestRequest(Method.GET);
request.AddHeader("X-API-KEY", "<apiKey>");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["X-API-KEY": "<apiKey>"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.vellum.ai/v1/test-suite-runs/id")! as URL,
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