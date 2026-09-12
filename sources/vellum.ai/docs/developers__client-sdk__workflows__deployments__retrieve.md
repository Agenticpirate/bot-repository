> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Retrieve Workflow Deployment

GET https://api.vellum.ai/v1/workflow-deployments/{id}

Used to retrieve a workflow deployment given its ID or name.

Reference: https://docs.vellum.ai/developers/client-sdk/workflows/deployments/retrieve

## Authentication

- `X-API-KEY` header (required) — API Key authentication via header

## Request

### Path parameters

- `id` (string, required) — Either the Workflow Deployment's ID or its unique name

## Response

### 200

- `id` (string, required)
- `name` (string, required) — A name that uniquely identifies this workflow deployment within its workspace
- `label` (string, required) — A human-readable label for the workflow deployment
- `created` (string, required)
- `last_deployed_on` (string, required)
- `last_deployed_history_item_id` (string, required) — The ID of the history item associated with this Workflow Deployment's LATEST Release Tag
- `input_variables` (list of object, required) — The input variables this Workflow Deployment expects to receive values for when it is executed.
  - `id` (string, required)
  - `key` (string, required)
  - `type` (enum, required) — * `STRING` - STRING * `NUMBER` - NUMBER * `JSON` - JSON * `CHAT_HISTORY` - CHAT_HISTORY * `SEARCH_RESULTS` - SEARCH_RESULTS * `ERROR` - ERROR * `ARRAY` - ARRAY * `FUNCTION_CALL` - FUNCTION_CALL * `AUDIO` - AUDIO * `VIDEO` - VIDEO * `IMAGE` - IMAGE * `DOCUMENT` - DOCUMENT * `NULL` - NULL * `THINKING` - THINKING * `REFERENCE` - REFERENCE
    - Allowed values: `STRING`, `NUMBER`, `JSON`, `CHAT_HISTORY`, `SEARCH_RESULTS`, `ERROR`, `ARRAY`, `FUNCTION_CALL`, `AUDIO`, `VIDEO`, `IMAGE`, `DOCUMENT`, `NULL`, `THINKING`, `REFERENCE`
  - `required` (boolean, optional, nullable)
  - `default` (object or object or object or object or object or object or object or object or object or object or object or object or object, optional, nullable)
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
          - Allowed values: `INVALID_REQUEST`, `INVALID_INPUTS`, `PROVIDER_ERROR`, `PROVIDER_CREDENTIALS_UNAVAILABLE`, `INTEGRATION_CREDENTIALS_UNAVAILABLE`, `REQUEST_TIMEOUT`, `INTERNAL_SERVER_ERROR`, `USER_DEFINED_ERROR`, `WORKFLOW_CANCELLED`, `NODE_CANCELLED`, `PROVIDER_QUOTA_EXCEEDED`, `CHAT_QUOTA_EXCEEDED`
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
    - SEARCH_RESULTS
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
    - THINKING
      - `type` (enum, required)
        - Allowed values: `THINKING`
      - `value` (object, required, nullable) — A value representing a string.
        - `type` (enum, required)
          - Allowed values: `STRING`
        - `value` (string, required, nullable)
  - `extensions` (object, optional, nullable) — A set of fields with additional properties for use in Vellum Variables.
    - `color` (string, optional, nullable)
    - `description` (string, optional, nullable)
    - `title` (string, optional, nullable)
  - `schema` (map from string to any, optional, nullable)
- `output_variables` (list of object, required) — The output variables this Workflow Deployment produces values for when it's executed.
  - `id` (string, required)
  - `key` (string, required)
  - `type` (enum, required) — * `STRING` - STRING * `NUMBER` - NUMBER * `JSON` - JSON * `CHAT_HISTORY` - CHAT_HISTORY * `SEARCH_RESULTS` - SEARCH_RESULTS * `ERROR` - ERROR * `ARRAY` - ARRAY * `FUNCTION_CALL` - FUNCTION_CALL * `AUDIO` - AUDIO * `VIDEO` - VIDEO * `IMAGE` - IMAGE * `DOCUMENT` - DOCUMENT * `NULL` - NULL * `THINKING` - THINKING * `REFERENCE` - REFERENCE
    - Allowed values: `STRING`, `NUMBER`, `JSON`, `CHAT_HISTORY`, `SEARCH_RESULTS`, `ERROR`, `ARRAY`, `FUNCTION_CALL`, `AUDIO`, `VIDEO`, `IMAGE`, `DOCUMENT`, `NULL`, `THINKING`, `REFERENCE`
  - `required` (boolean, optional, nullable)
  - `default` (object or object or object or object or object or object or object or object or object or object or object or object or object, optional, nullable)
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
          - Allowed values: `INVALID_REQUEST`, `INVALID_INPUTS`, `PROVIDER_ERROR`, `PROVIDER_CREDENTIALS_UNAVAILABLE`, `INTEGRATION_CREDENTIALS_UNAVAILABLE`, `REQUEST_TIMEOUT`, `INTERNAL_SERVER_ERROR`, `USER_DEFINED_ERROR`, `WORKFLOW_CANCELLED`, `NODE_CANCELLED`, `PROVIDER_QUOTA_EXCEEDED`, `CHAT_QUOTA_EXCEEDED`
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
    - SEARCH_RESULTS
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
    - THINKING
      - `type` (enum, required)
        - Allowed values: `THINKING`
      - `value` (object, required, nullable) — A value representing a string.
        - `type` (enum, required)
          - Allowed values: `STRING`
        - `value` (string, required, nullable)
  - `extensions` (object, optional, nullable) — A set of fields with additional properties for use in Vellum Variables.
    - `color` (string, optional, nullable)
    - `description` (string, optional, nullable)
    - `title` (string, optional, nullable)
  - `schema` (map from string to any, optional, nullable)
- `status` (enum, optional) — The current status of the workflow deployment * `ACTIVE` - Active * `ARCHIVED` - Archived * `PENDING_DELETION` - Pending Deletion
  - Allowed values: `ACTIVE`, `ARCHIVED`, `PENDING_DELETION`
- `environment` (enum, optional, nullable) — Deprecated. The value returned will always be 'PRODUCTION'.
  - Allowed values: `DEVELOPMENT`, `STAGING`, `PRODUCTION`
- `description` (string, optional, nullable) — A human-readable description of the workflow deployment
- `display_data` (object, optional, nullable) — Information used to display this Workflow Deployment.
  - `icon` (object, optional, nullable) — The icon associated with this Workflow Deployment.
    - `src` (string, optional, nullable)
    - `color` (string, optional, nullable)

## Examples

**Response**

```json
{
  "id": "string",
  "name": "string",
  "label": "string",
  "created": "2024-01-15T09:30:00Z",
  "last_deployed_on": "2024-01-15T09:30:00Z",
  "last_deployed_history_item_id": "string",
  "input_variables": [
    {
      "id": "string",
      "key": "string",
      "type": "STRING",
      "required": true,
      "default": {
        "type": "STRING",
        "value": "string"
      },
      "extensions": {
        "color": "string",
        "description": "string",
        "title": "string"
      },
      "schema": {}
    }
  ],
  "output_variables": [
    {
      "id": "string",
      "key": "string",
      "type": "STRING",
      "required": true,
      "default": {
        "type": "STRING",
        "value": "string"
      },
      "extensions": {
        "color": "string",
        "description": "string",
        "title": "string"
      },
      "schema": {}
    }
  ],
  "status": "ACTIVE",
  "environment": "DEVELOPMENT",
  "description": "string",
  "display_data": {
    "icon": {
      "src": "string",
      "color": "string"
    }
  }
}
```

**SDK Code**

```python
import requests

url = "https://api.vellum.ai/v1/workflow-deployments/id"

headers = {"X-API-KEY": "<apiKey>"}

response = requests.get(url, headers=headers)

print(response.json())
```

```typescript
import { VellumClient } from "vellum-ai";

const client = new VellumClient({ apiKey: "YOUR_API_KEY", apiVersion: "YOUR_API_VERSION" });
await client.workflowDeployments.retrieve("id");

```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.vellum.ai/v1/workflow-deployments/id"

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

url = URI("https://api.vellum.ai/v1/workflow-deployments/id")

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

HttpResponse<String> response = Unirest.get("https://api.vellum.ai/v1/workflow-deployments/id")
  .header("X-API-KEY", "<apiKey>")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.vellum.ai/v1/workflow-deployments/id', [
  'headers' => [
    'X-API-KEY' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
using RestSharp;

var client = new RestClient("https://api.vellum.ai/v1/workflow-deployments/id");
var request = new RestRequest(Method.GET);
request.AddHeader("X-API-KEY", "<apiKey>");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["X-API-KEY": "<apiKey>"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.vellum.ai/v1/workflow-deployments/id")! as URL,
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