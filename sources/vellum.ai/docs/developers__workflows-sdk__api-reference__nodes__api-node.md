> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# API Node

> Make HTTP requests to external API endpoints.

`vellum.workflows.nodes.APINode`

Used to make HTTP requests to external APIs.

### Attributes

**`url`** `str` — required

The URL to send the request to.

---

**`method`** `APIRequestMethod` — required

The HTTP method to use for the request.

---

**`headers`** `Optional[Dict[str, Union[str, VellumSecret]]]`

The headers to send in the request.

---

**`data`** `Optional[str]`

The data to send in the request body.

---

**`json`** `Optional[JsonObject]`

The JSON data to send in the request body.

---

**`authorization_type`** `Optional[AuthorizationType]`

The type of authorization to use for the API call.

---

**`api_key_header_key`** `Optional[str]`

The header key to use for the API key authorization.

---

**`bearer_token_value`** `Optional[str]`

The bearer token value to use for the bearer token authorization.

---

**`timeout`** `Optional[int]`

The maximum number of seconds to wait for the API request to complete. If not specified, the request will use the default timeout behavior.

---

### Outputs

**`status_code`** `int`

The HTTP status code of the response

---

**`headers`** `Dict[str, str]`

The response headers

---

**`text`** `str`

The raw text response body

---

**`json`** `Optional[Dict[str, Any]]`

The parsed JSON response body (if the response is JSON)

---

**`Example Usage`**

```python title="Example Usage"
from vellum.workflows.nodes import APINode

class MyAPINode(APINode):
    url = "https://api.example.com/data"
    method = "POST"
    timeout = 30  # Maximum 30 seconds for the request
    headers = {
        "Authorization": "Bearer ${secrets.API_KEY}",
        "Content-Type": "application/json"
    }
    json = {
        "query": "example",
        "filters": {
            "category": "books",
            "limit": 10
        }
    }
```

**`Example Outputs`**

```python title="Example Outputs"
MyAPINode.Outputs(
    status_code=200,
    headers={
        "content-type": "application/json",
        "x-request-id": "abc123"
    },
    text='{"data": {"items": [...]}}',
    json={
        "data": {
            "items": [
                {"id": 1, "title": "Example Book"},
                {"id": 2, "title": "Another Book"}
            ]
        }
    }
)
```

**`Error Response Example`**

```python title="Error Response Example"
MyAPINode.Outputs(
    status_code=404,
    headers={
        "content-type": "application/json"
    },
    text='{"error": "Not found"}',
    json={
        "error": "Not found"
    }
)
```