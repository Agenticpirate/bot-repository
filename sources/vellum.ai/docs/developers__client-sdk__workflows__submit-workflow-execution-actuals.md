> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Submit Workflow Execution Actuals

POST https://predict.vellum.ai/v1/submit-workflow-execution-actuals
Content-Type: application/json

    Used to submit feedback regarding the quality of previous workflow execution and its outputs.

    **Note:** Uses a base url of `https://predict.vellum.ai`.    

Reference: https://docs.vellum.ai/developers/client-sdk/workflows/submit-workflow-execution-actuals

## Authentication

- `X-API-KEY` header (required) — API Key authentication via header

## Request

### Body (application/json)

This endpoint expects an object.

- `actuals` (list of object or object or object, required) — Feedback regarding the quality of an output on a previously executed workflow.
  - STRING
    - `output_type` (enum, required) — The variable type of the output that this actual is being submitted for.
      - Allowed values: `STRING`
    - `output_id` (string, optional, nullable) — The Vellum-generated ID of a workflow output. Must provide either this or output_key. output_key is typically preferred.
    - `output_key` (string, optional, nullable) — The user-defined name of a workflow output. Must provide either this or output_id. Should correspond to the `Name` specified in a Final Output Node. Generally preferred over output_id.
    - `quality` (double, optional, nullable) — Optionally provide a decimal number between 0.0 and 1.0 (inclusive) representing the quality of the output. 0 is the worst, 1 is the best.
    - `metadata` (map from string to any, optional, nullable) — Optionally provide additional metadata about the feedback submission.
    - `timestamp` (double, optional, nullable) — Optionally provide the timestamp representing when this feedback was collected. Used for reporting purposes.
    - `desired_output_value` (string, optional, nullable) — Optionally provide the value that the output ideally should have been.
  - JSON
    - `output_type` (enum, required) — The variable type of the output that this actual is being submitted for.
      - Allowed values: `JSON`
    - `output_id` (string, optional, nullable) — The Vellum-generated ID of a workflow output. Must provide either this or output_key. output_key is typically preferred.
    - `output_key` (string, optional, nullable) — The user-defined name of a workflow output. Must provide either this or output_id. Should correspond to the `Name` specified in a Final Output Node. Generally preferred over output_id.
    - `quality` (double, optional, nullable) — Optionally provide a decimal number between 0.0 and 1.0 (inclusive) representing the quality of the output. 0 is the worst, 1 is the best.
    - `metadata` (map from string to any, optional, nullable) — Optionally provide additional metadata about the feedback submission.
    - `timestamp` (double, optional, nullable) — Optionally provide the timestamp representing when this feedback was collected. Used for reporting purposes.
    - `desired_output_value` (map from string to any, optional, nullable) — Optionally provide the value that the output ideally should have been.
  - CHAT_HISTORY
    - `output_type` (enum, required) — The variable type of the output that this actual is being submitted for.
      - Allowed values: `CHAT_HISTORY`
    - `output_id` (string, optional, nullable) — The Vellum-generated ID of a workflow output. Must provide either this or output_key. output_key is typically preferred.
    - `output_key` (string, optional, nullable) — The user-defined name of a workflow output. Must provide either this or output_id. Should correspond to the `Name` specified in a Final Output Node. Generally preferred over output_id.
    - `quality` (double, optional, nullable) — Optionally provide a decimal number between 0.0 and 1.0 (inclusive) representing the quality of the output. 0 is the worst, 1 is the best.
    - `metadata` (map from string to any, optional, nullable) — Optionally provide additional metadata about the feedback submission.
    - `timestamp` (double, optional, nullable) — Optionally provide the timestamp representing when this feedback was collected. Used for reporting purposes.
    - `desired_output_value` (list of object, optional, nullable) — Optionally provide the value that the output ideally should have been.
      - `role` (enum, required) — * `SYSTEM` - System * `ASSISTANT` - Assistant * `USER` - User * `FUNCTION` - Function
        - Allowed values: `SYSTEM`, `ASSISTANT`, `USER`, `FUNCTION`
      - `text` (string, optional, nullable)
      - `content` (object or object or object or object or object or object or object, optional, nullable)
        - STRING
          - `type` (enum, required)
            - Allowed values: `STRING`
          - `value` (string, required)
        - FUNCTION_CALL
          - `type` (enum, required)
            - Allowed values: `FUNCTION_CALL`
          - `value` (object, required) — The final resolved function call value.
            - `name` (string, required)
            - `arguments` (map from string to any, required)
            - `id` (string, optional, nullable)
        - ARRAY
          - `type` (enum, required)
            - Allowed values: `ARRAY`
          - `value` (list of object or object or object or object or object or object, required)
            - STRING
            - FUNCTION_CALL
            - AUDIO
            - VIDEO
            - IMAGE
            - DOCUMENT
        - AUDIO
          - `type` (enum, required)
            - Allowed values: `AUDIO`
          - `value` (object, required)
            - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
            - `metadata` (map from string to any, optional, nullable)
        - VIDEO
          - `type` (enum, required)
            - Allowed values: `VIDEO`
          - `value` (object, required)
            - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
            - `metadata` (map from string to any, optional, nullable)
        - IMAGE
          - `type` (enum, required)
            - Allowed values: `IMAGE`
          - `value` (object, required)
            - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
            - `metadata` (map from string to any, optional, nullable)
        - DOCUMENT
          - `type` (enum, required)
            - Allowed values: `DOCUMENT`
          - `value` (object, required)
            - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
            - `metadata` (map from string to any, optional, nullable)
      - `source` (string, optional, nullable) — An optional identifier representing who or what generated this message.
      - `metadata` (map from string to any, optional, nullable)
- `execution_id` (string, optional, nullable) — The Vellum-generated ID of a previously executed workflow. Must provide either this or external_id.
- `external_id` (string, optional, nullable) — The external ID that was originally provided by when executing the workflow, if applicable, that you'd now like to submit actuals for. Must provide either this or execution_id.

## Response

### 200

No response body

## Examples

**Request**

```json
{
  "actuals": [
    {
      "output_type": "STRING"
    }
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

url = "https://predict.vellum.ai/v1/submit-workflow-execution-actuals"

payload = { "actuals": [{ "output_type": "STRING" }] }
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
await client.submitWorkflowExecutionActuals({
    actuals: [{
            outputType: "STRING"
        }, {
            outputType: "STRING"
        }]
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

	url := "https://predict.vellum.ai/v1/submit-workflow-execution-actuals"

	payload := strings.NewReader("{\n  \"actuals\": [\n    {\n      \"output_type\": \"STRING\"\n    }\n  ]\n}")

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

url = URI("https://predict.vellum.ai/v1/submit-workflow-execution-actuals")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["X-API-KEY"] = '<apiKey>'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"actuals\": [\n    {\n      \"output_type\": \"STRING\"\n    }\n  ]\n}"

response = http.request(request)
puts response.read_body
```

```java
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;

HttpResponse<String> response = Unirest.post("https://predict.vellum.ai/v1/submit-workflow-execution-actuals")
  .header("X-API-KEY", "<apiKey>")
  .header("Content-Type", "application/json")
  .body("{\n  \"actuals\": [\n    {\n      \"output_type\": \"STRING\"\n    }\n  ]\n}")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://predict.vellum.ai/v1/submit-workflow-execution-actuals', [
  'body' => '{
  "actuals": [
    {
      "output_type": "STRING"
    }
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

var client = new RestClient("https://predict.vellum.ai/v1/submit-workflow-execution-actuals");
var request = new RestRequest(Method.POST);
request.AddHeader("X-API-KEY", "<apiKey>");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"actuals\": [\n    {\n      \"output_type\": \"STRING\"\n    }\n  ]\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "X-API-KEY": "<apiKey>",
  "Content-Type": "application/json"
]
let parameters = ["actuals": [["output_type": "STRING"]]] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://predict.vellum.ai/v1/submit-workflow-execution-actuals")! as URL,
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