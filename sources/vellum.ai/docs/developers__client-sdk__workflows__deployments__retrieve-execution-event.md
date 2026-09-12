> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Retrieve Workflow Deployment Execution

GET https://api.vellum.ai/v1/workflow-deployments/{id}/execution-events/{execution_id}

Reference: https://docs.vellum.ai/developers/client-sdk/workflows/deployments/retrieve-execution-event

## Authentication

- `X-API-KEY` header (required) — API Key authentication via header

## Request

### Path parameters

- `execution_id` (string, required)
- `id` (string, required)

## Response

### 200

- `span_id` (string, required)
- `start` (string, required)
- `end` (string, required, nullable)
- `inputs` (list of object or object or object or object or object or object or object or object or object or object or object or object or object, required)
  - STRING
    - `id` (string, required) — The variable's uniquely identifying internal id.
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `STRING`
    - `value` (string, required, nullable)
  - NUMBER
    - `id` (string, required) — The variable's uniquely identifying internal id.
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `NUMBER`
    - `value` (double, required, nullable)
  - JSON
    - `id` (string, required) — The variable's uniquely identifying internal id.
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `JSON`
    - `value` (any, required, nullable)
  - CHAT_HISTORY
    - `id` (string, required) — The variable's uniquely identifying internal id.
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
  - SEARCH_RESULTS
    - `id` (string, required) — The variable's uniquely identifying internal id.
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
            - `document_type` (enum, required)
            - `start_page_num` (integer, required, nullable) — The 1-indexed page number where the chunk starts in the document. Only available for supported chunking strategies and document types.
            - `end_page_num` (integer, required, nullable) — The 1-indexed page number where the chunk ends in the document. Only available for supported chunking strategies and document types.
  - ERROR
    - `id` (string, required) — The variable's uniquely identifying internal id.
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `ERROR`
    - `value` (object, required, nullable)
      - `code` (enum, required) — * `INVALID_REQUEST` - INVALID_REQUEST * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_ERROR` - PROVIDER_ERROR * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `REQUEST_TIMEOUT` - REQUEST_TIMEOUT * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `NODE_CANCELLED` - NODE_CANCELLED * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `CHAT_QUOTA_EXCEEDED` - CHAT_QUOTA_EXCEEDED
        - Allowed values: `INVALID_REQUEST`, `INVALID_INPUTS`, `PROVIDER_ERROR`, `PROVIDER_CREDENTIALS_UNAVAILABLE`, `INTEGRATION_CREDENTIALS_UNAVAILABLE`, `REQUEST_TIMEOUT`, `INTERNAL_SERVER_ERROR`, `USER_DEFINED_ERROR`, `WORKFLOW_CANCELLED`, `NODE_CANCELLED`, `PROVIDER_QUOTA_EXCEEDED`, `CHAT_QUOTA_EXCEEDED`
      - `message` (string, required)
      - `raw_data` (map from string to any, optional, nullable)
  - ARRAY
    - `id` (string, required) — The variable's uniquely identifying internal id.
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
            - FUNCTION_CALL
            - ARRAY
            - AUDIO
            - VIDEO
            - IMAGE
            - DOCUMENT
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
      - THINKING
        - `type` (enum, required)
          - Allowed values: `THINKING`
        - `value` (object, required, nullable) — A value representing a string.
          - `type` (enum, required)
            - Allowed values: `STRING`
          - `value` (string, required, nullable)
  - FUNCTION_CALL
    - `id` (string, required) — The variable's uniquely identifying internal id.
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `FUNCTION_CALL`
    - `value` (object, required, nullable) — The final resolved function call value.
      - `arguments` (map from string to any, required)
      - `name` (string, required)
      - `id` (string, optional, nullable)
  - THINKING
    - `id` (string, required) — The variable's uniquely identifying internal id.
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `THINKING`
    - `value` (object, required, nullable) — A value representing a string.
      - `type` (enum, required)
        - Allowed values: `STRING`
      - `value` (string, required, nullable)
  - AUDIO
    - `id` (string, required) — The variable's uniquely identifying internal id.
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `AUDIO`
    - `value` (object, required, nullable)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
  - VIDEO
    - `id` (string, required) — The variable's uniquely identifying internal id.
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `VIDEO`
    - `value` (object, required, nullable)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
  - IMAGE
    - `id` (string, required) — The variable's uniquely identifying internal id.
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `IMAGE`
    - `value` (object, required, nullable)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
  - DOCUMENT
    - `id` (string, required) — The variable's uniquely identifying internal id.
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `DOCUMENT`
    - `value` (object, required, nullable)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
- `outputs` (list of object or object or object or object or object or object or object or object or object or object or object or object or object, required)
  - STRING
    - `id` (string, required) — The variable's uniquely identifying internal id.
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `STRING`
    - `value` (string, required, nullable)
  - NUMBER
    - `id` (string, required) — The variable's uniquely identifying internal id.
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `NUMBER`
    - `value` (double, required, nullable)
  - JSON
    - `id` (string, required) — The variable's uniquely identifying internal id.
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `JSON`
    - `value` (any, required, nullable)
  - CHAT_HISTORY
    - `id` (string, required) — The variable's uniquely identifying internal id.
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
  - SEARCH_RESULTS
    - `id` (string, required) — The variable's uniquely identifying internal id.
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
            - `document_type` (enum, required)
            - `start_page_num` (integer, required, nullable) — The 1-indexed page number where the chunk starts in the document. Only available for supported chunking strategies and document types.
            - `end_page_num` (integer, required, nullable) — The 1-indexed page number where the chunk ends in the document. Only available for supported chunking strategies and document types.
  - ERROR
    - `id` (string, required) — The variable's uniquely identifying internal id.
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `ERROR`
    - `value` (object, required, nullable)
      - `code` (enum, required) — * `INVALID_REQUEST` - INVALID_REQUEST * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_ERROR` - PROVIDER_ERROR * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `REQUEST_TIMEOUT` - REQUEST_TIMEOUT * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `NODE_CANCELLED` - NODE_CANCELLED * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `CHAT_QUOTA_EXCEEDED` - CHAT_QUOTA_EXCEEDED
        - Allowed values: `INVALID_REQUEST`, `INVALID_INPUTS`, `PROVIDER_ERROR`, `PROVIDER_CREDENTIALS_UNAVAILABLE`, `INTEGRATION_CREDENTIALS_UNAVAILABLE`, `REQUEST_TIMEOUT`, `INTERNAL_SERVER_ERROR`, `USER_DEFINED_ERROR`, `WORKFLOW_CANCELLED`, `NODE_CANCELLED`, `PROVIDER_QUOTA_EXCEEDED`, `CHAT_QUOTA_EXCEEDED`
      - `message` (string, required)
      - `raw_data` (map from string to any, optional, nullable)
  - ARRAY
    - `id` (string, required) — The variable's uniquely identifying internal id.
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
            - FUNCTION_CALL
            - ARRAY
            - AUDIO
            - VIDEO
            - IMAGE
            - DOCUMENT
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
      - THINKING
        - `type` (enum, required)
          - Allowed values: `THINKING`
        - `value` (object, required, nullable) — A value representing a string.
          - `type` (enum, required)
            - Allowed values: `STRING`
          - `value` (string, required, nullable)
  - FUNCTION_CALL
    - `id` (string, required) — The variable's uniquely identifying internal id.
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `FUNCTION_CALL`
    - `value` (object, required, nullable) — The final resolved function call value.
      - `arguments` (map from string to any, required)
      - `name` (string, required)
      - `id` (string, optional, nullable)
  - THINKING
    - `id` (string, required) — The variable's uniquely identifying internal id.
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `THINKING`
    - `value` (object, required, nullable) — A value representing a string.
      - `type` (enum, required)
        - Allowed values: `STRING`
      - `value` (string, required, nullable)
  - AUDIO
    - `id` (string, required) — The variable's uniquely identifying internal id.
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `AUDIO`
    - `value` (object, required, nullable)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
  - VIDEO
    - `id` (string, required) — The variable's uniquely identifying internal id.
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `VIDEO`
    - `value` (object, required, nullable)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
  - IMAGE
    - `id` (string, required) — The variable's uniquely identifying internal id.
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `IMAGE`
    - `value` (object, required, nullable)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
  - DOCUMENT
    - `id` (string, required) — The variable's uniquely identifying internal id.
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `DOCUMENT`
    - `value` (object, required, nullable)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
- `error` (object or object, required, nullable)
  - WorkflowEventError
    - `message` (string, required)
    - `code` (enum, required) — * `WORKFLOW_INITIALIZATION` - WORKFLOW_INITIALIZATION * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `WORKFLOW_TIMEOUT` - WORKFLOW_TIMEOUT * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `NODE_EXECUTION_COUNT_LIMIT_REACHED` - NODE_EXECUTION_COUNT_LIMIT_REACHED * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `NODE_EXECUTION` - NODE_EXECUTION * `NODE_CANCELLED` - NODE_CANCELLED * `NODE_TIMEOUT` - NODE_TIMEOUT * `LLM_PROVIDER` - LLM_PROVIDER * `INVALID_TEMPLATE` - INVALID_TEMPLATE * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR
      - Allowed values: `WORKFLOW_INITIALIZATION`, `WORKFLOW_CANCELLED`, `WORKFLOW_TIMEOUT`, `PROVIDER_CREDENTIALS_UNAVAILABLE`, `INTEGRATION_CREDENTIALS_UNAVAILABLE`, `NODE_EXECUTION_COUNT_LIMIT_REACHED`, `INTERNAL_SERVER_ERROR`, `NODE_EXECUTION`, `NODE_CANCELLED`, `NODE_TIMEOUT`, `LLM_PROVIDER`, `INVALID_TEMPLATE`, `INVALID_INPUTS`, `PROVIDER_QUOTA_EXCEEDED`, `USER_DEFINED_ERROR`
    - `raw_data` (map from string to any or string, optional, nullable)
    - `stacktrace` (string, optional, nullable)
  - WorkflowInitializationError
    - `code` (string, required)
    - `message` (string, required)
- `usage_results` (list of object, required, nullable)
  - `usage` (list of object, optional, nullable)
    - `ml_model_name` (string, required)
    - `ml_model_usage` (object, required)
      - `output_token_count` (integer, optional, nullable)
      - `input_token_count` (integer, optional, nullable)
      - `input_char_count` (integer, optional, nullable)
      - `output_char_count` (integer, optional, nullable)
      - `compute_nanos` (integer, optional, nullable)
      - `cache_creation_input_tokens` (integer, optional, nullable)
      - `cache_read_input_tokens` (integer, optional, nullable)
  - `cost` (list of object, optional, nullable)
    - `value` (double, required)
    - `unit` (enum, required) — * `USD` - USD
      - Allowed values: `USD`
  - `error` (object, optional, nullable)
    - `code` (enum, required) — * `UNKNOWN` - UNKNOWN * `DEPENDENCIES_FAILED` - DEPENDENCIES_FAILED * `NO_USAGE_CALCULATED` - NO_USAGE_CALCULATED * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR
      - Allowed values: `UNKNOWN`, `DEPENDENCIES_FAILED`, `NO_USAGE_CALCULATED`, `INTERNAL_SERVER_ERROR`
    - `message` (string, required)
- `parent_context` (object, required, nullable)
  - `type` (enum, required)
    - Allowed values: `WORKFLOW_RELEASE_TAG`
  - `span_id` (string, required)
  - `deployment_id` (string, required)
  - `deployment_name` (string, required)
  - `deployment_history_item_id` (string, required)
  - `release_tag_id` (string, required)
  - `release_tag_name` (string, required)
  - `workflow_version_id` (string, required)
  - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
    - WORKFLOW
      - `workflow_definition` (object, required)
        - `name` (string, required)
        - `module` (list of string, required) — The module that this resource is defined in.
        - `id` (string, required)
        - `exclude_from_monitoring` (boolean, optional, nullable) — Whether this node should be excluded from monitoring views.
      - `type` (enum, required)
        - Allowed values: `WORKFLOW`
      - `span_id` (string, required)
      - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
      - `links` (list of object, optional, nullable)
        - `trace_id` (string, required)
        - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
          - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
        - `span_context` (object or object or object or object or object or object or object or object or object, required)
    - WORKFLOW_NODE
      - `node_definition` (object, required)
        - `name` (string, required)
        - `module` (list of string, required) — The module that this resource is defined in.
        - `id` (string, required)
        - `exclude_from_monitoring` (boolean, optional, nullable) — Whether this node should be excluded from monitoring views.
      - `type` (enum, required)
        - Allowed values: `WORKFLOW_NODE`
      - `span_id` (string, required)
      - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
      - `links` (list of object, optional, nullable)
        - `trace_id` (string, required)
        - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
          - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
        - `span_context` (object or object or object or object or object or object or object or object or object, required)
    - WORKFLOW_SANDBOX
      - `type` (enum, required)
        - Allowed values: `WORKFLOW_SANDBOX`
      - `span_id` (string, required)
      - `sandbox_id` (string, required)
      - `sandbox_history_item_id` (string, required)
      - `scenario_id` (string, required)
      - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
      - `links` (list of object, optional, nullable)
        - `trace_id` (string, required)
        - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
          - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
        - `span_context` (object or object or object or object or object or object or object or object or object, required)
    - PROMPT_RELEASE_TAG
      - `type` (enum, required)
        - Allowed values: `PROMPT_RELEASE_TAG`
      - `span_id` (string, required)
      - `deployment_id` (string, required)
      - `deployment_name` (string, required)
      - `deployment_history_item_id` (string, required)
      - `release_tag_id` (string, required)
      - `release_tag_name` (string, required)
      - `prompt_version_id` (string, required)
      - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
      - `links` (list of object, optional, nullable)
        - `trace_id` (string, required)
        - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
          - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
        - `span_context` (object or object or object or object or object or object or object or object or object, required)
      - `external_id` (string, optional, nullable)
      - `metadata` (map from string to any, optional, nullable)
    - API_REQUEST
      - `type` (enum, required)
        - Allowed values: `API_REQUEST`
      - `span_id` (string, required)
      - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
      - `links` (list of object, optional, nullable)
        - `trace_id` (string, required)
        - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
          - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
        - `span_context` (object or object or object or object or object or object or object or object or object, required)
      - `api_actor_id` (string, optional, nullable)
      - `api_actor_type` (enum, optional, nullable) — * `ANONYMOUS` - ANONYMOUS * `WORKSPACE_API_KEY` - WORKSPACE_API_KEY * `ENVIRONMENT_API_KEY` - ENVIRONMENT_API_KEY * `JWT` - JWT * `SERVICE_TOKEN` - SERVICE_TOKEN
        - Allowed values: `ANONYMOUS`, `WORKSPACE_API_KEY`, `ENVIRONMENT_API_KEY`, `JWT`, `SERVICE_TOKEN`
      - `api_actor_label` (string, optional, nullable)
    - EXTERNAL
      - `type` (enum, required)
        - Allowed values: `EXTERNAL`
      - `span_id` (string, required)
      - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
      - `links` (list of object, optional, nullable)
        - `trace_id` (string, required)
        - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
          - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
        - `span_context` (object or object or object or object or object or object or object or object or object, required)
    - SCHEDULED
      - `type` (enum, required)
        - Allowed values: `SCHEDULED`
      - `span_id` (string, required)
      - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
      - `links` (list of object, optional, nullable)
        - `trace_id` (string, required)
        - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
          - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
        - `span_context` (object or object or object or object or object or object or object or object or object, required)
      - `trigger_id` (string, optional, nullable)
    - INTEGRATION
      - `type` (enum, required)
        - Allowed values: `INTEGRATION`
      - `span_id` (string, required)
      - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
      - `links` (list of object, optional, nullable)
        - `trace_id` (string, required)
        - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
          - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
        - `span_context` (object or object or object or object or object or object or object or object or object, required)
      - `trigger_id` (string, optional, nullable)
  - `links` (list of object, optional, nullable)
    - `trace_id` (string, required)
    - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
      - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
    - `span_context` (object or object or object or object or object or object or object or object or object, required)
      - WORKFLOW
        - `workflow_definition` (object, required)
          - `name` (string, required)
          - `module` (list of string, required) — The module that this resource is defined in.
          - `id` (string, required)
          - `exclude_from_monitoring` (boolean, optional, nullable) — Whether this node should be excluded from monitoring views.
        - `type` (enum, required)
          - Allowed values: `WORKFLOW`
        - `span_id` (string, required)
        - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
        - `links` (list of object, optional, nullable)
      - WORKFLOW_NODE
        - `node_definition` (object, required)
          - `name` (string, required)
          - `module` (list of string, required) — The module that this resource is defined in.
          - `id` (string, required)
          - `exclude_from_monitoring` (boolean, optional, nullable) — Whether this node should be excluded from monitoring views.
        - `type` (enum, required)
          - Allowed values: `WORKFLOW_NODE`
        - `span_id` (string, required)
        - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
        - `links` (list of object, optional, nullable)
      - WORKFLOW_SANDBOX
        - `type` (enum, required)
          - Allowed values: `WORKFLOW_SANDBOX`
        - `span_id` (string, required)
        - `sandbox_id` (string, required)
        - `sandbox_history_item_id` (string, required)
        - `scenario_id` (string, required)
        - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
        - `links` (list of object, optional, nullable)
      - PROMPT_RELEASE_TAG
        - `type` (enum, required)
          - Allowed values: `PROMPT_RELEASE_TAG`
        - `span_id` (string, required)
        - `deployment_id` (string, required)
        - `deployment_name` (string, required)
        - `deployment_history_item_id` (string, required)
        - `release_tag_id` (string, required)
        - `release_tag_name` (string, required)
        - `prompt_version_id` (string, required)
        - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
        - `links` (list of object, optional, nullable)
        - `external_id` (string, optional, nullable)
        - `metadata` (map from string to any, optional, nullable)
      - API_REQUEST
        - `type` (enum, required)
          - Allowed values: `API_REQUEST`
        - `span_id` (string, required)
        - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
        - `links` (list of object, optional, nullable)
        - `api_actor_id` (string, optional, nullable)
        - `api_actor_type` (enum, optional, nullable) — * `ANONYMOUS` - ANONYMOUS * `WORKSPACE_API_KEY` - WORKSPACE_API_KEY * `ENVIRONMENT_API_KEY` - ENVIRONMENT_API_KEY * `JWT` - JWT * `SERVICE_TOKEN` - SERVICE_TOKEN
          - Allowed values: `ANONYMOUS`, `WORKSPACE_API_KEY`, `ENVIRONMENT_API_KEY`, `JWT`, `SERVICE_TOKEN`
        - `api_actor_label` (string, optional, nullable)
      - EXTERNAL
        - `type` (enum, required)
          - Allowed values: `EXTERNAL`
        - `span_id` (string, required)
        - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
        - `links` (list of object, optional, nullable)
      - SCHEDULED
        - `type` (enum, required)
          - Allowed values: `SCHEDULED`
        - `span_id` (string, required)
        - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
        - `links` (list of object, optional, nullable)
        - `trigger_id` (string, optional, nullable)
      - INTEGRATION
        - `type` (enum, required)
          - Allowed values: `INTEGRATION`
        - `span_id` (string, required)
        - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
        - `links` (list of object, optional, nullable)
        - `trigger_id` (string, optional, nullable)
  - `external_id` (string, optional, nullable)
  - `metadata` (map from string to any, optional, nullable)
- `latest_actual` (object, required, nullable)
  - `output` (object or object or object or object or object or object or object or object or object or object or object or object or object, required)
    - STRING
      - `id` (string, required) — The variable's uniquely identifying internal id.
      - `name` (string, required)
      - `type` (enum, required)
        - Allowed values: `STRING`
      - `value` (string, required, nullable)
    - NUMBER
      - `id` (string, required) — The variable's uniquely identifying internal id.
      - `name` (string, required)
      - `type` (enum, required)
        - Allowed values: `NUMBER`
      - `value` (double, required, nullable)
    - JSON
      - `id` (string, required) — The variable's uniquely identifying internal id.
      - `name` (string, required)
      - `type` (enum, required)
        - Allowed values: `JSON`
      - `value` (any, required, nullable)
    - CHAT_HISTORY
      - `id` (string, required) — The variable's uniquely identifying internal id.
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
    - SEARCH_RESULTS
      - `id` (string, required) — The variable's uniquely identifying internal id.
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
    - ERROR
      - `id` (string, required) — The variable's uniquely identifying internal id.
      - `name` (string, required)
      - `type` (enum, required)
        - Allowed values: `ERROR`
      - `value` (object, required, nullable)
        - `code` (enum, required) — * `INVALID_REQUEST` - INVALID_REQUEST * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_ERROR` - PROVIDER_ERROR * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `REQUEST_TIMEOUT` - REQUEST_TIMEOUT * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `NODE_CANCELLED` - NODE_CANCELLED * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `CHAT_QUOTA_EXCEEDED` - CHAT_QUOTA_EXCEEDED
          - Allowed values: `INVALID_REQUEST`, `INVALID_INPUTS`, `PROVIDER_ERROR`, `PROVIDER_CREDENTIALS_UNAVAILABLE`, `INTEGRATION_CREDENTIALS_UNAVAILABLE`, `REQUEST_TIMEOUT`, `INTERNAL_SERVER_ERROR`, `USER_DEFINED_ERROR`, `WORKFLOW_CANCELLED`, `NODE_CANCELLED`, `PROVIDER_QUOTA_EXCEEDED`, `CHAT_QUOTA_EXCEEDED`
        - `message` (string, required)
        - `raw_data` (map from string to any, optional, nullable)
    - ARRAY
      - `id` (string, required) — The variable's uniquely identifying internal id.
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
    - FUNCTION_CALL
      - `id` (string, required) — The variable's uniquely identifying internal id.
      - `name` (string, required)
      - `type` (enum, required)
        - Allowed values: `FUNCTION_CALL`
      - `value` (object, required, nullable) — The final resolved function call value.
        - `arguments` (map from string to any, required)
        - `name` (string, required)
        - `id` (string, optional, nullable)
    - THINKING
      - `id` (string, required) — The variable's uniquely identifying internal id.
      - `name` (string, required)
      - `type` (enum, required)
        - Allowed values: `THINKING`
      - `value` (object, required, nullable) — A value representing a string.
        - `type` (enum, required)
          - Allowed values: `STRING`
        - `value` (string, required, nullable)
    - AUDIO
      - `id` (string, required) — The variable's uniquely identifying internal id.
      - `name` (string, required)
      - `type` (enum, required)
        - Allowed values: `AUDIO`
      - `value` (object, required, nullable)
        - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
        - `metadata` (map from string to any, optional, nullable)
    - VIDEO
      - `id` (string, required) — The variable's uniquely identifying internal id.
      - `name` (string, required)
      - `type` (enum, required)
        - Allowed values: `VIDEO`
      - `value` (object, required, nullable)
        - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
        - `metadata` (map from string to any, optional, nullable)
    - IMAGE
      - `id` (string, required) — The variable's uniquely identifying internal id.
      - `name` (string, required)
      - `type` (enum, required)
        - Allowed values: `IMAGE`
      - `value` (object, required, nullable)
        - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
        - `metadata` (map from string to any, optional, nullable)
    - DOCUMENT
      - `id` (string, required) — The variable's uniquely identifying internal id.
      - `name` (string, required)
      - `type` (enum, required)
        - Allowed values: `DOCUMENT`
      - `value` (object, required, nullable)
        - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
        - `metadata` (map from string to any, optional, nullable)
  - `timestamp` (string, required)
  - `metadata` (map from string to any, required, nullable)
  - `quality` (double, optional, nullable)
- `metric_results` (list of object, required)
  - `outputs` (list of object or object or object or object or object or object or object or object or object or object or object or object or object, required)
    - STRING
      - `id` (string, required) — The variable's uniquely identifying internal id.
      - `name` (string, required)
      - `type` (enum, required)
        - Allowed values: `STRING`
      - `value` (string, required, nullable)
    - NUMBER
      - `id` (string, required) — The variable's uniquely identifying internal id.
      - `name` (string, required)
      - `type` (enum, required)
        - Allowed values: `NUMBER`
      - `value` (double, required, nullable)
    - JSON
      - `id` (string, required) — The variable's uniquely identifying internal id.
      - `name` (string, required)
      - `type` (enum, required)
        - Allowed values: `JSON`
      - `value` (any, required, nullable)
    - CHAT_HISTORY
      - `id` (string, required) — The variable's uniquely identifying internal id.
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
    - SEARCH_RESULTS
      - `id` (string, required) — The variable's uniquely identifying internal id.
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
    - ERROR
      - `id` (string, required) — The variable's uniquely identifying internal id.
      - `name` (string, required)
      - `type` (enum, required)
        - Allowed values: `ERROR`
      - `value` (object, required, nullable)
        - `code` (enum, required) — * `INVALID_REQUEST` - INVALID_REQUEST * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_ERROR` - PROVIDER_ERROR * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `REQUEST_TIMEOUT` - REQUEST_TIMEOUT * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `NODE_CANCELLED` - NODE_CANCELLED * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `CHAT_QUOTA_EXCEEDED` - CHAT_QUOTA_EXCEEDED
          - Allowed values: `INVALID_REQUEST`, `INVALID_INPUTS`, `PROVIDER_ERROR`, `PROVIDER_CREDENTIALS_UNAVAILABLE`, `INTEGRATION_CREDENTIALS_UNAVAILABLE`, `REQUEST_TIMEOUT`, `INTERNAL_SERVER_ERROR`, `USER_DEFINED_ERROR`, `WORKFLOW_CANCELLED`, `NODE_CANCELLED`, `PROVIDER_QUOTA_EXCEEDED`, `CHAT_QUOTA_EXCEEDED`
        - `message` (string, required)
        - `raw_data` (map from string to any, optional, nullable)
    - ARRAY
      - `id` (string, required) — The variable's uniquely identifying internal id.
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
    - FUNCTION_CALL
      - `id` (string, required) — The variable's uniquely identifying internal id.
      - `name` (string, required)
      - `type` (enum, required)
        - Allowed values: `FUNCTION_CALL`
      - `value` (object, required, nullable) — The final resolved function call value.
        - `arguments` (map from string to any, required)
        - `name` (string, required)
        - `id` (string, optional, nullable)
    - THINKING
      - `id` (string, required) — The variable's uniquely identifying internal id.
      - `name` (string, required)
      - `type` (enum, required)
        - Allowed values: `THINKING`
      - `value` (object, required, nullable) — A value representing a string.
        - `type` (enum, required)
          - Allowed values: `STRING`
        - `value` (string, required, nullable)
    - AUDIO
      - `id` (string, required) — The variable's uniquely identifying internal id.
      - `name` (string, required)
      - `type` (enum, required)
        - Allowed values: `AUDIO`
      - `value` (object, required, nullable)
        - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
        - `metadata` (map from string to any, optional, nullable)
    - VIDEO
      - `id` (string, required) — The variable's uniquely identifying internal id.
      - `name` (string, required)
      - `type` (enum, required)
        - Allowed values: `VIDEO`
      - `value` (object, required, nullable)
        - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
        - `metadata` (map from string to any, optional, nullable)
    - IMAGE
      - `id` (string, required) — The variable's uniquely identifying internal id.
      - `name` (string, required)
      - `type` (enum, required)
        - Allowed values: `IMAGE`
      - `value` (object, required, nullable)
        - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
        - `metadata` (map from string to any, optional, nullable)
    - DOCUMENT
      - `id` (string, required) — The variable's uniquely identifying internal id.
      - `name` (string, required)
      - `type` (enum, required)
        - Allowed values: `DOCUMENT`
      - `value` (object, required, nullable)
        - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
        - `metadata` (map from string to any, optional, nullable)
  - `label` (string, required)
  - `metric_id` (string, required)
- `spans` (list of object or object, required)
  - workflow.execution
    - `name` (enum, required)
      - Allowed values: `workflow.execution`
    - `events` (list of object or object or object or object or object or object or object, required)
      - workflow.execution.initiated
        - `name` (enum, required)
          - Allowed values: `workflow.execution.initiated`
        - `body` (object, required)
          - `workflow_definition` (object, required)
            - `name` (string, required)
            - `module` (list of string, required) — The module that this resource is defined in.
            - `id` (string, required)
            - `exclude_from_monitoring` (boolean, optional, nullable) — Whether this node should be excluded from monitoring views.
          - `inputs` (map from string to any, required)
          - `trigger` (object, optional, nullable)
            - `name` (string, required)
            - `module` (list of string, required) — The module that this resource is defined in.
            - `id` (string, required)
            - `exclude_from_monitoring` (boolean, optional, nullable) — Whether this node should be excluded from monitoring views.
        - `id` (string, required)
        - `timestamp` (string, required)
        - `trace_id` (string, required)
        - `span_id` (string, required)
        - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
          - WORKFLOW
            - `workflow_definition` (object, required)
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - WORKFLOW_NODE
            - `node_definition` (object, required)
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - WORKFLOW_RELEASE_TAG
            - `type` (enum, required)
            - `span_id` (string, required)
            - `deployment_id` (string, required)
            - `deployment_name` (string, required)
            - `deployment_history_item_id` (string, required)
            - `release_tag_id` (string, required)
            - `release_tag_name` (string, required)
            - `workflow_version_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `external_id` (string, optional, nullable)
            - `metadata` (map from string to any, optional, nullable)
          - WORKFLOW_SANDBOX
            - `type` (enum, required)
            - `span_id` (string, required)
            - `sandbox_id` (string, required)
            - `sandbox_history_item_id` (string, required)
            - `scenario_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - PROMPT_RELEASE_TAG
            - `type` (enum, required)
            - `span_id` (string, required)
            - `deployment_id` (string, required)
            - `deployment_name` (string, required)
            - `deployment_history_item_id` (string, required)
            - `release_tag_id` (string, required)
            - `release_tag_name` (string, required)
            - `prompt_version_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `external_id` (string, optional, nullable)
            - `metadata` (map from string to any, optional, nullable)
          - API_REQUEST
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `api_actor_id` (string, optional, nullable)
            - `api_actor_type` (enum, optional, nullable) — * `ANONYMOUS` - ANONYMOUS * `WORKSPACE_API_KEY` - WORKSPACE_API_KEY * `ENVIRONMENT_API_KEY` - ENVIRONMENT_API_KEY * `JWT` - JWT * `SERVICE_TOKEN` - SERVICE_TOKEN
            - `api_actor_label` (string, optional, nullable)
          - EXTERNAL
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - SCHEDULED
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `trigger_id` (string, optional, nullable)
          - INTEGRATION
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `trigger_id` (string, optional, nullable)
        - `links` (list of object, optional, nullable)
          - `trace_id` (string, required)
          - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
            - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
          - `span_context` (object or object or object or object or object or object or object or object or object, required)
            - WORKFLOW
            - WORKFLOW_NODE
            - WORKFLOW_RELEASE_TAG
            - WORKFLOW_SANDBOX
            - PROMPT_RELEASE_TAG
            - API_REQUEST
            - EXTERNAL
            - SCHEDULED
            - INTEGRATION
        - `api_version` (enum, optional) — * `2024-10-25` - V2024_10_25 * `2025-07-30` - V2025_07_30
          - Allowed values: `2024-10-25`, `2025-07-30`
      - workflow.execution.streaming
        - `name` (enum, required)
          - Allowed values: `workflow.execution.streaming`
        - `body` (object, required)
          - `workflow_definition` (object, required)
            - `name` (string, required)
            - `module` (list of string, required) — The module that this resource is defined in.
            - `id` (string, required)
            - `exclude_from_monitoring` (boolean, optional, nullable) — Whether this node should be excluded from monitoring views.
          - `output` (object, required)
            - `name` (string, required)
            - `value` (any, optional, nullable)
            - `delta` (any, optional, nullable)
        - `id` (string, required)
        - `timestamp` (string, required)
        - `trace_id` (string, required)
        - `span_id` (string, required)
        - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
          - WORKFLOW
            - `workflow_definition` (object, required)
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - WORKFLOW_NODE
            - `node_definition` (object, required)
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - WORKFLOW_RELEASE_TAG
            - `type` (enum, required)
            - `span_id` (string, required)
            - `deployment_id` (string, required)
            - `deployment_name` (string, required)
            - `deployment_history_item_id` (string, required)
            - `release_tag_id` (string, required)
            - `release_tag_name` (string, required)
            - `workflow_version_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `external_id` (string, optional, nullable)
            - `metadata` (map from string to any, optional, nullable)
          - WORKFLOW_SANDBOX
            - `type` (enum, required)
            - `span_id` (string, required)
            - `sandbox_id` (string, required)
            - `sandbox_history_item_id` (string, required)
            - `scenario_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - PROMPT_RELEASE_TAG
            - `type` (enum, required)
            - `span_id` (string, required)
            - `deployment_id` (string, required)
            - `deployment_name` (string, required)
            - `deployment_history_item_id` (string, required)
            - `release_tag_id` (string, required)
            - `release_tag_name` (string, required)
            - `prompt_version_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `external_id` (string, optional, nullable)
            - `metadata` (map from string to any, optional, nullable)
          - API_REQUEST
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `api_actor_id` (string, optional, nullable)
            - `api_actor_type` (enum, optional, nullable) — * `ANONYMOUS` - ANONYMOUS * `WORKSPACE_API_KEY` - WORKSPACE_API_KEY * `ENVIRONMENT_API_KEY` - ENVIRONMENT_API_KEY * `JWT` - JWT * `SERVICE_TOKEN` - SERVICE_TOKEN
            - `api_actor_label` (string, optional, nullable)
          - EXTERNAL
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - SCHEDULED
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `trigger_id` (string, optional, nullable)
          - INTEGRATION
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `trigger_id` (string, optional, nullable)
        - `links` (list of object, optional, nullable)
          - `trace_id` (string, required)
          - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
            - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
          - `span_context` (object or object or object or object or object or object or object or object or object, required)
            - WORKFLOW
            - WORKFLOW_NODE
            - WORKFLOW_RELEASE_TAG
            - WORKFLOW_SANDBOX
            - PROMPT_RELEASE_TAG
            - API_REQUEST
            - EXTERNAL
            - SCHEDULED
            - INTEGRATION
        - `api_version` (enum, optional) — * `2024-10-25` - V2024_10_25 * `2025-07-30` - V2025_07_30
          - Allowed values: `2024-10-25`, `2025-07-30`
      - workflow.execution.fulfilled
        - `name` (enum, required)
          - Allowed values: `workflow.execution.fulfilled`
        - `body` (object, required)
          - `workflow_definition` (object, required)
            - `name` (string, required)
            - `module` (list of string, required) — The module that this resource is defined in.
            - `id` (string, required)
            - `exclude_from_monitoring` (boolean, optional, nullable) — Whether this node should be excluded from monitoring views.
          - `outputs` (map from string to any, required)
          - `final_state` (map from string to any, optional, nullable)
          - `server_metadata` (map from string to any, optional, nullable)
          - `redacted` (boolean, optional, nullable)
        - `id` (string, required)
        - `timestamp` (string, required)
        - `trace_id` (string, required)
        - `span_id` (string, required)
        - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
          - WORKFLOW
            - `workflow_definition` (object, required)
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - WORKFLOW_NODE
            - `node_definition` (object, required)
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - WORKFLOW_RELEASE_TAG
            - `type` (enum, required)
            - `span_id` (string, required)
            - `deployment_id` (string, required)
            - `deployment_name` (string, required)
            - `deployment_history_item_id` (string, required)
            - `release_tag_id` (string, required)
            - `release_tag_name` (string, required)
            - `workflow_version_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `external_id` (string, optional, nullable)
            - `metadata` (map from string to any, optional, nullable)
          - WORKFLOW_SANDBOX
            - `type` (enum, required)
            - `span_id` (string, required)
            - `sandbox_id` (string, required)
            - `sandbox_history_item_id` (string, required)
            - `scenario_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - PROMPT_RELEASE_TAG
            - `type` (enum, required)
            - `span_id` (string, required)
            - `deployment_id` (string, required)
            - `deployment_name` (string, required)
            - `deployment_history_item_id` (string, required)
            - `release_tag_id` (string, required)
            - `release_tag_name` (string, required)
            - `prompt_version_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `external_id` (string, optional, nullable)
            - `metadata` (map from string to any, optional, nullable)
          - API_REQUEST
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `api_actor_id` (string, optional, nullable)
            - `api_actor_type` (enum, optional, nullable) — * `ANONYMOUS` - ANONYMOUS * `WORKSPACE_API_KEY` - WORKSPACE_API_KEY * `ENVIRONMENT_API_KEY` - ENVIRONMENT_API_KEY * `JWT` - JWT * `SERVICE_TOKEN` - SERVICE_TOKEN
            - `api_actor_label` (string, optional, nullable)
          - EXTERNAL
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - SCHEDULED
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `trigger_id` (string, optional, nullable)
          - INTEGRATION
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `trigger_id` (string, optional, nullable)
        - `links` (list of object, optional, nullable)
          - `trace_id` (string, required)
          - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
            - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
          - `span_context` (object or object or object or object or object or object or object or object or object, required)
            - WORKFLOW
            - WORKFLOW_NODE
            - WORKFLOW_RELEASE_TAG
            - WORKFLOW_SANDBOX
            - PROMPT_RELEASE_TAG
            - API_REQUEST
            - EXTERNAL
            - SCHEDULED
            - INTEGRATION
        - `api_version` (enum, optional) — * `2024-10-25` - V2024_10_25 * `2025-07-30` - V2025_07_30
          - Allowed values: `2024-10-25`, `2025-07-30`
      - workflow.execution.rejected
        - `name` (enum, required)
          - Allowed values: `workflow.execution.rejected`
        - `body` (object, required)
          - `workflow_definition` (object, required)
            - `name` (string, required)
            - `module` (list of string, required) — The module that this resource is defined in.
            - `id` (string, required)
            - `exclude_from_monitoring` (boolean, optional, nullable) — Whether this node should be excluded from monitoring views.
          - `error` (object, required)
            - `message` (string, required)
            - `code` (enum, required) — * `INVALID_WORKFLOW` - INVALID_WORKFLOW * `INVALID_INPUTS` - INVALID_INPUTS * `INVALID_OUTPUTS` - INVALID_OUTPUTS * `INVALID_STATE` - INVALID_STATE * `INVALID_CODE` - INVALID_CODE * `INVALID_TEMPLATE` - INVALID_TEMPLATE * `INTERNAL_ERROR` - INTERNAL_ERROR * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `PROVIDER_ERROR` - PROVIDER_ERROR * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `WORKFLOW_TIMEOUT` - WORKFLOW_TIMEOUT * `NODE_CANCELLED` - NODE_CANCELLED * `NODE_TIMEOUT` - NODE_TIMEOUT * `NODE_EXECUTION` - NODE_EXECUTION
            - `raw_data` (map from string to any or string, optional, nullable)
          - `stacktrace` (string, optional, nullable)
        - `id` (string, required)
        - `timestamp` (string, required)
        - `trace_id` (string, required)
        - `span_id` (string, required)
        - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
          - WORKFLOW
            - `workflow_definition` (object, required)
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - WORKFLOW_NODE
            - `node_definition` (object, required)
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - WORKFLOW_RELEASE_TAG
            - `type` (enum, required)
            - `span_id` (string, required)
            - `deployment_id` (string, required)
            - `deployment_name` (string, required)
            - `deployment_history_item_id` (string, required)
            - `release_tag_id` (string, required)
            - `release_tag_name` (string, required)
            - `workflow_version_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `external_id` (string, optional, nullable)
            - `metadata` (map from string to any, optional, nullable)
          - WORKFLOW_SANDBOX
            - `type` (enum, required)
            - `span_id` (string, required)
            - `sandbox_id` (string, required)
            - `sandbox_history_item_id` (string, required)
            - `scenario_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - PROMPT_RELEASE_TAG
            - `type` (enum, required)
            - `span_id` (string, required)
            - `deployment_id` (string, required)
            - `deployment_name` (string, required)
            - `deployment_history_item_id` (string, required)
            - `release_tag_id` (string, required)
            - `release_tag_name` (string, required)
            - `prompt_version_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `external_id` (string, optional, nullable)
            - `metadata` (map from string to any, optional, nullable)
          - API_REQUEST
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `api_actor_id` (string, optional, nullable)
            - `api_actor_type` (enum, optional, nullable) — * `ANONYMOUS` - ANONYMOUS * `WORKSPACE_API_KEY` - WORKSPACE_API_KEY * `ENVIRONMENT_API_KEY` - ENVIRONMENT_API_KEY * `JWT` - JWT * `SERVICE_TOKEN` - SERVICE_TOKEN
            - `api_actor_label` (string, optional, nullable)
          - EXTERNAL
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - SCHEDULED
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `trigger_id` (string, optional, nullable)
          - INTEGRATION
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `trigger_id` (string, optional, nullable)
        - `links` (list of object, optional, nullable)
          - `trace_id` (string, required)
          - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
            - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
          - `span_context` (object or object or object or object or object or object or object or object or object, required)
            - WORKFLOW
            - WORKFLOW_NODE
            - WORKFLOW_RELEASE_TAG
            - WORKFLOW_SANDBOX
            - PROMPT_RELEASE_TAG
            - API_REQUEST
            - EXTERNAL
            - SCHEDULED
            - INTEGRATION
        - `api_version` (enum, optional) — * `2024-10-25` - V2024_10_25 * `2025-07-30` - V2025_07_30
          - Allowed values: `2024-10-25`, `2025-07-30`
      - workflow.execution.paused
        - `name` (enum, required)
          - Allowed values: `workflow.execution.paused`
        - `body` (object, required)
          - `workflow_definition` (object, required)
            - `name` (string, required)
            - `module` (list of string, required) — The module that this resource is defined in.
            - `id` (string, required)
            - `exclude_from_monitoring` (boolean, optional, nullable) — Whether this node should be excluded from monitoring views.
          - `external_inputs` (list of object, required)
            - `types` (list of object, required)
            - `name` (string, required)
            - `inputs_class` (object, optional, nullable) — The definition of a resource defined in code.
            - `instance` (any, optional, nullable)
        - `id` (string, required)
        - `timestamp` (string, required)
        - `trace_id` (string, required)
        - `span_id` (string, required)
        - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
          - WORKFLOW
            - `workflow_definition` (object, required)
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - WORKFLOW_NODE
            - `node_definition` (object, required)
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - WORKFLOW_RELEASE_TAG
            - `type` (enum, required)
            - `span_id` (string, required)
            - `deployment_id` (string, required)
            - `deployment_name` (string, required)
            - `deployment_history_item_id` (string, required)
            - `release_tag_id` (string, required)
            - `release_tag_name` (string, required)
            - `workflow_version_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `external_id` (string, optional, nullable)
            - `metadata` (map from string to any, optional, nullable)
          - WORKFLOW_SANDBOX
            - `type` (enum, required)
            - `span_id` (string, required)
            - `sandbox_id` (string, required)
            - `sandbox_history_item_id` (string, required)
            - `scenario_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - PROMPT_RELEASE_TAG
            - `type` (enum, required)
            - `span_id` (string, required)
            - `deployment_id` (string, required)
            - `deployment_name` (string, required)
            - `deployment_history_item_id` (string, required)
            - `release_tag_id` (string, required)
            - `release_tag_name` (string, required)
            - `prompt_version_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `external_id` (string, optional, nullable)
            - `metadata` (map from string to any, optional, nullable)
          - API_REQUEST
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `api_actor_id` (string, optional, nullable)
            - `api_actor_type` (enum, optional, nullable) — * `ANONYMOUS` - ANONYMOUS * `WORKSPACE_API_KEY` - WORKSPACE_API_KEY * `ENVIRONMENT_API_KEY` - ENVIRONMENT_API_KEY * `JWT` - JWT * `SERVICE_TOKEN` - SERVICE_TOKEN
            - `api_actor_label` (string, optional, nullable)
          - EXTERNAL
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - SCHEDULED
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `trigger_id` (string, optional, nullable)
          - INTEGRATION
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `trigger_id` (string, optional, nullable)
        - `links` (list of object, optional, nullable)
          - `trace_id` (string, required)
          - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
            - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
          - `span_context` (object or object or object or object or object or object or object or object or object, required)
            - WORKFLOW
            - WORKFLOW_NODE
            - WORKFLOW_RELEASE_TAG
            - WORKFLOW_SANDBOX
            - PROMPT_RELEASE_TAG
            - API_REQUEST
            - EXTERNAL
            - SCHEDULED
            - INTEGRATION
        - `api_version` (enum, optional) — * `2024-10-25` - V2024_10_25 * `2025-07-30` - V2025_07_30
          - Allowed values: `2024-10-25`, `2025-07-30`
      - workflow.execution.resumed
        - `name` (enum, required)
          - Allowed values: `workflow.execution.resumed`
        - `body` (object, required)
          - `workflow_definition` (object, required)
            - `name` (string, required)
            - `module` (list of string, required) — The module that this resource is defined in.
            - `id` (string, required)
            - `exclude_from_monitoring` (boolean, optional, nullable) — Whether this node should be excluded from monitoring views.
        - `id` (string, required)
        - `timestamp` (string, required)
        - `trace_id` (string, required)
        - `span_id` (string, required)
        - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
          - WORKFLOW
            - `workflow_definition` (object, required)
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - WORKFLOW_NODE
            - `node_definition` (object, required)
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - WORKFLOW_RELEASE_TAG
            - `type` (enum, required)
            - `span_id` (string, required)
            - `deployment_id` (string, required)
            - `deployment_name` (string, required)
            - `deployment_history_item_id` (string, required)
            - `release_tag_id` (string, required)
            - `release_tag_name` (string, required)
            - `workflow_version_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `external_id` (string, optional, nullable)
            - `metadata` (map from string to any, optional, nullable)
          - WORKFLOW_SANDBOX
            - `type` (enum, required)
            - `span_id` (string, required)
            - `sandbox_id` (string, required)
            - `sandbox_history_item_id` (string, required)
            - `scenario_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - PROMPT_RELEASE_TAG
            - `type` (enum, required)
            - `span_id` (string, required)
            - `deployment_id` (string, required)
            - `deployment_name` (string, required)
            - `deployment_history_item_id` (string, required)
            - `release_tag_id` (string, required)
            - `release_tag_name` (string, required)
            - `prompt_version_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `external_id` (string, optional, nullable)
            - `metadata` (map from string to any, optional, nullable)
          - API_REQUEST
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `api_actor_id` (string, optional, nullable)
            - `api_actor_type` (enum, optional, nullable) — * `ANONYMOUS` - ANONYMOUS * `WORKSPACE_API_KEY` - WORKSPACE_API_KEY * `ENVIRONMENT_API_KEY` - ENVIRONMENT_API_KEY * `JWT` - JWT * `SERVICE_TOKEN` - SERVICE_TOKEN
            - `api_actor_label` (string, optional, nullable)
          - EXTERNAL
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - SCHEDULED
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `trigger_id` (string, optional, nullable)
          - INTEGRATION
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `trigger_id` (string, optional, nullable)
        - `links` (list of object, optional, nullable)
          - `trace_id` (string, required)
          - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
            - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
          - `span_context` (object or object or object or object or object or object or object or object or object, required)
            - WORKFLOW
            - WORKFLOW_NODE
            - WORKFLOW_RELEASE_TAG
            - WORKFLOW_SANDBOX
            - PROMPT_RELEASE_TAG
            - API_REQUEST
            - EXTERNAL
            - SCHEDULED
            - INTEGRATION
        - `api_version` (enum, optional) — * `2024-10-25` - V2024_10_25 * `2025-07-30` - V2025_07_30
          - Allowed values: `2024-10-25`, `2025-07-30`
      - workflow.execution.snapshotted
        - `name` (enum, required)
          - Allowed values: `workflow.execution.snapshotted`
        - `body` (object, required)
          - `workflow_definition` (object, required)
            - `name` (string, required)
            - `module` (list of string, required) — The module that this resource is defined in.
            - `id` (string, required)
            - `exclude_from_monitoring` (boolean, optional, nullable) — Whether this node should be excluded from monitoring views.
          - `state` (map from string to any, required)
          - `edited_by` (object, optional, nullable)
            - `name` (string, required)
            - `module` (list of string, required) — The module that this resource is defined in.
            - `id` (string, required)
            - `exclude_from_monitoring` (boolean, optional, nullable) — Whether this node should be excluded from monitoring views.
        - `id` (string, required)
        - `timestamp` (string, required)
        - `trace_id` (string, required)
        - `span_id` (string, required)
        - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
          - WORKFLOW
            - `workflow_definition` (object, required)
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - WORKFLOW_NODE
            - `node_definition` (object, required)
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - WORKFLOW_RELEASE_TAG
            - `type` (enum, required)
            - `span_id` (string, required)
            - `deployment_id` (string, required)
            - `deployment_name` (string, required)
            - `deployment_history_item_id` (string, required)
            - `release_tag_id` (string, required)
            - `release_tag_name` (string, required)
            - `workflow_version_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `external_id` (string, optional, nullable)
            - `metadata` (map from string to any, optional, nullable)
          - WORKFLOW_SANDBOX
            - `type` (enum, required)
            - `span_id` (string, required)
            - `sandbox_id` (string, required)
            - `sandbox_history_item_id` (string, required)
            - `scenario_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - PROMPT_RELEASE_TAG
            - `type` (enum, required)
            - `span_id` (string, required)
            - `deployment_id` (string, required)
            - `deployment_name` (string, required)
            - `deployment_history_item_id` (string, required)
            - `release_tag_id` (string, required)
            - `release_tag_name` (string, required)
            - `prompt_version_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `external_id` (string, optional, nullable)
            - `metadata` (map from string to any, optional, nullable)
          - API_REQUEST
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `api_actor_id` (string, optional, nullable)
            - `api_actor_type` (enum, optional, nullable) — * `ANONYMOUS` - ANONYMOUS * `WORKSPACE_API_KEY` - WORKSPACE_API_KEY * `ENVIRONMENT_API_KEY` - ENVIRONMENT_API_KEY * `JWT` - JWT * `SERVICE_TOKEN` - SERVICE_TOKEN
            - `api_actor_label` (string, optional, nullable)
          - EXTERNAL
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - SCHEDULED
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `trigger_id` (string, optional, nullable)
          - INTEGRATION
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `trigger_id` (string, optional, nullable)
        - `links` (list of object, optional, nullable)
          - `trace_id` (string, required)
          - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
            - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
          - `span_context` (object or object or object or object or object or object or object or object or object, required)
            - WORKFLOW
            - WORKFLOW_NODE
            - WORKFLOW_RELEASE_TAG
            - WORKFLOW_SANDBOX
            - PROMPT_RELEASE_TAG
            - API_REQUEST
            - EXTERNAL
            - SCHEDULED
            - INTEGRATION
        - `api_version` (enum, optional) — * `2024-10-25` - V2024_10_25 * `2025-07-30` - V2025_07_30
          - Allowed values: `2024-10-25`, `2025-07-30`
    - `attributes` (object, required)
      - `label` (string, required)
      - `workflow_id` (string, required)
    - `span_id` (string, required)
    - `start_ts` (string, required)
    - `end_ts` (string, required)
    - `parent_span_id` (string, required, nullable)
    - `usage_result` (object, optional, nullable)
      - `usage` (list of object, required)
        - `ml_model_name` (string, required)
        - `ml_model_usage` (object, required)
          - `output_token_count` (integer, optional, nullable)
          - `input_token_count` (integer, optional, nullable)
          - `input_char_count` (integer, optional, nullable)
          - `output_char_count` (integer, optional, nullable)
          - `compute_nanos` (integer, optional, nullable)
          - `cache_creation_input_tokens` (integer, optional, nullable)
          - `cache_read_input_tokens` (integer, optional, nullable)
      - `cost` (list of object, required)
        - `value` (double, required)
        - `unit` (enum, required) — * `USD` - USD
          - Allowed values: `USD`
  - node.execution
    - `name` (enum, required)
      - Allowed values: `node.execution`
    - `events` (list of object or object or object or object or object or object or object, required)
      - node.execution.initiated
        - `name` (enum, required)
          - Allowed values: `node.execution.initiated`
        - `body` (object, required)
          - `node_definition` (object, required)
            - `name` (string, required)
            - `module` (list of string, required) — The module that this resource is defined in.
            - `id` (string, required)
            - `exclude_from_monitoring` (boolean, optional, nullable) — Whether this node should be excluded from monitoring views.
          - `inputs` (map from string to any, required)
        - `id` (string, required)
        - `timestamp` (string, required)
        - `trace_id` (string, required)
        - `span_id` (string, required)
        - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
          - WORKFLOW
            - `workflow_definition` (object, required)
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - WORKFLOW_NODE
            - `node_definition` (object, required)
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - WORKFLOW_RELEASE_TAG
            - `type` (enum, required)
            - `span_id` (string, required)
            - `deployment_id` (string, required)
            - `deployment_name` (string, required)
            - `deployment_history_item_id` (string, required)
            - `release_tag_id` (string, required)
            - `release_tag_name` (string, required)
            - `workflow_version_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `external_id` (string, optional, nullable)
            - `metadata` (map from string to any, optional, nullable)
          - WORKFLOW_SANDBOX
            - `type` (enum, required)
            - `span_id` (string, required)
            - `sandbox_id` (string, required)
            - `sandbox_history_item_id` (string, required)
            - `scenario_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - PROMPT_RELEASE_TAG
            - `type` (enum, required)
            - `span_id` (string, required)
            - `deployment_id` (string, required)
            - `deployment_name` (string, required)
            - `deployment_history_item_id` (string, required)
            - `release_tag_id` (string, required)
            - `release_tag_name` (string, required)
            - `prompt_version_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `external_id` (string, optional, nullable)
            - `metadata` (map from string to any, optional, nullable)
          - API_REQUEST
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `api_actor_id` (string, optional, nullable)
            - `api_actor_type` (enum, optional, nullable) — * `ANONYMOUS` - ANONYMOUS * `WORKSPACE_API_KEY` - WORKSPACE_API_KEY * `ENVIRONMENT_API_KEY` - ENVIRONMENT_API_KEY * `JWT` - JWT * `SERVICE_TOKEN` - SERVICE_TOKEN
            - `api_actor_label` (string, optional, nullable)
          - EXTERNAL
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - SCHEDULED
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `trigger_id` (string, optional, nullable)
          - INTEGRATION
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `trigger_id` (string, optional, nullable)
        - `links` (list of object, optional, nullable)
          - `trace_id` (string, required)
          - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
            - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
          - `span_context` (object or object or object or object or object or object or object or object or object, required)
            - WORKFLOW
            - WORKFLOW_NODE
            - WORKFLOW_RELEASE_TAG
            - WORKFLOW_SANDBOX
            - PROMPT_RELEASE_TAG
            - API_REQUEST
            - EXTERNAL
            - SCHEDULED
            - INTEGRATION
        - `api_version` (enum, optional) — * `2024-10-25` - V2024_10_25 * `2025-07-30` - V2025_07_30
          - Allowed values: `2024-10-25`, `2025-07-30`
      - node.execution.streaming
        - `name` (enum, required)
          - Allowed values: `node.execution.streaming`
        - `body` (object, required)
          - `node_definition` (object, required)
            - `name` (string, required)
            - `module` (list of string, required) — The module that this resource is defined in.
            - `id` (string, required)
            - `exclude_from_monitoring` (boolean, optional, nullable) — Whether this node should be excluded from monitoring views.
          - `output` (object, required)
            - `name` (string, required)
            - `value` (any, optional, nullable)
            - `delta` (any, optional, nullable)
        - `id` (string, required)
        - `timestamp` (string, required)
        - `trace_id` (string, required)
        - `span_id` (string, required)
        - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
          - WORKFLOW
            - `workflow_definition` (object, required)
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - WORKFLOW_NODE
            - `node_definition` (object, required)
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - WORKFLOW_RELEASE_TAG
            - `type` (enum, required)
            - `span_id` (string, required)
            - `deployment_id` (string, required)
            - `deployment_name` (string, required)
            - `deployment_history_item_id` (string, required)
            - `release_tag_id` (string, required)
            - `release_tag_name` (string, required)
            - `workflow_version_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `external_id` (string, optional, nullable)
            - `metadata` (map from string to any, optional, nullable)
          - WORKFLOW_SANDBOX
            - `type` (enum, required)
            - `span_id` (string, required)
            - `sandbox_id` (string, required)
            - `sandbox_history_item_id` (string, required)
            - `scenario_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - PROMPT_RELEASE_TAG
            - `type` (enum, required)
            - `span_id` (string, required)
            - `deployment_id` (string, required)
            - `deployment_name` (string, required)
            - `deployment_history_item_id` (string, required)
            - `release_tag_id` (string, required)
            - `release_tag_name` (string, required)
            - `prompt_version_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `external_id` (string, optional, nullable)
            - `metadata` (map from string to any, optional, nullable)
          - API_REQUEST
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `api_actor_id` (string, optional, nullable)
            - `api_actor_type` (enum, optional, nullable) — * `ANONYMOUS` - ANONYMOUS * `WORKSPACE_API_KEY` - WORKSPACE_API_KEY * `ENVIRONMENT_API_KEY` - ENVIRONMENT_API_KEY * `JWT` - JWT * `SERVICE_TOKEN` - SERVICE_TOKEN
            - `api_actor_label` (string, optional, nullable)
          - EXTERNAL
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - SCHEDULED
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `trigger_id` (string, optional, nullable)
          - INTEGRATION
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `trigger_id` (string, optional, nullable)
        - `links` (list of object, optional, nullable)
          - `trace_id` (string, required)
          - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
            - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
          - `span_context` (object or object or object or object or object or object or object or object or object, required)
            - WORKFLOW
            - WORKFLOW_NODE
            - WORKFLOW_RELEASE_TAG
            - WORKFLOW_SANDBOX
            - PROMPT_RELEASE_TAG
            - API_REQUEST
            - EXTERNAL
            - SCHEDULED
            - INTEGRATION
        - `api_version` (enum, optional) — * `2024-10-25` - V2024_10_25 * `2025-07-30` - V2025_07_30
          - Allowed values: `2024-10-25`, `2025-07-30`
      - node.execution.fulfilled
        - `name` (enum, required)
          - Allowed values: `node.execution.fulfilled`
        - `body` (object, required)
          - `node_definition` (object, required)
            - `name` (string, required)
            - `module` (list of string, required) — The module that this resource is defined in.
            - `id` (string, required)
            - `exclude_from_monitoring` (boolean, optional, nullable) — Whether this node should be excluded from monitoring views.
          - `outputs` (map from string to any, required)
          - `invoked_ports` (list of object, optional, nullable)
            - `name` (string, required)
          - `mocked` (boolean, optional, nullable)
          - `redacted` (boolean, optional, nullable)
        - `id` (string, required)
        - `timestamp` (string, required)
        - `trace_id` (string, required)
        - `span_id` (string, required)
        - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
          - WORKFLOW
            - `workflow_definition` (object, required)
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - WORKFLOW_NODE
            - `node_definition` (object, required)
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - WORKFLOW_RELEASE_TAG
            - `type` (enum, required)
            - `span_id` (string, required)
            - `deployment_id` (string, required)
            - `deployment_name` (string, required)
            - `deployment_history_item_id` (string, required)
            - `release_tag_id` (string, required)
            - `release_tag_name` (string, required)
            - `workflow_version_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `external_id` (string, optional, nullable)
            - `metadata` (map from string to any, optional, nullable)
          - WORKFLOW_SANDBOX
            - `type` (enum, required)
            - `span_id` (string, required)
            - `sandbox_id` (string, required)
            - `sandbox_history_item_id` (string, required)
            - `scenario_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - PROMPT_RELEASE_TAG
            - `type` (enum, required)
            - `span_id` (string, required)
            - `deployment_id` (string, required)
            - `deployment_name` (string, required)
            - `deployment_history_item_id` (string, required)
            - `release_tag_id` (string, required)
            - `release_tag_name` (string, required)
            - `prompt_version_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `external_id` (string, optional, nullable)
            - `metadata` (map from string to any, optional, nullable)
          - API_REQUEST
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `api_actor_id` (string, optional, nullable)
            - `api_actor_type` (enum, optional, nullable) — * `ANONYMOUS` - ANONYMOUS * `WORKSPACE_API_KEY` - WORKSPACE_API_KEY * `ENVIRONMENT_API_KEY` - ENVIRONMENT_API_KEY * `JWT` - JWT * `SERVICE_TOKEN` - SERVICE_TOKEN
            - `api_actor_label` (string, optional, nullable)
          - EXTERNAL
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - SCHEDULED
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `trigger_id` (string, optional, nullable)
          - INTEGRATION
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `trigger_id` (string, optional, nullable)
        - `links` (list of object, optional, nullable)
          - `trace_id` (string, required)
          - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
            - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
          - `span_context` (object or object or object or object or object or object or object or object or object, required)
            - WORKFLOW
            - WORKFLOW_NODE
            - WORKFLOW_RELEASE_TAG
            - WORKFLOW_SANDBOX
            - PROMPT_RELEASE_TAG
            - API_REQUEST
            - EXTERNAL
            - SCHEDULED
            - INTEGRATION
        - `api_version` (enum, optional) — * `2024-10-25` - V2024_10_25 * `2025-07-30` - V2025_07_30
          - Allowed values: `2024-10-25`, `2025-07-30`
      - node.execution.rejected
        - `name` (enum, required)
          - Allowed values: `node.execution.rejected`
        - `body` (object, required)
          - `node_definition` (object, required)
            - `name` (string, required)
            - `module` (list of string, required) — The module that this resource is defined in.
            - `id` (string, required)
            - `exclude_from_monitoring` (boolean, optional, nullable) — Whether this node should be excluded from monitoring views.
          - `error` (object, required)
            - `message` (string, required)
            - `code` (enum, required) — * `INVALID_WORKFLOW` - INVALID_WORKFLOW * `INVALID_INPUTS` - INVALID_INPUTS * `INVALID_OUTPUTS` - INVALID_OUTPUTS * `INVALID_STATE` - INVALID_STATE * `INVALID_CODE` - INVALID_CODE * `INVALID_TEMPLATE` - INVALID_TEMPLATE * `INTERNAL_ERROR` - INTERNAL_ERROR * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `PROVIDER_ERROR` - PROVIDER_ERROR * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `WORKFLOW_TIMEOUT` - WORKFLOW_TIMEOUT * `NODE_CANCELLED` - NODE_CANCELLED * `NODE_TIMEOUT` - NODE_TIMEOUT * `NODE_EXECUTION` - NODE_EXECUTION
            - `raw_data` (map from string to any or string, optional, nullable)
          - `stacktrace` (string, optional, nullable)
        - `id` (string, required)
        - `timestamp` (string, required)
        - `trace_id` (string, required)
        - `span_id` (string, required)
        - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
          - WORKFLOW
            - `workflow_definition` (object, required)
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - WORKFLOW_NODE
            - `node_definition` (object, required)
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - WORKFLOW_RELEASE_TAG
            - `type` (enum, required)
            - `span_id` (string, required)
            - `deployment_id` (string, required)
            - `deployment_name` (string, required)
            - `deployment_history_item_id` (string, required)
            - `release_tag_id` (string, required)
            - `release_tag_name` (string, required)
            - `workflow_version_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `external_id` (string, optional, nullable)
            - `metadata` (map from string to any, optional, nullable)
          - WORKFLOW_SANDBOX
            - `type` (enum, required)
            - `span_id` (string, required)
            - `sandbox_id` (string, required)
            - `sandbox_history_item_id` (string, required)
            - `scenario_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - PROMPT_RELEASE_TAG
            - `type` (enum, required)
            - `span_id` (string, required)
            - `deployment_id` (string, required)
            - `deployment_name` (string, required)
            - `deployment_history_item_id` (string, required)
            - `release_tag_id` (string, required)
            - `release_tag_name` (string, required)
            - `prompt_version_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `external_id` (string, optional, nullable)
            - `metadata` (map from string to any, optional, nullable)
          - API_REQUEST
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `api_actor_id` (string, optional, nullable)
            - `api_actor_type` (enum, optional, nullable) — * `ANONYMOUS` - ANONYMOUS * `WORKSPACE_API_KEY` - WORKSPACE_API_KEY * `ENVIRONMENT_API_KEY` - ENVIRONMENT_API_KEY * `JWT` - JWT * `SERVICE_TOKEN` - SERVICE_TOKEN
            - `api_actor_label` (string, optional, nullable)
          - EXTERNAL
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - SCHEDULED
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `trigger_id` (string, optional, nullable)
          - INTEGRATION
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `trigger_id` (string, optional, nullable)
        - `links` (list of object, optional, nullable)
          - `trace_id` (string, required)
          - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
            - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
          - `span_context` (object or object or object or object or object or object or object or object or object, required)
            - WORKFLOW
            - WORKFLOW_NODE
            - WORKFLOW_RELEASE_TAG
            - WORKFLOW_SANDBOX
            - PROMPT_RELEASE_TAG
            - API_REQUEST
            - EXTERNAL
            - SCHEDULED
            - INTEGRATION
        - `api_version` (enum, optional) — * `2024-10-25` - V2024_10_25 * `2025-07-30` - V2025_07_30
          - Allowed values: `2024-10-25`, `2025-07-30`
      - node.execution.paused
        - `name` (enum, required)
          - Allowed values: `node.execution.paused`
        - `body` (object, required)
          - `node_definition` (object, required)
            - `name` (string, required)
            - `module` (list of string, required) — The module that this resource is defined in.
            - `id` (string, required)
            - `exclude_from_monitoring` (boolean, optional, nullable) — Whether this node should be excluded from monitoring views.
        - `id` (string, required)
        - `timestamp` (string, required)
        - `trace_id` (string, required)
        - `span_id` (string, required)
        - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
          - WORKFLOW
            - `workflow_definition` (object, required)
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - WORKFLOW_NODE
            - `node_definition` (object, required)
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - WORKFLOW_RELEASE_TAG
            - `type` (enum, required)
            - `span_id` (string, required)
            - `deployment_id` (string, required)
            - `deployment_name` (string, required)
            - `deployment_history_item_id` (string, required)
            - `release_tag_id` (string, required)
            - `release_tag_name` (string, required)
            - `workflow_version_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `external_id` (string, optional, nullable)
            - `metadata` (map from string to any, optional, nullable)
          - WORKFLOW_SANDBOX
            - `type` (enum, required)
            - `span_id` (string, required)
            - `sandbox_id` (string, required)
            - `sandbox_history_item_id` (string, required)
            - `scenario_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - PROMPT_RELEASE_TAG
            - `type` (enum, required)
            - `span_id` (string, required)
            - `deployment_id` (string, required)
            - `deployment_name` (string, required)
            - `deployment_history_item_id` (string, required)
            - `release_tag_id` (string, required)
            - `release_tag_name` (string, required)
            - `prompt_version_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `external_id` (string, optional, nullable)
            - `metadata` (map from string to any, optional, nullable)
          - API_REQUEST
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `api_actor_id` (string, optional, nullable)
            - `api_actor_type` (enum, optional, nullable) — * `ANONYMOUS` - ANONYMOUS * `WORKSPACE_API_KEY` - WORKSPACE_API_KEY * `ENVIRONMENT_API_KEY` - ENVIRONMENT_API_KEY * `JWT` - JWT * `SERVICE_TOKEN` - SERVICE_TOKEN
            - `api_actor_label` (string, optional, nullable)
          - EXTERNAL
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - SCHEDULED
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `trigger_id` (string, optional, nullable)
          - INTEGRATION
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `trigger_id` (string, optional, nullable)
        - `links` (list of object, optional, nullable)
          - `trace_id` (string, required)
          - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
            - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
          - `span_context` (object or object or object or object or object or object or object or object or object, required)
            - WORKFLOW
            - WORKFLOW_NODE
            - WORKFLOW_RELEASE_TAG
            - WORKFLOW_SANDBOX
            - PROMPT_RELEASE_TAG
            - API_REQUEST
            - EXTERNAL
            - SCHEDULED
            - INTEGRATION
        - `api_version` (enum, optional) — * `2024-10-25` - V2024_10_25 * `2025-07-30` - V2025_07_30
          - Allowed values: `2024-10-25`, `2025-07-30`
      - node.execution.resumed
        - `name` (enum, required)
          - Allowed values: `node.execution.resumed`
        - `body` (object, required)
          - `node_definition` (object, required)
            - `name` (string, required)
            - `module` (list of string, required) — The module that this resource is defined in.
            - `id` (string, required)
            - `exclude_from_monitoring` (boolean, optional, nullable) — Whether this node should be excluded from monitoring views.
        - `id` (string, required)
        - `timestamp` (string, required)
        - `trace_id` (string, required)
        - `span_id` (string, required)
        - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
          - WORKFLOW
            - `workflow_definition` (object, required)
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - WORKFLOW_NODE
            - `node_definition` (object, required)
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - WORKFLOW_RELEASE_TAG
            - `type` (enum, required)
            - `span_id` (string, required)
            - `deployment_id` (string, required)
            - `deployment_name` (string, required)
            - `deployment_history_item_id` (string, required)
            - `release_tag_id` (string, required)
            - `release_tag_name` (string, required)
            - `workflow_version_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `external_id` (string, optional, nullable)
            - `metadata` (map from string to any, optional, nullable)
          - WORKFLOW_SANDBOX
            - `type` (enum, required)
            - `span_id` (string, required)
            - `sandbox_id` (string, required)
            - `sandbox_history_item_id` (string, required)
            - `scenario_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - PROMPT_RELEASE_TAG
            - `type` (enum, required)
            - `span_id` (string, required)
            - `deployment_id` (string, required)
            - `deployment_name` (string, required)
            - `deployment_history_item_id` (string, required)
            - `release_tag_id` (string, required)
            - `release_tag_name` (string, required)
            - `prompt_version_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `external_id` (string, optional, nullable)
            - `metadata` (map from string to any, optional, nullable)
          - API_REQUEST
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `api_actor_id` (string, optional, nullable)
            - `api_actor_type` (enum, optional, nullable) — * `ANONYMOUS` - ANONYMOUS * `WORKSPACE_API_KEY` - WORKSPACE_API_KEY * `ENVIRONMENT_API_KEY` - ENVIRONMENT_API_KEY * `JWT` - JWT * `SERVICE_TOKEN` - SERVICE_TOKEN
            - `api_actor_label` (string, optional, nullable)
          - EXTERNAL
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - SCHEDULED
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `trigger_id` (string, optional, nullable)
          - INTEGRATION
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `trigger_id` (string, optional, nullable)
        - `links` (list of object, optional, nullable)
          - `trace_id` (string, required)
          - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
            - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
          - `span_context` (object or object or object or object or object or object or object or object or object, required)
            - WORKFLOW
            - WORKFLOW_NODE
            - WORKFLOW_RELEASE_TAG
            - WORKFLOW_SANDBOX
            - PROMPT_RELEASE_TAG
            - API_REQUEST
            - EXTERNAL
            - SCHEDULED
            - INTEGRATION
        - `api_version` (enum, optional) — * `2024-10-25` - V2024_10_25 * `2025-07-30` - V2025_07_30
          - Allowed values: `2024-10-25`, `2025-07-30`
      - node.execution.log
        - `name` (enum, required)
          - Allowed values: `node.execution.log`
        - `body` (object, required)
          - `node_definition` (object, required)
            - `name` (string, required)
            - `module` (list of string, required) — The module that this resource is defined in.
            - `id` (string, required)
            - `exclude_from_monitoring` (boolean, optional, nullable) — Whether this node should be excluded from monitoring views.
          - `message` (string, required)
          - `severity` (enum, required) — * `DEBUG` - DEBUG * `INFO` - INFO * `WARNING` - WARNING * `ERROR` - ERROR
            - Allowed values: `DEBUG`, `INFO`, `WARNING`, `ERROR`
          - `attributes` (map from string to any, optional, nullable)
        - `id` (string, required)
        - `timestamp` (string, required)
        - `trace_id` (string, required)
        - `span_id` (string, required)
        - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
          - WORKFLOW
            - `workflow_definition` (object, required)
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - WORKFLOW_NODE
            - `node_definition` (object, required)
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - WORKFLOW_RELEASE_TAG
            - `type` (enum, required)
            - `span_id` (string, required)
            - `deployment_id` (string, required)
            - `deployment_name` (string, required)
            - `deployment_history_item_id` (string, required)
            - `release_tag_id` (string, required)
            - `release_tag_name` (string, required)
            - `workflow_version_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `external_id` (string, optional, nullable)
            - `metadata` (map from string to any, optional, nullable)
          - WORKFLOW_SANDBOX
            - `type` (enum, required)
            - `span_id` (string, required)
            - `sandbox_id` (string, required)
            - `sandbox_history_item_id` (string, required)
            - `scenario_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - PROMPT_RELEASE_TAG
            - `type` (enum, required)
            - `span_id` (string, required)
            - `deployment_id` (string, required)
            - `deployment_name` (string, required)
            - `deployment_history_item_id` (string, required)
            - `release_tag_id` (string, required)
            - `release_tag_name` (string, required)
            - `prompt_version_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `external_id` (string, optional, nullable)
            - `metadata` (map from string to any, optional, nullable)
          - API_REQUEST
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `api_actor_id` (string, optional, nullable)
            - `api_actor_type` (enum, optional, nullable) — * `ANONYMOUS` - ANONYMOUS * `WORKSPACE_API_KEY` - WORKSPACE_API_KEY * `ENVIRONMENT_API_KEY` - ENVIRONMENT_API_KEY * `JWT` - JWT * `SERVICE_TOKEN` - SERVICE_TOKEN
            - `api_actor_label` (string, optional, nullable)
          - EXTERNAL
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
          - SCHEDULED
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `trigger_id` (string, optional, nullable)
          - INTEGRATION
            - `type` (enum, required)
            - `span_id` (string, required)
            - `parent` (object or object or object or object or object or object or object or object or object, optional, nullable)
            - `links` (list of object, optional, nullable)
            - `trigger_id` (string, optional, nullable)
        - `links` (list of object, optional, nullable)
          - `trace_id` (string, required)
          - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
            - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
          - `span_context` (object or object or object or object or object or object or object or object or object, required)
            - WORKFLOW
            - WORKFLOW_NODE
            - WORKFLOW_RELEASE_TAG
            - WORKFLOW_SANDBOX
            - PROMPT_RELEASE_TAG
            - API_REQUEST
            - EXTERNAL
            - SCHEDULED
            - INTEGRATION
        - `api_version` (enum, optional) — * `2024-10-25` - V2024_10_25 * `2025-07-30` - V2025_07_30
          - Allowed values: `2024-10-25`, `2025-07-30`
    - `attributes` (object, required)
      - `label` (string, required)
      - `node_id` (string, required)
      - `filepath` (string, optional, nullable)
    - `span_id` (string, required)
    - `start_ts` (string, required)
    - `end_ts` (string, required)
    - `parent_span_id` (string, required, nullable)
    - `usage_result` (object, optional, nullable)
      - `usage` (list of object, required)
        - `ml_model_name` (string, required)
        - `ml_model_usage` (object, required)
          - `output_token_count` (integer, optional, nullable)
          - `input_token_count` (integer, optional, nullable)
          - `input_char_count` (integer, optional, nullable)
          - `output_char_count` (integer, optional, nullable)
          - `compute_nanos` (integer, optional, nullable)
          - `cache_creation_input_tokens` (integer, optional, nullable)
          - `cache_read_input_tokens` (integer, optional, nullable)
      - `cost` (list of object, required)
        - `value` (double, required)
        - `unit` (enum, required) — * `USD` - USD
          - Allowed values: `USD`
- `state` (map from string to any, optional, nullable)

## Errors

### 400 Bad Request Error

- `detail` (string, required) — Message informing the user of the error.

### 404 Not Found Error

- `detail` (string, required) — Message informing the user of the error.

### 421 Misdirected Request Error

- `update_active_workspace_id` (string, required, nullable) — The id of the workspace that the user should update to, or null if no workspace change needed.
- `update_active_environment_id` (string, required, nullable) — The id of the environment that the user should update to, or null if no environment change needed.
- `is_staff` (boolean, optional) — Whether or not the user is a staff member of Vellum.

## Examples

**Response**

```json
{
  "span_id": "string",
  "start": "2024-01-15T09:30:00Z",
  "end": "2024-01-15T09:30:00Z",
  "inputs": [
    {
      "id": "string",
      "name": "string",
      "type": "STRING",
      "value": "string"
    }
  ],
  "outputs": [
    {
      "id": "string",
      "name": "string",
      "type": "STRING",
      "value": "string"
    }
  ],
  "error": {
    "message": "string",
    "raw_data": {},
    "code": "WORKFLOW_INITIALIZATION",
    "stacktrace": "string"
  },
  "usage_results": [
    {
      "usage": [
        {
          "ml_model_name": "string",
          "ml_model_usage": {
            "output_token_count": 1,
            "input_token_count": 1,
            "input_char_count": 1,
            "output_char_count": 1,
            "compute_nanos": 1,
            "cache_creation_input_tokens": 1,
            "cache_read_input_tokens": 1
          }
        }
      ],
      "cost": [
        {
          "value": 1.1,
          "unit": "USD"
        }
      ],
      "error": {
        "code": "UNKNOWN",
        "message": "string"
      }
    }
  ],
  "parent_context": {
    "type": "WORKFLOW_RELEASE_TAG",
    "span_id": "string",
    "deployment_id": "string",
    "deployment_name": "string",
    "deployment_history_item_id": "string",
    "release_tag_id": "string",
    "release_tag_name": "string",
    "workflow_version_id": "string",
    "parent": {},
    "links": [
      {
        "trace_id": "string",
        "type": "TRIGGERED_BY"
      }
    ],
    "external_id": "string",
    "metadata": {}
  },
  "latest_actual": {
    "output": {
      "id": "string",
      "name": "string",
      "type": "STRING",
      "value": "string"
    },
    "timestamp": "2024-01-15T09:30:00Z",
    "metadata": {},
    "quality": 1.1
  },
  "metric_results": [
    {
      "outputs": [
        {
          "id": "string",
          "name": "string",
          "type": "STRING",
          "value": "string"
        }
      ],
      "label": "string",
      "metric_id": "string"
    }
  ],
  "spans": [
    {
      "name": "workflow.execution",
      "events": [
        {
          "parent": {
            "parent": {},
            "links": [
              {
                "trace_id": "string",
                "type": "TRIGGERED_BY"
              }
            ],
            "workflow_definition": {
              "name": "string",
              "module": [
                "string"
              ],
              "exclude_from_monitoring": true,
              "id": "string"
            },
            "type": "WORKFLOW",
            "span_id": "string"
          },
          "links": [
            {
              "trace_id": "string",
              "type": "TRIGGERED_BY",
              "span_context": {
                "parent": {},
                "links": [
                  null
                ],
                "workflow_definition": {
                  "name": "string",
                  "module": [
                    "string"
                  ],
                  "exclude_from_monitoring": true,
                  "id": "string"
                },
                "type": "WORKFLOW",
                "span_id": "string"
              }
            }
          ],
          "name": "workflow.execution.initiated",
          "body": {
            "workflow_definition": {
              "name": "string",
              "module": [
                "string"
              ],
              "exclude_from_monitoring": true,
              "id": "string"
            },
            "inputs": {},
            "trigger": {
              "name": "string",
              "module": [
                "string"
              ],
              "exclude_from_monitoring": true,
              "id": "string"
            }
          },
          "id": "string",
          "timestamp": "2024-01-15T09:30:00Z",
          "api_version": "2024-10-25",
          "trace_id": "string",
          "span_id": "string"
        }
      ],
      "attributes": {
        "label": "string",
        "workflow_id": "string"
      },
      "usage_result": {
        "usage": [
          {
            "ml_model_name": "string",
            "ml_model_usage": {
              "output_token_count": 1,
              "input_token_count": 1,
              "input_char_count": 1,
              "output_char_count": 1,
              "compute_nanos": 1,
              "cache_creation_input_tokens": 1,
              "cache_read_input_tokens": 1
            }
          }
        ],
        "cost": [
          {
            "value": 1.1,
            "unit": "USD"
          }
        ]
      },
      "span_id": "string",
      "start_ts": "2024-01-15T09:30:00Z",
      "end_ts": "2024-01-15T09:30:00Z",
      "parent_span_id": "string"
    }
  ],
  "state": {}
}
```

**SDK Code**

```python
import requests

url = "https://api.vellum.ai/v1/workflow-deployments/id/execution-events/execution_id"

headers = {"X-API-KEY": "<apiKey>"}

response = requests.get(url, headers=headers)

print(response.json())
```

```typescript
import { VellumClient } from "vellum-ai";

const client = new VellumClient({ apiKey: "YOUR_API_KEY", apiVersion: "YOUR_API_VERSION" });
await client.workflowDeployments.workflowDeploymentEventExecution("execution_id", "id");

```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.vellum.ai/v1/workflow-deployments/id/execution-events/execution_id"

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

url = URI("https://api.vellum.ai/v1/workflow-deployments/id/execution-events/execution_id")

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

HttpResponse<String> response = Unirest.get("https://api.vellum.ai/v1/workflow-deployments/id/execution-events/execution_id")
  .header("X-API-KEY", "<apiKey>")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.vellum.ai/v1/workflow-deployments/id/execution-events/execution_id', [
  'headers' => [
    'X-API-KEY' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
using RestSharp;

var client = new RestClient("https://api.vellum.ai/v1/workflow-deployments/id/execution-events/execution_id");
var request = new RestRequest(Method.GET);
request.AddHeader("X-API-KEY", "<apiKey>");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["X-API-KEY": "<apiKey>"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.vellum.ai/v1/workflow-deployments/id/execution-events/execution_id")! as URL,
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