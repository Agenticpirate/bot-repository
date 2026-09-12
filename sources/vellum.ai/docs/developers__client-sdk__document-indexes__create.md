> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Create Document Index

POST https://api.vellum.ai/v1/document-indexes
Content-Type: application/json

Creates a new document index.

Reference: https://docs.vellum.ai/developers/client-sdk/document-indexes/create

## Authentication

- `X-API-KEY` header (required) — API Key authentication via header

## Request

### Body (application/json)

This endpoint expects an object.

- `label` (string, required) — A human-readable label for the document index
- `name` (string, required) — A name that uniquely identifies this index within its workspace
- `indexing_config` (object, required)
  - `vectorizer` (object or object or object or object or object or object or object or object or object or object or object or object, required)
    - text-embedding-3-small
      - `config` (object, required) — Configuration for using an OpenAI vectorizer.
        - `add_openai_api_key` (boolean, optional) — * `True` - True
      - `model_name` (enum, required)
        - Allowed values: `text-embedding-3-small`
    - text-embedding-3-large
      - `config` (object, required) — Configuration for using an OpenAI vectorizer.
        - `add_openai_api_key` (boolean, optional) — * `True` - True
      - `model_name` (enum, required)
        - Allowed values: `text-embedding-3-large`
    - text-embedding-ada-002
      - `config` (object, required) — Configuration for using an OpenAI vectorizer.
        - `add_openai_api_key` (boolean, optional) — * `True` - True
      - `model_name` (enum, required)
        - Allowed values: `text-embedding-ada-002`
    - intfloat/multilingual-e5-large
      - `model_name` (enum, required)
        - Allowed values: `intfloat/multilingual-e5-large`
      - `config` (map from string to any, optional, nullable)
    - sentence-transformers/multi-qa-mpnet-base-cos-v1
      - `model_name` (enum, required)
        - Allowed values: `sentence-transformers/multi-qa-mpnet-base-cos-v1`
      - `config` (map from string to any, optional, nullable)
    - sentence-transformers/multi-qa-mpnet-base-dot-v1
      - `model_name` (enum, required)
        - Allowed values: `sentence-transformers/multi-qa-mpnet-base-dot-v1`
      - `config` (map from string to any, optional, nullable)
    - hkunlp/instructor-xl
      - `model_name` (enum, required)
        - Allowed values: `hkunlp/instructor-xl`
      - `config` (object, required) — Configuration for using an Instructor vectorizer.
        - `instruction_domain` (string, required)
        - `instruction_query_text_type` (string, required)
        - `instruction_document_text_type` (string, required)
    - text-embedding-004
      - `model_name` (enum, required)
        - Allowed values: `text-embedding-004`
      - `config` (object, required)
        - `project_id` (string, required)
        - `region` (string, required)
    - text-multilingual-embedding-002
      - `model_name` (enum, required)
        - Allowed values: `text-multilingual-embedding-002`
      - `config` (object, required)
        - `project_id` (string, required)
        - `region` (string, required)
    - gemini-embedding-001
      - `model_name` (enum, required)
        - Allowed values: `gemini-embedding-001`
      - `config` (object, required)
        - `project_id` (string, required)
        - `region` (string, required)
    - BAAI/bge-small-en-v1.5
      - `model_name` (enum, required)
        - Allowed values: `BAAI/bge-small-en-v1.5`
    - private-vectorizer
      - `model_name` (enum, required)
        - Allowed values: `private-vectorizer`
  - `chunking` (object or object or object or object, optional, nullable)
    - reducto-chunker
      - `chunker_name` (enum, required)
        - Allowed values: `reducto-chunker`
      - `chunker_config` (object, optional) — Configuration for Reducto chunking
        - `character_limit` (integer, optional, default: 1000)
    - sentence-chunker
      - `chunker_name` (enum, required)
        - Allowed values: `sentence-chunker`
      - `chunker_config` (object, optional) — Configuration for sentence chunking
        - `character_limit` (integer, optional, default: 1000)
        - `min_overlap_ratio` (double, optional, default: 0.5)
    - token-overlapping-window-chunker
      - `chunker_name` (enum, required)
        - Allowed values: `token-overlapping-window-chunker`
      - `chunker_config` (object, optional) — Configuration for token overlapping window chunking
        - `token_limit` (integer, optional, default: 250)
        - `overlap_ratio` (double, optional, default: 0.5)
    - delimiter-chunker
      - `chunker_name` (enum, required)
        - Allowed values: `delimiter-chunker`
      - `chunker_config` (object, optional)
        - `delimiter` (string, optional, default: \n\n)
        - `is_regex` (boolean, optional, default: false)
- `status` (enum, optional) — The current status of the document index * `ACTIVE` - Active * `ARCHIVED` - Archived * `PENDING_DELETION` - Pending Deletion
  - Allowed values: `ACTIVE`, `ARCHIVED`, `PENDING_DELETION`
- `copy_documents_from_index_id` (string, optional) — Optionally specify the id of a document index from which you'd like to copy and re-index its documents into this newly created index

## Response

### 201

- `id` (string, required)
- `created` (string, required)
- `label` (string, required) — A human-readable label for the document index
- `name` (string, required) — A name that uniquely identifies this index within its workspace
- `indexing_config` (object, required)
  - `vectorizer` (object or object or object or object or object or object or object or object or object or object or object or object, required)
    - text-embedding-3-small
      - `config` (object, required) — Configuration for using an OpenAI vectorizer.
        - `add_openai_api_key` (boolean, optional) — * `True` - True
      - `model_name` (enum, required)
        - Allowed values: `text-embedding-3-small`
    - text-embedding-3-large
      - `config` (object, required) — Configuration for using an OpenAI vectorizer.
        - `add_openai_api_key` (boolean, optional) — * `True` - True
      - `model_name` (enum, required)
        - Allowed values: `text-embedding-3-large`
    - text-embedding-ada-002
      - `config` (object, required) — Configuration for using an OpenAI vectorizer.
        - `add_openai_api_key` (boolean, optional) — * `True` - True
      - `model_name` (enum, required)
        - Allowed values: `text-embedding-ada-002`
    - intfloat/multilingual-e5-large
      - `model_name` (enum, required)
        - Allowed values: `intfloat/multilingual-e5-large`
      - `config` (map from string to any, optional, nullable)
    - sentence-transformers/multi-qa-mpnet-base-cos-v1
      - `model_name` (enum, required)
        - Allowed values: `sentence-transformers/multi-qa-mpnet-base-cos-v1`
      - `config` (map from string to any, optional, nullable)
    - sentence-transformers/multi-qa-mpnet-base-dot-v1
      - `model_name` (enum, required)
        - Allowed values: `sentence-transformers/multi-qa-mpnet-base-dot-v1`
      - `config` (map from string to any, optional, nullable)
    - hkunlp/instructor-xl
      - `model_name` (enum, required)
        - Allowed values: `hkunlp/instructor-xl`
      - `config` (object, required) — Configuration for using an Instructor vectorizer.
        - `instruction_domain` (string, required)
        - `instruction_query_text_type` (string, required)
        - `instruction_document_text_type` (string, required)
    - text-embedding-004
      - `model_name` (enum, required)
        - Allowed values: `text-embedding-004`
      - `config` (object, required)
        - `project_id` (string, required)
        - `region` (string, required)
    - text-multilingual-embedding-002
      - `model_name` (enum, required)
        - Allowed values: `text-multilingual-embedding-002`
      - `config` (object, required)
        - `project_id` (string, required)
        - `region` (string, required)
    - gemini-embedding-001
      - `model_name` (enum, required)
        - Allowed values: `gemini-embedding-001`
      - `config` (object, required)
        - `project_id` (string, required)
        - `region` (string, required)
    - BAAI/bge-small-en-v1.5
      - `model_name` (enum, required)
        - Allowed values: `BAAI/bge-small-en-v1.5`
    - private-vectorizer
      - `model_name` (enum, required)
        - Allowed values: `private-vectorizer`
  - `chunking` (object or object or object or object, optional, nullable)
    - reducto-chunker
      - `chunker_name` (enum, required)
        - Allowed values: `reducto-chunker`
      - `chunker_config` (object, optional) — Configuration for Reducto chunking
        - `character_limit` (integer, optional, default: 1000)
    - sentence-chunker
      - `chunker_name` (enum, required)
        - Allowed values: `sentence-chunker`
      - `chunker_config` (object, optional) — Configuration for sentence chunking
        - `character_limit` (integer, optional, default: 1000)
        - `min_overlap_ratio` (double, optional, default: 0.5)
    - token-overlapping-window-chunker
      - `chunker_name` (enum, required)
        - Allowed values: `token-overlapping-window-chunker`
      - `chunker_config` (object, optional) — Configuration for token overlapping window chunking
        - `token_limit` (integer, optional, default: 250)
        - `overlap_ratio` (double, optional, default: 0.5)
    - delimiter-chunker
      - `chunker_name` (enum, required)
        - Allowed values: `delimiter-chunker`
      - `chunker_config` (object, optional)
        - `delimiter` (string, optional, default: \n\n)
        - `is_regex` (boolean, optional, default: false)
- `status` (enum, optional) — The current status of the document index * `ACTIVE` - Active * `ARCHIVED` - Archived * `PENDING_DELETION` - Pending Deletion
  - Allowed values: `ACTIVE`, `ARCHIVED`, `PENDING_DELETION`

## Examples

### Index Using a Sentence Transformers Model

**Request**

```json
{
  "label": "My Document Index",
  "name": "my-document-index",
  "indexing_config": {
    "vectorizer": {
      "model_name": "sentence-transformers/multi-qa-mpnet-base-dot-v1",
      "config": {}
    },
    "chunking": {
      "chunker_name": "sentence-chunker",
      "chunker_config": {
        "character_limit": 1000,
        "min_overlap_ratio": 0.5
      }
    }
  }
}
```

**Response**

```json
{
  "id": "string",
  "created": "2024-01-15T09:30:00Z",
  "label": "string",
  "name": "string",
  "indexing_config": {
    "vectorizer": {
      "config": {
        "add_openai_api_key": true
      },
      "model_name": "text-embedding-3-small"
    },
    "chunking": {
      "chunker_name": "reducto-chunker",
      "chunker_config": {
        "character_limit": 1000
      }
    }
  },
  "status": "ACTIVE"
}
```

**SDK Code**

```python Index Using a Sentence Transformers Model
import requests

url = "https://api.vellum.ai/v1/document-indexes"

payload = {
    "label": "My Document Index",
    "name": "my-document-index",
    "indexing_config": {
        "vectorizer": {
            "model_name": "sentence-transformers/multi-qa-mpnet-base-dot-v1",
            "config": {}
        },
        "chunking": {
            "chunker_name": "sentence-chunker",
            "chunker_config": {
                "character_limit": 1000,
                "min_overlap_ratio": 0.5
            }
        }
    }
}
headers = {
    "X-API-KEY": "<apiKey>",
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)

print(response.json())
```

```typescript Index Using a Sentence Transformers Model
import { VellumClient } from "vellum-ai";

const client = new VellumClient({ apiKey: "YOUR_API_KEY", apiVersion: "YOUR_API_VERSION" });
await client.documentIndexes.create({
    label: "x",
    name: "x",
    indexingConfig: {
        vectorizer: {
            config: {},
            modelName: "text-embedding-3-small"
        }
    }
});

```

```go Index Using a Sentence Transformers Model
package main

import (
	"fmt"
	"strings"
	"net/http"
	"io"
)

func main() {

	url := "https://api.vellum.ai/v1/document-indexes"

	payload := strings.NewReader("{\n  \"label\": \"My Document Index\",\n  \"name\": \"my-document-index\",\n  \"indexing_config\": {\n    \"vectorizer\": {\n      \"model_name\": \"sentence-transformers/multi-qa-mpnet-base-dot-v1\",\n      \"config\": {}\n    },\n    \"chunking\": {\n      \"chunker_name\": \"sentence-chunker\",\n      \"chunker_config\": {\n        \"character_limit\": 1000,\n        \"min_overlap_ratio\": 0.5\n      }\n    }\n  }\n}")

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

```ruby Index Using a Sentence Transformers Model
require 'uri'
require 'net/http'

url = URI("https://api.vellum.ai/v1/document-indexes")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["X-API-KEY"] = '<apiKey>'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"label\": \"My Document Index\",\n  \"name\": \"my-document-index\",\n  \"indexing_config\": {\n    \"vectorizer\": {\n      \"model_name\": \"sentence-transformers/multi-qa-mpnet-base-dot-v1\",\n      \"config\": {}\n    },\n    \"chunking\": {\n      \"chunker_name\": \"sentence-chunker\",\n      \"chunker_config\": {\n        \"character_limit\": 1000,\n        \"min_overlap_ratio\": 0.5\n      }\n    }\n  }\n}"

response = http.request(request)
puts response.read_body
```

```java Index Using a Sentence Transformers Model
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;

HttpResponse<String> response = Unirest.post("https://api.vellum.ai/v1/document-indexes")
  .header("X-API-KEY", "<apiKey>")
  .header("Content-Type", "application/json")
  .body("{\n  \"label\": \"My Document Index\",\n  \"name\": \"my-document-index\",\n  \"indexing_config\": {\n    \"vectorizer\": {\n      \"model_name\": \"sentence-transformers/multi-qa-mpnet-base-dot-v1\",\n      \"config\": {}\n    },\n    \"chunking\": {\n      \"chunker_name\": \"sentence-chunker\",\n      \"chunker_config\": {\n        \"character_limit\": 1000,\n        \"min_overlap_ratio\": 0.5\n      }\n    }\n  }\n}")
  .asString();
```

```php Index Using a Sentence Transformers Model
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.vellum.ai/v1/document-indexes', [
  'body' => '{
  "label": "My Document Index",
  "name": "my-document-index",
  "indexing_config": {
    "vectorizer": {
      "model_name": "sentence-transformers/multi-qa-mpnet-base-dot-v1",
      "config": {}
    },
    "chunking": {
      "chunker_name": "sentence-chunker",
      "chunker_config": {
        "character_limit": 1000,
        "min_overlap_ratio": 0.5
      }
    }
  }
}',
  'headers' => [
    'Content-Type' => 'application/json',
    'X-API-KEY' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp Index Using a Sentence Transformers Model
using RestSharp;

var client = new RestClient("https://api.vellum.ai/v1/document-indexes");
var request = new RestRequest(Method.POST);
request.AddHeader("X-API-KEY", "<apiKey>");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"label\": \"My Document Index\",\n  \"name\": \"my-document-index\",\n  \"indexing_config\": {\n    \"vectorizer\": {\n      \"model_name\": \"sentence-transformers/multi-qa-mpnet-base-dot-v1\",\n      \"config\": {}\n    },\n    \"chunking\": {\n      \"chunker_name\": \"sentence-chunker\",\n      \"chunker_config\": {\n        \"character_limit\": 1000,\n        \"min_overlap_ratio\": 0.5\n      }\n    }\n  }\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift Index Using a Sentence Transformers Model
import Foundation

let headers = [
  "X-API-KEY": "<apiKey>",
  "Content-Type": "application/json"
]
let parameters = [
  "label": "My Document Index",
  "name": "my-document-index",
  "indexing_config": [
    "vectorizer": [
      "model_name": "sentence-transformers/multi-qa-mpnet-base-dot-v1",
      "config": []
    ],
    "chunking": [
      "chunker_name": "sentence-chunker",
      "chunker_config": [
        "character_limit": 1000,
        "min_overlap_ratio": 0.5
      ]
    ]
  ]
] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.vellum.ai/v1/document-indexes")! as URL,
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

### Index Using OpenAI Model

**Request**

```json
{
  "label": "My Document Index",
  "name": "my-document-index",
  "indexing_config": {
    "vectorizer": {
      "config": {
        "add_openai_api_key": true
      },
      "model_name": "text-embedding-ada-002"
    },
    "chunking": {
      "chunker_name": "sentence-chunker",
      "chunker_config": {
        "character_limit": 1000,
        "min_overlap_ratio": 0.5
      }
    }
  }
}
```

**Response**

```json
{
  "id": "string",
  "created": "2024-01-15T09:30:00Z",
  "label": "string",
  "name": "string",
  "indexing_config": {
    "vectorizer": {
      "config": {
        "add_openai_api_key": true
      },
      "model_name": "text-embedding-3-small"
    },
    "chunking": {
      "chunker_name": "reducto-chunker",
      "chunker_config": {
        "character_limit": 1000
      }
    }
  },
  "status": "ACTIVE"
}
```

**SDK Code**

```python Index Using OpenAI Model
import requests

url = "https://api.vellum.ai/v1/document-indexes"

payload = {
    "label": "My Document Index",
    "name": "my-document-index",
    "indexing_config": {
        "vectorizer": {
            "config": { "add_openai_api_key": True },
            "model_name": "text-embedding-ada-002"
        },
        "chunking": {
            "chunker_name": "sentence-chunker",
            "chunker_config": {
                "character_limit": 1000,
                "min_overlap_ratio": 0.5
            }
        }
    }
}
headers = {
    "X-API-KEY": "<apiKey>",
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)

print(response.json())
```

```typescript Index Using OpenAI Model
import { VellumClient } from "vellum-ai";

const client = new VellumClient({ apiKey: "YOUR_API_KEY", apiVersion: "YOUR_API_VERSION" });
await client.documentIndexes.create({
    label: "x",
    name: "x",
    indexingConfig: {
        vectorizer: {
            config: {},
            modelName: "text-embedding-3-small"
        }
    }
});

```

```go Index Using OpenAI Model
package main

import (
	"fmt"
	"strings"
	"net/http"
	"io"
)

func main() {

	url := "https://api.vellum.ai/v1/document-indexes"

	payload := strings.NewReader("{\n  \"label\": \"My Document Index\",\n  \"name\": \"my-document-index\",\n  \"indexing_config\": {\n    \"vectorizer\": {\n      \"config\": {\n        \"add_openai_api_key\": true\n      },\n      \"model_name\": \"text-embedding-ada-002\"\n    },\n    \"chunking\": {\n      \"chunker_name\": \"sentence-chunker\",\n      \"chunker_config\": {\n        \"character_limit\": 1000,\n        \"min_overlap_ratio\": 0.5\n      }\n    }\n  }\n}")

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

```ruby Index Using OpenAI Model
require 'uri'
require 'net/http'

url = URI("https://api.vellum.ai/v1/document-indexes")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["X-API-KEY"] = '<apiKey>'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"label\": \"My Document Index\",\n  \"name\": \"my-document-index\",\n  \"indexing_config\": {\n    \"vectorizer\": {\n      \"config\": {\n        \"add_openai_api_key\": true\n      },\n      \"model_name\": \"text-embedding-ada-002\"\n    },\n    \"chunking\": {\n      \"chunker_name\": \"sentence-chunker\",\n      \"chunker_config\": {\n        \"character_limit\": 1000,\n        \"min_overlap_ratio\": 0.5\n      }\n    }\n  }\n}"

response = http.request(request)
puts response.read_body
```

```java Index Using OpenAI Model
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;

HttpResponse<String> response = Unirest.post("https://api.vellum.ai/v1/document-indexes")
  .header("X-API-KEY", "<apiKey>")
  .header("Content-Type", "application/json")
  .body("{\n  \"label\": \"My Document Index\",\n  \"name\": \"my-document-index\",\n  \"indexing_config\": {\n    \"vectorizer\": {\n      \"config\": {\n        \"add_openai_api_key\": true\n      },\n      \"model_name\": \"text-embedding-ada-002\"\n    },\n    \"chunking\": {\n      \"chunker_name\": \"sentence-chunker\",\n      \"chunker_config\": {\n        \"character_limit\": 1000,\n        \"min_overlap_ratio\": 0.5\n      }\n    }\n  }\n}")
  .asString();
```

```php Index Using OpenAI Model
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.vellum.ai/v1/document-indexes', [
  'body' => '{
  "label": "My Document Index",
  "name": "my-document-index",
  "indexing_config": {
    "vectorizer": {
      "config": {
        "add_openai_api_key": true
      },
      "model_name": "text-embedding-ada-002"
    },
    "chunking": {
      "chunker_name": "sentence-chunker",
      "chunker_config": {
        "character_limit": 1000,
        "min_overlap_ratio": 0.5
      }
    }
  }
}',
  'headers' => [
    'Content-Type' => 'application/json',
    'X-API-KEY' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp Index Using OpenAI Model
using RestSharp;

var client = new RestClient("https://api.vellum.ai/v1/document-indexes");
var request = new RestRequest(Method.POST);
request.AddHeader("X-API-KEY", "<apiKey>");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"label\": \"My Document Index\",\n  \"name\": \"my-document-index\",\n  \"indexing_config\": {\n    \"vectorizer\": {\n      \"config\": {\n        \"add_openai_api_key\": true\n      },\n      \"model_name\": \"text-embedding-ada-002\"\n    },\n    \"chunking\": {\n      \"chunker_name\": \"sentence-chunker\",\n      \"chunker_config\": {\n        \"character_limit\": 1000,\n        \"min_overlap_ratio\": 0.5\n      }\n    }\n  }\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift Index Using OpenAI Model
import Foundation

let headers = [
  "X-API-KEY": "<apiKey>",
  "Content-Type": "application/json"
]
let parameters = [
  "label": "My Document Index",
  "name": "my-document-index",
  "indexing_config": [
    "vectorizer": [
      "config": ["add_openai_api_key": true],
      "model_name": "text-embedding-ada-002"
    ],
    "chunking": [
      "chunker_name": "sentence-chunker",
      "chunker_config": [
        "character_limit": 1000,
        "min_overlap_ratio": 0.5
      ]
    ]
  ]
] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.vellum.ai/v1/document-indexes")! as URL,
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

### Example 3

**Request**

```json
{
  "label": "My Document Index",
  "name": "my-document-index",
  "indexing_config": {
    "vectorizer": {
      "model_name": "hkunlp/instructor-xl",
      "config": {
        "instruction_domain": "",
        "instruction_query_text_type": "plain_text",
        "instruction_document_text_type": "plain_text"
      }
    },
    "chunking": {
      "chunker_name": "sentence-chunker",
      "chunker_config": {
        "character_limit": 1000,
        "min_overlap_ratio": 0.5
      }
    }
  }
}
```

**Response**

```json
{
  "id": "string",
  "created": "2024-01-15T09:30:00Z",
  "label": "string",
  "name": "string",
  "indexing_config": {
    "vectorizer": {
      "config": {
        "add_openai_api_key": true
      },
      "model_name": "text-embedding-3-small"
    },
    "chunking": {
      "chunker_name": "reducto-chunker",
      "chunker_config": {
        "character_limit": 1000
      }
    }
  },
  "status": "ACTIVE"
}
```

**SDK Code**

```python
import requests

url = "https://api.vellum.ai/v1/document-indexes"

payload = {
    "label": "My Document Index",
    "name": "my-document-index",
    "indexing_config": {
        "vectorizer": {
            "model_name": "hkunlp/instructor-xl",
            "config": {
                "instruction_domain": "",
                "instruction_query_text_type": "plain_text",
                "instruction_document_text_type": "plain_text"
            }
        },
        "chunking": {
            "chunker_name": "sentence-chunker",
            "chunker_config": {
                "character_limit": 1000,
                "min_overlap_ratio": 0.5
            }
        }
    }
}
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
await client.documentIndexes.create({
    label: "x",
    name: "x",
    indexingConfig: {
        vectorizer: {
            config: {},
            modelName: "text-embedding-3-small"
        }
    }
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

	url := "https://api.vellum.ai/v1/document-indexes"

	payload := strings.NewReader("{\n  \"label\": \"My Document Index\",\n  \"name\": \"my-document-index\",\n  \"indexing_config\": {\n    \"vectorizer\": {\n      \"model_name\": \"hkunlp/instructor-xl\",\n      \"config\": {\n        \"instruction_domain\": \"\",\n        \"instruction_query_text_type\": \"plain_text\",\n        \"instruction_document_text_type\": \"plain_text\"\n      }\n    },\n    \"chunking\": {\n      \"chunker_name\": \"sentence-chunker\",\n      \"chunker_config\": {\n        \"character_limit\": 1000,\n        \"min_overlap_ratio\": 0.5\n      }\n    }\n  }\n}")

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

url = URI("https://api.vellum.ai/v1/document-indexes")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["X-API-KEY"] = '<apiKey>'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"label\": \"My Document Index\",\n  \"name\": \"my-document-index\",\n  \"indexing_config\": {\n    \"vectorizer\": {\n      \"model_name\": \"hkunlp/instructor-xl\",\n      \"config\": {\n        \"instruction_domain\": \"\",\n        \"instruction_query_text_type\": \"plain_text\",\n        \"instruction_document_text_type\": \"plain_text\"\n      }\n    },\n    \"chunking\": {\n      \"chunker_name\": \"sentence-chunker\",\n      \"chunker_config\": {\n        \"character_limit\": 1000,\n        \"min_overlap_ratio\": 0.5\n      }\n    }\n  }\n}"

response = http.request(request)
puts response.read_body
```

```java
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;

HttpResponse<String> response = Unirest.post("https://api.vellum.ai/v1/document-indexes")
  .header("X-API-KEY", "<apiKey>")
  .header("Content-Type", "application/json")
  .body("{\n  \"label\": \"My Document Index\",\n  \"name\": \"my-document-index\",\n  \"indexing_config\": {\n    \"vectorizer\": {\n      \"model_name\": \"hkunlp/instructor-xl\",\n      \"config\": {\n        \"instruction_domain\": \"\",\n        \"instruction_query_text_type\": \"plain_text\",\n        \"instruction_document_text_type\": \"plain_text\"\n      }\n    },\n    \"chunking\": {\n      \"chunker_name\": \"sentence-chunker\",\n      \"chunker_config\": {\n        \"character_limit\": 1000,\n        \"min_overlap_ratio\": 0.5\n      }\n    }\n  }\n}")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.vellum.ai/v1/document-indexes', [
  'body' => '{
  "label": "My Document Index",
  "name": "my-document-index",
  "indexing_config": {
    "vectorizer": {
      "model_name": "hkunlp/instructor-xl",
      "config": {
        "instruction_domain": "",
        "instruction_query_text_type": "plain_text",
        "instruction_document_text_type": "plain_text"
      }
    },
    "chunking": {
      "chunker_name": "sentence-chunker",
      "chunker_config": {
        "character_limit": 1000,
        "min_overlap_ratio": 0.5
      }
    }
  }
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

var client = new RestClient("https://api.vellum.ai/v1/document-indexes");
var request = new RestRequest(Method.POST);
request.AddHeader("X-API-KEY", "<apiKey>");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"label\": \"My Document Index\",\n  \"name\": \"my-document-index\",\n  \"indexing_config\": {\n    \"vectorizer\": {\n      \"model_name\": \"hkunlp/instructor-xl\",\n      \"config\": {\n        \"instruction_domain\": \"\",\n        \"instruction_query_text_type\": \"plain_text\",\n        \"instruction_document_text_type\": \"plain_text\"\n      }\n    },\n    \"chunking\": {\n      \"chunker_name\": \"sentence-chunker\",\n      \"chunker_config\": {\n        \"character_limit\": 1000,\n        \"min_overlap_ratio\": 0.5\n      }\n    }\n  }\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "X-API-KEY": "<apiKey>",
  "Content-Type": "application/json"
]
let parameters = [
  "label": "My Document Index",
  "name": "my-document-index",
  "indexing_config": [
    "vectorizer": [
      "model_name": "hkunlp/instructor-xl",
      "config": [
        "instruction_domain": "",
        "instruction_query_text_type": "plain_text",
        "instruction_document_text_type": "plain_text"
      ]
    ],
    "chunking": [
      "chunker_name": "sentence-chunker",
      "chunker_config": [
        "character_limit": 1000,
        "min_overlap_ratio": 0.5
      ]
    ]
  ]
] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.vellum.ai/v1/document-indexes")! as URL,
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