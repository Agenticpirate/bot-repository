> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Upsert Test Cases

POST https://api.vellum.ai/v1/test-suites/{id}/test-cases
Content-Type: application/json

Upserts a new test case for a test suite, keying off of the optionally provided test case id.

If an id is provided and has a match, the test case will be updated. If no id is provided or no match
is found, a new test case will be appended to the end.

Note that a full replacement of the test case is performed, so any fields not provided will be removed
or overwritten with default values.

Reference: https://docs.vellum.ai/developers/client-sdk/test-suites/test-cases/upsert

## Authentication

- `X-API-KEY` header (required) — API Key authentication via header

## Request

### Path parameters

- `id` (string, required) — Either the Test Suites' ID or its unique name

### Body (application/json)

This endpoint expects an object.

- `input_values` (list of object or object or object or object or object or object or object or object or object or object or object or object, required) — Values for each of the Test Case's input variables
  - STRING
    - `type` (enum, required)
      - Allowed values: `STRING`
    - `value` (string, required, nullable)
    - `name` (string, required)
  - NUMBER
    - `type` (enum, required)
      - Allowed values: `NUMBER`
    - `value` (double, required, nullable)
    - `name` (string, required)
  - JSON
    - `type` (enum, required)
      - Allowed values: `JSON`
    - `value` (any, required, nullable)
    - `name` (string, required)
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
    - `name` (string, required)
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
            - `document_type` (enum, required)
            - `start_page_num` (integer, required, nullable) — The 1-indexed page number where the chunk starts in the document. Only available for supported chunking strategies and document types.
            - `end_page_num` (integer, required, nullable) — The 1-indexed page number where the chunk ends in the document. Only available for supported chunking strategies and document types.
    - `name` (string, required)
  - ERROR
    - `type` (enum, required)
      - Allowed values: `ERROR`
    - `value` (object, required, nullable)
      - `code` (enum, required) — * `INVALID_REQUEST` - INVALID_REQUEST * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_ERROR` - PROVIDER_ERROR * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `REQUEST_TIMEOUT` - REQUEST_TIMEOUT * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `NODE_CANCELLED` - NODE_CANCELLED * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `CHAT_QUOTA_EXCEEDED` - CHAT_QUOTA_EXCEEDED
        - Allowed values: `INVALID_REQUEST`, `INVALID_INPUTS`, `PROVIDER_ERROR`, `PROVIDER_CREDENTIALS_UNAVAILABLE`, `INTEGRATION_CREDENTIALS_UNAVAILABLE`, `REQUEST_TIMEOUT`, `INTERNAL_SERVER_ERROR`, `USER_DEFINED_ERROR`, `WORKFLOW_CANCELLED`, `NODE_CANCELLED`, `PROVIDER_QUOTA_EXCEEDED`, `CHAT_QUOTA_EXCEEDED`
      - `message` (string, required)
      - `raw_data` (map from string to any, optional, nullable)
    - `name` (string, required)
  - FUNCTION_CALL
    - `type` (enum, required)
      - Allowed values: `FUNCTION_CALL`
    - `value` (object, required, nullable) — The final resolved function call value.
      - `arguments` (map from string to any, required)
      - `name` (string, required)
      - `id` (string, optional, nullable)
    - `name` (string, required)
  - ARRAY
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
    - `name` (string, required)
  - AUDIO
    - `type` (enum, required)
      - Allowed values: `AUDIO`
    - `value` (object, required, nullable)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
    - `name` (string, required)
  - VIDEO
    - `type` (enum, required)
      - Allowed values: `VIDEO`
    - `value` (object, required, nullable)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
    - `name` (string, required)
  - IMAGE
    - `type` (enum, required)
      - Allowed values: `IMAGE`
    - `value` (object, required, nullable)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
    - `name` (string, required)
  - DOCUMENT
    - `type` (enum, required)
      - Allowed values: `DOCUMENT`
    - `value` (object, required, nullable)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
    - `name` (string, required)
- `evaluation_values` (list of object or object or object or object or object or object or object or object or object or object or object or object, required) — Values for each of the Test Case's evaluation variables
  - STRING
    - `type` (enum, required)
      - Allowed values: `STRING`
    - `value` (string, required, nullable)
    - `name` (string, required)
  - NUMBER
    - `type` (enum, required)
      - Allowed values: `NUMBER`
    - `value` (double, required, nullable)
    - `name` (string, required)
  - JSON
    - `type` (enum, required)
      - Allowed values: `JSON`
    - `value` (any, required, nullable)
    - `name` (string, required)
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
    - `name` (string, required)
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
            - `document_type` (enum, required)
            - `start_page_num` (integer, required, nullable) — The 1-indexed page number where the chunk starts in the document. Only available for supported chunking strategies and document types.
            - `end_page_num` (integer, required, nullable) — The 1-indexed page number where the chunk ends in the document. Only available for supported chunking strategies and document types.
    - `name` (string, required)
  - ERROR
    - `type` (enum, required)
      - Allowed values: `ERROR`
    - `value` (object, required, nullable)
      - `code` (enum, required) — * `INVALID_REQUEST` - INVALID_REQUEST * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_ERROR` - PROVIDER_ERROR * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `REQUEST_TIMEOUT` - REQUEST_TIMEOUT * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `NODE_CANCELLED` - NODE_CANCELLED * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `CHAT_QUOTA_EXCEEDED` - CHAT_QUOTA_EXCEEDED
        - Allowed values: `INVALID_REQUEST`, `INVALID_INPUTS`, `PROVIDER_ERROR`, `PROVIDER_CREDENTIALS_UNAVAILABLE`, `INTEGRATION_CREDENTIALS_UNAVAILABLE`, `REQUEST_TIMEOUT`, `INTERNAL_SERVER_ERROR`, `USER_DEFINED_ERROR`, `WORKFLOW_CANCELLED`, `NODE_CANCELLED`, `PROVIDER_QUOTA_EXCEEDED`, `CHAT_QUOTA_EXCEEDED`
      - `message` (string, required)
      - `raw_data` (map from string to any, optional, nullable)
    - `name` (string, required)
  - FUNCTION_CALL
    - `type` (enum, required)
      - Allowed values: `FUNCTION_CALL`
    - `value` (object, required, nullable) — The final resolved function call value.
      - `arguments` (map from string to any, required)
      - `name` (string, required)
      - `id` (string, optional, nullable)
    - `name` (string, required)
  - ARRAY
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
    - `name` (string, required)
  - AUDIO
    - `type` (enum, required)
      - Allowed values: `AUDIO`
    - `value` (object, required, nullable)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
    - `name` (string, required)
  - VIDEO
    - `type` (enum, required)
      - Allowed values: `VIDEO`
    - `value` (object, required, nullable)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
    - `name` (string, required)
  - IMAGE
    - `type` (enum, required)
      - Allowed values: `IMAGE`
    - `value` (object, required, nullable)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
    - `name` (string, required)
  - DOCUMENT
    - `type` (enum, required)
      - Allowed values: `DOCUMENT`
    - `value` (object, required, nullable)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
    - `name` (string, required)
- `id` (string, optional) — The Vellum-generated ID of an existing Test Case whose data you'd like to replace. If specified and no Test Case exists with this ID, a 404 will be returned.
- `external_id` (string, optional) — An ID external to Vellum that uniquely identifies the Test Case that you'd like to create/update. If there's a match on a Test Case that was previously created with the same external_id, it will be updated. Otherwise, a new Test Case will be created with this value as its external_id. If no external_id is specified, then a new Test Case will always be created.
- `label` (string, optional, nullable) — A human-readable label used to convey the intention of this Test Case

## Response

### 200

- `input_values` (list of object or object or object or object or object or object or object or object or object or object or object or object, required)
  - STRING
    - `variable_id` (string, required)
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `STRING`
    - `value` (string, required, nullable)
  - NUMBER
    - `variable_id` (string, required)
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `NUMBER`
    - `value` (double, required, nullable)
  - JSON
    - `variable_id` (string, required)
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `JSON`
    - `value` (any, required, nullable)
  - CHAT_HISTORY
    - `variable_id` (string, required)
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
    - `variable_id` (string, required)
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
    - `variable_id` (string, required)
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `ERROR`
    - `value` (object, required, nullable)
      - `code` (enum, required) — * `INVALID_REQUEST` - INVALID_REQUEST * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_ERROR` - PROVIDER_ERROR * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `REQUEST_TIMEOUT` - REQUEST_TIMEOUT * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `NODE_CANCELLED` - NODE_CANCELLED * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `CHAT_QUOTA_EXCEEDED` - CHAT_QUOTA_EXCEEDED
        - Allowed values: `INVALID_REQUEST`, `INVALID_INPUTS`, `PROVIDER_ERROR`, `PROVIDER_CREDENTIALS_UNAVAILABLE`, `INTEGRATION_CREDENTIALS_UNAVAILABLE`, `REQUEST_TIMEOUT`, `INTERNAL_SERVER_ERROR`, `USER_DEFINED_ERROR`, `WORKFLOW_CANCELLED`, `NODE_CANCELLED`, `PROVIDER_QUOTA_EXCEEDED`, `CHAT_QUOTA_EXCEEDED`
      - `message` (string, required)
      - `raw_data` (map from string to any, optional, nullable)
  - FUNCTION_CALL
    - `variable_id` (string, required)
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `FUNCTION_CALL`
    - `value` (object, required, nullable) — The final resolved function call value.
      - `arguments` (map from string to any, required)
      - `name` (string, required)
      - `id` (string, optional, nullable)
  - ARRAY
    - `variable_id` (string, required)
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
  - AUDIO
    - `variable_id` (string, required)
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `AUDIO`
    - `value` (object, required, nullable)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
  - IMAGE
    - `variable_id` (string, required)
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `IMAGE`
    - `value` (object, required, nullable)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
  - VIDEO
    - `variable_id` (string, required)
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `VIDEO`
    - `value` (object, required, nullable)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
  - DOCUMENT
    - `variable_id` (string, required)
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `DOCUMENT`
    - `value` (object, required, nullable)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
- `evaluation_values` (list of object or object or object or object or object or object or object or object or object or object or object or object, required)
  - STRING
    - `variable_id` (string, required)
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `STRING`
    - `value` (string, required, nullable)
  - NUMBER
    - `variable_id` (string, required)
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `NUMBER`
    - `value` (double, required, nullable)
  - JSON
    - `variable_id` (string, required)
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `JSON`
    - `value` (any, required, nullable)
  - CHAT_HISTORY
    - `variable_id` (string, required)
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
    - `variable_id` (string, required)
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
    - `variable_id` (string, required)
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `ERROR`
    - `value` (object, required, nullable)
      - `code` (enum, required) — * `INVALID_REQUEST` - INVALID_REQUEST * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_ERROR` - PROVIDER_ERROR * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `REQUEST_TIMEOUT` - REQUEST_TIMEOUT * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `NODE_CANCELLED` - NODE_CANCELLED * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `CHAT_QUOTA_EXCEEDED` - CHAT_QUOTA_EXCEEDED
        - Allowed values: `INVALID_REQUEST`, `INVALID_INPUTS`, `PROVIDER_ERROR`, `PROVIDER_CREDENTIALS_UNAVAILABLE`, `INTEGRATION_CREDENTIALS_UNAVAILABLE`, `REQUEST_TIMEOUT`, `INTERNAL_SERVER_ERROR`, `USER_DEFINED_ERROR`, `WORKFLOW_CANCELLED`, `NODE_CANCELLED`, `PROVIDER_QUOTA_EXCEEDED`, `CHAT_QUOTA_EXCEEDED`
      - `message` (string, required)
      - `raw_data` (map from string to any, optional, nullable)
  - FUNCTION_CALL
    - `variable_id` (string, required)
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `FUNCTION_CALL`
    - `value` (object, required, nullable) — The final resolved function call value.
      - `arguments` (map from string to any, required)
      - `name` (string, required)
      - `id` (string, optional, nullable)
  - ARRAY
    - `variable_id` (string, required)
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
  - AUDIO
    - `variable_id` (string, required)
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `AUDIO`
    - `value` (object, required, nullable)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
  - IMAGE
    - `variable_id` (string, required)
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `IMAGE`
    - `value` (object, required, nullable)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
  - VIDEO
    - `variable_id` (string, required)
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `VIDEO`
    - `value` (object, required, nullable)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
  - DOCUMENT
    - `variable_id` (string, required)
    - `name` (string, required)
    - `type` (enum, required)
      - Allowed values: `DOCUMENT`
    - `value` (object, required, nullable)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
- `id` (string, optional)
- `external_id` (string, optional, nullable)
- `label` (string, optional, nullable)

## Examples

**Request**

```json
{
  "input_values": [
    {
      "type": "STRING",
      "value": "What are your favorite colors?",
      "name": "var_1"
    }
  ],
  "evaluation_values": [
    {
      "type": "ARRAY",
      "value": [
        {
          "type": "STRING",
          "value": "Red"
        },
        {
          "type": "STRING",
          "value": "Green"
        },
        {
          "type": "STRING",
          "value": "Blue"
        }
      ],
      "name": "var_2"
    }
  ],
  "label": "Test Case 1"
}
```

**Response**

```json
{
  "input_values": [
    {
      "variable_id": "string",
      "name": "string",
      "type": "STRING",
      "value": "string"
    }
  ],
  "evaluation_values": [
    {
      "variable_id": "string",
      "name": "string",
      "type": "STRING",
      "value": "string"
    }
  ],
  "id": "string",
  "external_id": "string",
  "label": "string"
}
```

**SDK Code**

```python
import requests

url = "https://api.vellum.ai/v1/test-suites/id/test-cases"

payload = {
    "input_values": [
        {
            "type": "STRING",
            "value": "What are your favorite colors?",
            "name": "var_1"
        }
    ],
    "evaluation_values": [
        {
            "type": "ARRAY",
            "value": [
                {
                    "type": "STRING",
                    "value": "Red"
                },
                {
                    "type": "STRING",
                    "value": "Green"
                },
                {
                    "type": "STRING",
                    "value": "Blue"
                }
            ],
            "name": "var_2"
        }
    ],
    "label": "Test Case 1"
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
await client.testSuites.upsertTestSuiteTestCase("id", {
    inputValues: [{
            type: "STRING",
            name: "x"
        }, {
            type: "STRING",
            name: "x"
        }],
    evaluationValues: [{
            type: "STRING",
            name: "x"
        }, {
            type: "STRING",
            name: "x"
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

	url := "https://api.vellum.ai/v1/test-suites/id/test-cases"

	payload := strings.NewReader("{\n  \"input_values\": [\n    {\n      \"type\": \"STRING\",\n      \"value\": \"What are your favorite colors?\",\n      \"name\": \"var_1\"\n    }\n  ],\n  \"evaluation_values\": [\n    {\n      \"type\": \"ARRAY\",\n      \"value\": [\n        {\n          \"type\": \"STRING\",\n          \"value\": \"Red\"\n        },\n        {\n          \"type\": \"STRING\",\n          \"value\": \"Green\"\n        },\n        {\n          \"type\": \"STRING\",\n          \"value\": \"Blue\"\n        }\n      ],\n      \"name\": \"var_2\"\n    }\n  ],\n  \"label\": \"Test Case 1\"\n}")

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

url = URI("https://api.vellum.ai/v1/test-suites/id/test-cases")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["X-API-KEY"] = '<apiKey>'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"input_values\": [\n    {\n      \"type\": \"STRING\",\n      \"value\": \"What are your favorite colors?\",\n      \"name\": \"var_1\"\n    }\n  ],\n  \"evaluation_values\": [\n    {\n      \"type\": \"ARRAY\",\n      \"value\": [\n        {\n          \"type\": \"STRING\",\n          \"value\": \"Red\"\n        },\n        {\n          \"type\": \"STRING\",\n          \"value\": \"Green\"\n        },\n        {\n          \"type\": \"STRING\",\n          \"value\": \"Blue\"\n        }\n      ],\n      \"name\": \"var_2\"\n    }\n  ],\n  \"label\": \"Test Case 1\"\n}"

response = http.request(request)
puts response.read_body
```

```java
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;

HttpResponse<String> response = Unirest.post("https://api.vellum.ai/v1/test-suites/id/test-cases")
  .header("X-API-KEY", "<apiKey>")
  .header("Content-Type", "application/json")
  .body("{\n  \"input_values\": [\n    {\n      \"type\": \"STRING\",\n      \"value\": \"What are your favorite colors?\",\n      \"name\": \"var_1\"\n    }\n  ],\n  \"evaluation_values\": [\n    {\n      \"type\": \"ARRAY\",\n      \"value\": [\n        {\n          \"type\": \"STRING\",\n          \"value\": \"Red\"\n        },\n        {\n          \"type\": \"STRING\",\n          \"value\": \"Green\"\n        },\n        {\n          \"type\": \"STRING\",\n          \"value\": \"Blue\"\n        }\n      ],\n      \"name\": \"var_2\"\n    }\n  ],\n  \"label\": \"Test Case 1\"\n}")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.vellum.ai/v1/test-suites/id/test-cases', [
  'body' => '{
  "input_values": [
    {
      "type": "STRING",
      "value": "What are your favorite colors?",
      "name": "var_1"
    }
  ],
  "evaluation_values": [
    {
      "type": "ARRAY",
      "value": [
        {
          "type": "STRING",
          "value": "Red"
        },
        {
          "type": "STRING",
          "value": "Green"
        },
        {
          "type": "STRING",
          "value": "Blue"
        }
      ],
      "name": "var_2"
    }
  ],
  "label": "Test Case 1"
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

var client = new RestClient("https://api.vellum.ai/v1/test-suites/id/test-cases");
var request = new RestRequest(Method.POST);
request.AddHeader("X-API-KEY", "<apiKey>");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"input_values\": [\n    {\n      \"type\": \"STRING\",\n      \"value\": \"What are your favorite colors?\",\n      \"name\": \"var_1\"\n    }\n  ],\n  \"evaluation_values\": [\n    {\n      \"type\": \"ARRAY\",\n      \"value\": [\n        {\n          \"type\": \"STRING\",\n          \"value\": \"Red\"\n        },\n        {\n          \"type\": \"STRING\",\n          \"value\": \"Green\"\n        },\n        {\n          \"type\": \"STRING\",\n          \"value\": \"Blue\"\n        }\n      ],\n      \"name\": \"var_2\"\n    }\n  ],\n  \"label\": \"Test Case 1\"\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "X-API-KEY": "<apiKey>",
  "Content-Type": "application/json"
]
let parameters = [
  "input_values": [
    [
      "type": "STRING",
      "value": "What are your favorite colors?",
      "name": "var_1"
    ]
  ],
  "evaluation_values": [
    [
      "type": "ARRAY",
      "value": [
        [
          "type": "STRING",
          "value": "Red"
        ],
        [
          "type": "STRING",
          "value": "Green"
        ],
        [
          "type": "STRING",
          "value": "Blue"
        ]
      ],
      "name": "var_2"
    ]
  ],
  "label": "Test Case 1"
] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.vellum.ai/v1/test-suites/id/test-cases")! as URL,
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