> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Bulk Update Test Cases

POST https://api.vellum.ai/v1/test-suites/{id}/test-cases-bulk
Content-Type: application/x-ndjson

Created, replace, and delete Test Cases within the specified Test Suite in bulk

Reference: https://docs.vellum.ai/developers/client-sdk/test-suites/test-cases/bulk-update

## Authentication

- `X-API-KEY` header (required) — API Key authentication via header

## Request

### Path parameters

- `id` (string, required) — Either the Test Suites' ID or its unique name

### Body (application/x-ndjson)

This endpoint expects a list of object or object or object or object.

- `list of object or object or object or object`
  - CREATE
    - `id` (string, required) — An ID representing this specific operation. Can later be used to look up information about the operation's success in the response.
    - `type` (enum, required)
      - Allowed values: `CREATE`
    - `data` (object, required) — Information about the Test Case to create
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
            - `text` (string, optional, nullable)
            - `content` (object or object or object or object or object or object or object, optional, nullable)
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
            - `meta` (object, optional, nullable) — Additional information about the search result.
          - `name` (string, required)
        - ERROR
          - `type` (enum, required)
            - Allowed values: `ERROR`
          - `value` (object, required, nullable)
            - `code` (enum, required) — * `INVALID_REQUEST` - INVALID_REQUEST * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_ERROR` - PROVIDER_ERROR * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `REQUEST_TIMEOUT` - REQUEST_TIMEOUT * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `NODE_CANCELLED` - NODE_CANCELLED * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `CHAT_QUOTA_EXCEEDED` - CHAT_QUOTA_EXCEEDED
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
            - NUMBER
            - JSON
            - AUDIO
            - VIDEO
            - IMAGE
            - DOCUMENT
            - FUNCTION_CALL
            - ERROR
            - ARRAY
            - CHAT_HISTORY
            - SEARCH_RESULTS
            - THINKING
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
            - `text` (string, optional, nullable)
            - `content` (object or object or object or object or object or object or object, optional, nullable)
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
            - `meta` (object, optional, nullable) — Additional information about the search result.
          - `name` (string, required)
        - ERROR
          - `type` (enum, required)
            - Allowed values: `ERROR`
          - `value` (object, required, nullable)
            - `code` (enum, required) — * `INVALID_REQUEST` - INVALID_REQUEST * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_ERROR` - PROVIDER_ERROR * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `REQUEST_TIMEOUT` - REQUEST_TIMEOUT * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `NODE_CANCELLED` - NODE_CANCELLED * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `CHAT_QUOTA_EXCEEDED` - CHAT_QUOTA_EXCEEDED
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
            - NUMBER
            - JSON
            - AUDIO
            - VIDEO
            - IMAGE
            - DOCUMENT
            - FUNCTION_CALL
            - ERROR
            - ARRAY
            - CHAT_HISTORY
            - SEARCH_RESULTS
            - THINKING
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
      - `label` (string, optional, nullable) — A human-readable label used to convey the intention of this Test Case
      - `external_id` (string, optional, nullable) — Optionally provide an ID that uniquely identifies this Test Case in your system. Useful for updating this Test Cases data after initial creation. Cannot be changed later.
  - REPLACE
    - `id` (string, required) — An ID representing this specific operation. Can later be used to look up information about the operation's success in the response.
    - `type` (enum, required)
      - Allowed values: `REPLACE`
    - `data` (object, required) — Information about the Test Case to replace
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
            - `text` (string, optional, nullable)
            - `content` (object or object or object or object or object or object or object, optional, nullable)
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
            - `meta` (object, optional, nullable) — Additional information about the search result.
          - `name` (string, required)
        - ERROR
          - `type` (enum, required)
            - Allowed values: `ERROR`
          - `value` (object, required, nullable)
            - `code` (enum, required) — * `INVALID_REQUEST` - INVALID_REQUEST * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_ERROR` - PROVIDER_ERROR * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `REQUEST_TIMEOUT` - REQUEST_TIMEOUT * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `NODE_CANCELLED` - NODE_CANCELLED * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `CHAT_QUOTA_EXCEEDED` - CHAT_QUOTA_EXCEEDED
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
            - NUMBER
            - JSON
            - AUDIO
            - VIDEO
            - IMAGE
            - DOCUMENT
            - FUNCTION_CALL
            - ERROR
            - ARRAY
            - CHAT_HISTORY
            - SEARCH_RESULTS
            - THINKING
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
            - `text` (string, optional, nullable)
            - `content` (object or object or object or object or object or object or object, optional, nullable)
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
            - `meta` (object, optional, nullable) — Additional information about the search result.
          - `name` (string, required)
        - ERROR
          - `type` (enum, required)
            - Allowed values: `ERROR`
          - `value` (object, required, nullable)
            - `code` (enum, required) — * `INVALID_REQUEST` - INVALID_REQUEST * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_ERROR` - PROVIDER_ERROR * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `REQUEST_TIMEOUT` - REQUEST_TIMEOUT * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `NODE_CANCELLED` - NODE_CANCELLED * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `CHAT_QUOTA_EXCEEDED` - CHAT_QUOTA_EXCEEDED
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
            - NUMBER
            - JSON
            - AUDIO
            - VIDEO
            - IMAGE
            - DOCUMENT
            - FUNCTION_CALL
            - ERROR
            - ARRAY
            - CHAT_HISTORY
            - SEARCH_RESULTS
            - THINKING
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
      - `id` (string, optional, nullable) — The Vellum-generated ID of the Test Case whose data you'd like to replace. Must specify either this or external_id.
      - `external_id` (string, optional, nullable) — The ID that was originally provided upon Test Case creation that uniquely identifies the Test Case whose data you'd like to replace. Must specify either this of id.
      - `label` (string, optional, nullable) — A human-readable label used to convey the intention of this Test Case
  - UPSERT
    - `id` (string, required) — An ID representing this specific operation. Can later be used to look up information about the operation's success in the response.
    - `type` (enum, required)
      - Allowed values: `UPSERT`
    - `data` (object, required)
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
            - `text` (string, optional, nullable)
            - `content` (object or object or object or object or object or object or object, optional, nullable)
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
            - `meta` (object, optional, nullable) — Additional information about the search result.
          - `name` (string, required)
        - ERROR
          - `type` (enum, required)
            - Allowed values: `ERROR`
          - `value` (object, required, nullable)
            - `code` (enum, required) — * `INVALID_REQUEST` - INVALID_REQUEST * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_ERROR` - PROVIDER_ERROR * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `REQUEST_TIMEOUT` - REQUEST_TIMEOUT * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `NODE_CANCELLED` - NODE_CANCELLED * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `CHAT_QUOTA_EXCEEDED` - CHAT_QUOTA_EXCEEDED
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
            - NUMBER
            - JSON
            - AUDIO
            - VIDEO
            - IMAGE
            - DOCUMENT
            - FUNCTION_CALL
            - ERROR
            - ARRAY
            - CHAT_HISTORY
            - SEARCH_RESULTS
            - THINKING
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
            - `text` (string, optional, nullable)
            - `content` (object or object or object or object or object or object or object, optional, nullable)
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
            - `meta` (object, optional, nullable) — Additional information about the search result.
          - `name` (string, required)
        - ERROR
          - `type` (enum, required)
            - Allowed values: `ERROR`
          - `value` (object, required, nullable)
            - `code` (enum, required) — * `INVALID_REQUEST` - INVALID_REQUEST * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_ERROR` - PROVIDER_ERROR * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `REQUEST_TIMEOUT` - REQUEST_TIMEOUT * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `NODE_CANCELLED` - NODE_CANCELLED * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `CHAT_QUOTA_EXCEEDED` - CHAT_QUOTA_EXCEEDED
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
            - NUMBER
            - JSON
            - AUDIO
            - VIDEO
            - IMAGE
            - DOCUMENT
            - FUNCTION_CALL
            - ERROR
            - ARRAY
            - CHAT_HISTORY
            - SEARCH_RESULTS
            - THINKING
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
  - DELETE
    - `id` (string, required) — An ID representing this specific operation. Can later be used to look up information about the operation's success in the response.
    - `type` (enum, required)
      - Allowed values: `DELETE`
    - `data` (object, required) — Information about the Test Case to delete
      - `id` (string, required)

## Response

### 200

- Streaming response of `list of object or object or object or object`.
- CREATED
  - `id` (string, required)
  - `type` (enum, required)
    - Allowed values: `CREATED`
  - `data` (object, required) — Information about the Test Case that was created.
    - `id` (string, required)
- REPLACED
  - `id` (string, required) — An ID that maps back to one of the initially supplied operations. Can be used to determine the result of a given operation.
  - `type` (enum, required)
    - Allowed values: `REPLACED`
  - `data` (object, required) — Information about the Test Case that was replaced
    - `id` (string, required)
- DELETED
  - `id` (string, required) — An ID that maps back to one of the initially supplied operations. Can be used to determine the result of a given operation.
  - `type` (enum, required)
    - Allowed values: `DELETED`
  - `data` (object, required) — Information about the Test Case that was deleted
    - `id` (string, required)
- REJECTED
  - `type` (enum, required)
    - Allowed values: `REJECTED`
  - `data` (map from string to any, required) — Details about the error that occurred
  - `id` (string, optional, nullable) — An ID that maps back to one of the initially supplied operations. Can be used to determine the result of a given operation.

## Examples

**Request**

```json
[
  {
    "id": "string",
    "type": "CREATE",
    "data": {
      "input_values": [
        {
          "type": "STRING",
          "value": "string",
          "name": "string"
        }
      ],
      "evaluation_values": [
        {
          "type": "STRING",
          "value": "string",
          "name": "string"
        }
      ]
    }
  }
]
```

**Response**

```json
[
  {
    "type": "json",
    "value": [
      {
        "id": "string",
        "type": "CREATED",
        "data": {
          "id": "string"
        }
      }
    ]
  }
]
```

**SDK Code**

```python
import requests

url = "https://api.vellum.ai/v1/test-suites/id/test-cases-bulk"

payload = "[\n  {\n    \"id\": \"string\",\n    \"type\": \"CREATE\",\n    \"data\": {\n      \"input_values\": [\n        {\n          \"type\": \"STRING\",\n          \"value\": \"string\",\n          \"name\": \"string\"\n        }\n      ],\n      \"evaluation_values\": [\n        {\n          \"type\": \"STRING\",\n          \"value\": \"string\",\n          \"name\": \"string\"\n        }\n      ]\n    }\n  }\n]"
headers = {
    "X-API-KEY": "<apiKey>",
    "Content-Type": "application/x-ndjson"
}

response = requests.post(url, data=payload, headers=headers)

print(response.json())
```

```typescript
import { VellumClient } from "vellum-ai";

const client = new VellumClient({ apiKey: "YOUR_API_KEY", apiVersion: "YOUR_API_VERSION" });
const response = await client.testSuites.testSuiteTestCasesBulk("id", [{
        id: "id",
        type: "CREATE",
        data: {
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
        }
    }, {
        id: "id",
        type: "CREATE",
        data: {
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
        }
    }]);
for await (const item of response) {
    console.log(item);
}

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

	url := "https://api.vellum.ai/v1/test-suites/id/test-cases-bulk"

	payload := strings.NewReader("[\n  {\n    \"id\": \"string\",\n    \"type\": \"CREATE\",\n    \"data\": {\n      \"input_values\": [\n        {\n          \"type\": \"STRING\",\n          \"value\": \"string\",\n          \"name\": \"string\"\n        }\n      ],\n      \"evaluation_values\": [\n        {\n          \"type\": \"STRING\",\n          \"value\": \"string\",\n          \"name\": \"string\"\n        }\n      ]\n    }\n  }\n]")

	req, _ := http.NewRequest("POST", url, payload)

	req.Header.Add("X-API-KEY", "<apiKey>")
	req.Header.Add("Content-Type", "application/x-ndjson")

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

url = URI("https://api.vellum.ai/v1/test-suites/id/test-cases-bulk")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["X-API-KEY"] = '<apiKey>'
request["Content-Type"] = 'application/x-ndjson'
request.body = "[\n  {\n    \"id\": \"string\",\n    \"type\": \"CREATE\",\n    \"data\": {\n      \"input_values\": [\n        {\n          \"type\": \"STRING\",\n          \"value\": \"string\",\n          \"name\": \"string\"\n        }\n      ],\n      \"evaluation_values\": [\n        {\n          \"type\": \"STRING\",\n          \"value\": \"string\",\n          \"name\": \"string\"\n        }\n      ]\n    }\n  }\n]"

response = http.request(request)
puts response.read_body
```

```java
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;

HttpResponse<String> response = Unirest.post("https://api.vellum.ai/v1/test-suites/id/test-cases-bulk")
  .header("X-API-KEY", "<apiKey>")
  .header("Content-Type", "application/x-ndjson")
  .body("[\n  {\n    \"id\": \"string\",\n    \"type\": \"CREATE\",\n    \"data\": {\n      \"input_values\": [\n        {\n          \"type\": \"STRING\",\n          \"value\": \"string\",\n          \"name\": \"string\"\n        }\n      ],\n      \"evaluation_values\": [\n        {\n          \"type\": \"STRING\",\n          \"value\": \"string\",\n          \"name\": \"string\"\n        }\n      ]\n    }\n  }\n]")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.vellum.ai/v1/test-suites/id/test-cases-bulk', [
  'body' => '[
  {
    "id": "string",
    "type": "CREATE",
    "data": {
      "input_values": [
        {
          "type": "STRING",
          "value": "string",
          "name": "string"
        }
      ],
      "evaluation_values": [
        {
          "type": "STRING",
          "value": "string",
          "name": "string"
        }
      ]
    }
  }
]',
  'headers' => [
    'Content-Type' => 'application/x-ndjson',
    'X-API-KEY' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
using RestSharp;

var client = new RestClient("https://api.vellum.ai/v1/test-suites/id/test-cases-bulk");
var request = new RestRequest(Method.POST);
request.AddHeader("X-API-KEY", "<apiKey>");
request.AddHeader("Content-Type", "application/x-ndjson");
request.AddParameter("application/x-ndjson", "[\n  {\n    \"id\": \"string\",\n    \"type\": \"CREATE\",\n    \"data\": {\n      \"input_values\": [\n        {\n          \"type\": \"STRING\",\n          \"value\": \"string\",\n          \"name\": \"string\"\n        }\n      ],\n      \"evaluation_values\": [\n        {\n          \"type\": \"STRING\",\n          \"value\": \"string\",\n          \"name\": \"string\"\n        }\n      ]\n    }\n  }\n]", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "X-API-KEY": "<apiKey>",
  "Content-Type": "application/x-ndjson"
]

let postData = NSData(data: "[
  {
    "id": "string",
    "type": "CREATE",
    "data": {
      "input_values": [
        {
          "type": "STRING",
          "value": "string",
          "name": "string"
        }
      ],
      "evaluation_values": [
        {
          "type": "STRING",
          "value": "string",
          "name": "string"
        }
      ]
    }
  }
]".data(using: String.Encoding.utf8)!)

let request = NSMutableURLRequest(url: NSURL(string: "https://api.vellum.ai/v1/test-suites/id/test-cases-bulk")! as URL,
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