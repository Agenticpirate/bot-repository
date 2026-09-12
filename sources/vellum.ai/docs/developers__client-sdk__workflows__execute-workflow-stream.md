> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Execute Workflow as Stream

POST https://predict.vellum.ai/v1/execute-workflow-stream
Content-Type: application/json

Executes a deployed Workflow and streams back its results.

Reference: https://docs.vellum.ai/developers/client-sdk/workflows/execute-workflow-stream

## Authentication

- `X-API-KEY` header (required) — API Key authentication via header

## Request

### Body (application/json)

This endpoint expects an object.

- `inputs` (list of object or object or object or object or object or object or object or object, required) — The list of inputs defined in the Workflow's Deployment with their corresponding values.
  - STRING
    - `name` (string, required) — The variable's name, as defined in the Workflow.
    - `type` (enum, required)
      - Allowed values: `STRING`
    - `value` (string, required)
  - JSON
    - `name` (string, required) — The variable's name, as defined in the Workflow.
    - `type` (enum, required)
      - Allowed values: `JSON`
    - `value` (any, required, nullable)
  - CHAT_HISTORY
    - `name` (string, required) — The variable's name, as defined in the Workflow.
    - `type` (enum, required)
      - Allowed values: `CHAT_HISTORY`
    - `value` (list of object, required)
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
  - NUMBER
    - `name` (string, required) — The variable's name, as defined in the Workflow.
    - `type` (enum, required)
      - Allowed values: `NUMBER`
    - `value` (double, required)
  - AUDIO
    - `name` (string, required) — The variable's name, as defined in the Workflow.
    - `type` (enum, required)
      - Allowed values: `AUDIO`
    - `value` (object, required)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
  - VIDEO
    - `name` (string, required) — The variable's name, as defined in the Workflow.
    - `type` (enum, required)
      - Allowed values: `VIDEO`
    - `value` (object, required)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
  - IMAGE
    - `name` (string, required) — The variable's name, as defined in the Workflow.
    - `type` (enum, required)
      - Allowed values: `IMAGE`
    - `value` (object, required)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
  - DOCUMENT
    - `name` (string, required) — The variable's name, as defined in the Workflow.
    - `type` (enum, required)
      - Allowed values: `DOCUMENT`
    - `value` (object, required)
      - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
      - `metadata` (map from string to any, optional, nullable)
- `expand_meta` (object, optional, nullable) — An optionally specified configuration used to opt in to including additional metadata about this workflow execution in the API response. Corresponding values will be returned under the `execution_meta` key within NODE events in the response stream.
  - `usage` (boolean, optional, nullable) — If enabled, the Prompt Node FULFILLED events will include model host usage tracking. This may increase latency for some model hosts.
  - `cost` (boolean, optional, nullable) — If enabled, the Prompt Node FULFILLED events will include model host cost tracking. This may increase latency for some model hosts.
  - `model_name` (boolean, optional, nullable) — If enabled, the Prompt Node FULFILLED events will include model host name
- `workflow_deployment_id` (string, optional, nullable) — The ID of the Workflow Deployment. Must provide either this or workflow_deployment_name.
- `workflow_deployment_name` (string, optional, nullable) — The name of the Workflow Deployment. Must provide either this or workflow_deployment_id.
- `release_tag` (string, optional, nullable) — Optionally specify a release tag if you want to pin to a specific release of the Workflow Deployment
- `external_id` (string, optional, nullable) — Optionally include a unique identifier for tracking purposes. Must be unique within a given Workspace.
- `event_types` (list of enum, optional) — Optionally specify which events you want to receive. Defaults to only WORKFLOW events. Note that the schema of non-WORKFLOW events is unstable and should be used with caution.
  - Allowed values: `NODE`, `WORKFLOW`
- `metadata` (map from string to any, optional, nullable) — Arbitrary JSON metadata associated with this request. Can be used to capture additional monitoring data such as user id, session id, etc. for future analysis.
- `previous_execution_id` (string, optional, nullable) — The ID of a previous Workflow Execution to reference for initial State loading.

## Response

### 200

- Streaming response of `object or object`.
- WORKFLOW
  - `execution_id` (string, required)
  - `type` (enum, required)
    - Allowed values: `WORKFLOW`
  - `data` (object, required)
    - `id` (string, required)
    - `state` (enum, required) — * `INITIATED` - Initiated * `STREAMING` - Streaming * `FULFILLED` - Fulfilled * `REJECTED` - Rejected * `PENDING` - Pending
      - Allowed values: `INITIATED`, `STREAMING`, `FULFILLED`, `REJECTED`, `PENDING`
    - `ts` (string, required)
    - `output` (object or object or object or object or object or object or object or object, required, nullable)
      - STRING
        - `name` (string, required)
        - `state` (enum, required) — * `INITIATED` - INITIATED * `STREAMING` - STREAMING * `FULFILLED` - FULFILLED * `REJECTED` - REJECTED
          - Allowed values: `INITIATED`, `STREAMING`, `FULFILLED`, `REJECTED`
        - `delta` (string, required, nullable) — The newly output string value, meant to be concatenated with all previous. Will be non-null for events of state STREAMING.
        - `type` (enum, required)
          - Allowed values: `STRING`
        - `value` (string, required, nullable) — The entire string value. Will be non-null for events of state FULFILLED.
        - `id` (string, optional, nullable)
        - `node_id` (string, optional, nullable)
      - NUMBER
        - `name` (string, required)
        - `state` (enum, required) — * `INITIATED` - INITIATED * `STREAMING` - STREAMING * `FULFILLED` - FULFILLED * `REJECTED` - REJECTED
          - Allowed values: `INITIATED`, `STREAMING`, `FULFILLED`, `REJECTED`
        - `delta` (string, required, nullable) — The newly output string value. Only relevant for string outputs with a state of STREAMING.
        - `type` (enum, required)
          - Allowed values: `NUMBER`
        - `value` (double, required, nullable)
        - `id` (string, optional, nullable)
        - `node_id` (string, optional, nullable)
      - JSON
        - `name` (string, required)
        - `state` (enum, required) — * `INITIATED` - INITIATED * `STREAMING` - STREAMING * `FULFILLED` - FULFILLED * `REJECTED` - REJECTED
          - Allowed values: `INITIATED`, `STREAMING`, `FULFILLED`, `REJECTED`
        - `delta` (string, required, nullable) — The newly output string value. Only relevant for string outputs with a state of STREAMING.
        - `type` (enum, required)
          - Allowed values: `JSON`
        - `value` (any, required, nullable)
        - `id` (string, optional, nullable)
        - `node_id` (string, optional, nullable)
      - CHAT_HISTORY
        - `name` (string, required)
        - `state` (enum, required) — * `INITIATED` - INITIATED * `STREAMING` - STREAMING * `FULFILLED` - FULFILLED * `REJECTED` - REJECTED
          - Allowed values: `INITIATED`, `STREAMING`, `FULFILLED`, `REJECTED`
        - `delta` (string, required, nullable) — The newly output string value. Only relevant for string outputs with a state of STREAMING.
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
        - `id` (string, optional, nullable)
        - `node_id` (string, optional, nullable)
      - SEARCH_RESULTS
        - `name` (string, required)
        - `state` (enum, required) — * `INITIATED` - INITIATED * `STREAMING` - STREAMING * `FULFILLED` - FULFILLED * `REJECTED` - REJECTED
          - Allowed values: `INITIATED`, `STREAMING`, `FULFILLED`, `REJECTED`
        - `delta` (string, required, nullable) — The newly output string value. Only relevant for string outputs with a state of STREAMING.
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
        - `id` (string, optional, nullable)
        - `node_id` (string, optional, nullable)
      - ARRAY
        - `name` (string, required)
        - `state` (enum, required) — * `INITIATED` - INITIATED * `STREAMING` - STREAMING * `FULFILLED` - FULFILLED * `REJECTED` - REJECTED
          - Allowed values: `INITIATED`, `STREAMING`, `FULFILLED`, `REJECTED`
        - `delta` (string, required, nullable) — The newly output string value. Only relevant for string outputs with a state of STREAMING.
        - `type` (enum, required)
          - Allowed values: `ARRAY`
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
        - `id` (string, optional, nullable)
        - `node_id` (string, optional, nullable)
      - FUNCTION_CALL
        - `name` (string, required)
        - `state` (enum, required) — * `INITIATED` - INITIATED * `STREAMING` - STREAMING * `FULFILLED` - FULFILLED * `REJECTED` - REJECTED
          - Allowed values: `INITIATED`, `STREAMING`, `FULFILLED`, `REJECTED`
        - `delta` (string, required, nullable) — The newly output string value. Only relevant for string outputs with a state of STREAMING.
        - `type` (enum, required)
          - Allowed values: `FUNCTION_CALL`
        - `value` (object, required, nullable) — The final resolved function call value.
          - `arguments` (map from string to any, required)
          - `name` (string, required)
          - `id` (string, optional, nullable)
        - `id` (string, optional, nullable)
        - `node_id` (string, optional, nullable)
      - ERROR
        - `name` (string, required)
        - `state` (enum, required) — * `INITIATED` - INITIATED * `STREAMING` - STREAMING * `FULFILLED` - FULFILLED * `REJECTED` - REJECTED
          - Allowed values: `INITIATED`, `STREAMING`, `FULFILLED`, `REJECTED`
        - `delta` (string, required, nullable) — The newly output string value. Only relevant for string outputs with a state of STREAMING.
        - `type` (enum, required)
          - Allowed values: `ERROR`
        - `value` (object, required, nullable)
          - `code` (enum, required) — * `INVALID_REQUEST` - INVALID_REQUEST * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_ERROR` - PROVIDER_ERROR * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `REQUEST_TIMEOUT` - REQUEST_TIMEOUT * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `NODE_CANCELLED` - NODE_CANCELLED * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `CHAT_QUOTA_EXCEEDED` - CHAT_QUOTA_EXCEEDED
            - Allowed values: `INVALID_REQUEST`, `INVALID_INPUTS`, `PROVIDER_ERROR`, `PROVIDER_CREDENTIALS_UNAVAILABLE`, `INTEGRATION_CREDENTIALS_UNAVAILABLE`, `REQUEST_TIMEOUT`, `INTERNAL_SERVER_ERROR`, `USER_DEFINED_ERROR`, `WORKFLOW_CANCELLED`, `NODE_CANCELLED`, `PROVIDER_QUOTA_EXCEEDED`, `CHAT_QUOTA_EXCEEDED`
          - `message` (string, required)
          - `raw_data` (map from string to any, optional, nullable)
        - `id` (string, optional, nullable)
        - `node_id` (string, optional, nullable)
    - `error` (object, optional, nullable)
      - `message` (string, required)
      - `code` (enum, required) — * `WORKFLOW_INITIALIZATION` - WORKFLOW_INITIALIZATION * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `WORKFLOW_TIMEOUT` - WORKFLOW_TIMEOUT * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `NODE_EXECUTION_COUNT_LIMIT_REACHED` - NODE_EXECUTION_COUNT_LIMIT_REACHED * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `NODE_EXECUTION` - NODE_EXECUTION * `NODE_CANCELLED` - NODE_CANCELLED * `NODE_TIMEOUT` - NODE_TIMEOUT * `LLM_PROVIDER` - LLM_PROVIDER * `INVALID_TEMPLATE` - INVALID_TEMPLATE * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR
        - Allowed values: `WORKFLOW_INITIALIZATION`, `WORKFLOW_CANCELLED`, `WORKFLOW_TIMEOUT`, `PROVIDER_CREDENTIALS_UNAVAILABLE`, `INTEGRATION_CREDENTIALS_UNAVAILABLE`, `NODE_EXECUTION_COUNT_LIMIT_REACHED`, `INTERNAL_SERVER_ERROR`, `NODE_EXECUTION`, `NODE_CANCELLED`, `NODE_TIMEOUT`, `LLM_PROVIDER`, `INVALID_TEMPLATE`, `INVALID_INPUTS`, `PROVIDER_QUOTA_EXCEEDED`, `USER_DEFINED_ERROR`
      - `raw_data` (map from string to any or string, optional, nullable)
      - `stacktrace` (string, optional, nullable)
    - `outputs` (list of object or object or object or object or object or object or object or object or object or object or object or object, optional, nullable)
      - STRING
        - `id` (string, required)
        - `name` (string, required) — The output's name, as defined in the workflow
        - `type` (enum, required)
          - Allowed values: `STRING`
        - `value` (string, required, nullable)
      - NUMBER
        - `id` (string, required)
        - `name` (string, required) — The output's name, as defined in the workflow
        - `type` (enum, required)
          - Allowed values: `NUMBER`
        - `value` (double, required, nullable)
      - JSON
        - `id` (string, required)
        - `name` (string, required) — The output's name, as defined in the workflow
        - `type` (enum, required)
          - Allowed values: `JSON`
        - `value` (any, required, nullable)
      - CHAT_HISTORY
        - `id` (string, required)
        - `name` (string, required) — The output's name, as defined in the workflow
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
        - `id` (string, required)
        - `name` (string, required) — The output's name, as defined in the workflow
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
      - ARRAY
        - `id` (string, required)
        - `name` (string, required) — The output's name, as defined in the workflow
        - `type` (enum, required)
          - Allowed values: `ARRAY`
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
      - ERROR
        - `id` (string, required)
        - `name` (string, required) — The output's name, as defined in the workflow
        - `type` (enum, required)
          - Allowed values: `ERROR`
        - `value` (object, required, nullable)
          - `code` (enum, required) — * `INVALID_REQUEST` - INVALID_REQUEST * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_ERROR` - PROVIDER_ERROR * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `REQUEST_TIMEOUT` - REQUEST_TIMEOUT * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `NODE_CANCELLED` - NODE_CANCELLED * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `CHAT_QUOTA_EXCEEDED` - CHAT_QUOTA_EXCEEDED
            - Allowed values: `INVALID_REQUEST`, `INVALID_INPUTS`, `PROVIDER_ERROR`, `PROVIDER_CREDENTIALS_UNAVAILABLE`, `INTEGRATION_CREDENTIALS_UNAVAILABLE`, `REQUEST_TIMEOUT`, `INTERNAL_SERVER_ERROR`, `USER_DEFINED_ERROR`, `WORKFLOW_CANCELLED`, `NODE_CANCELLED`, `PROVIDER_QUOTA_EXCEEDED`, `CHAT_QUOTA_EXCEEDED`
          - `message` (string, required)
          - `raw_data` (map from string to any, optional, nullable)
      - FUNCTION_CALL
        - `id` (string, required)
        - `name` (string, required) — The output's name, as defined in the workflow
        - `type` (enum, required)
          - Allowed values: `FUNCTION_CALL`
        - `value` (object, required, nullable) — The final resolved function call value.
          - `arguments` (map from string to any, required)
          - `name` (string, required)
          - `id` (string, optional, nullable)
      - IMAGE
        - `id` (string, required)
        - `name` (string, required) — The output's name, as defined in the workflow
        - `type` (enum, required)
          - Allowed values: `IMAGE`
        - `value` (object, required, nullable)
          - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
          - `metadata` (map from string to any, optional, nullable)
      - AUDIO
        - `id` (string, required)
        - `name` (string, required) — The output's name, as defined in the workflow
        - `type` (enum, required)
          - Allowed values: `AUDIO`
        - `value` (object, required, nullable)
          - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
          - `metadata` (map from string to any, optional, nullable)
      - VIDEO
        - `id` (string, required)
        - `name` (string, required) — The output's name, as defined in the workflow
        - `type` (enum, required)
          - Allowed values: `VIDEO`
        - `value` (object, required, nullable)
          - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
          - `metadata` (map from string to any, optional, nullable)
      - DOCUMENT
        - `id` (string, required)
        - `name` (string, required) — The output's name, as defined in the workflow
        - `type` (enum, required)
          - Allowed values: `DOCUMENT`
        - `value` (object, required, nullable)
          - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
          - `metadata` (map from string to any, optional, nullable)
    - `inputs` (list of object or object or object or object or object or object or object or object or object or object or object or object or object, optional, nullable)
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
            - FUNCTION_CALL
            - ARRAY
            - AUDIO
            - VIDEO
            - IMAGE
            - DOCUMENT
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
  - `external_id` (string, optional, nullable)
  - `run_id` (string, optional, nullable, deprecated)
- NODE
  - `execution_id` (string, required)
  - `type` (enum, required)
    - Allowed values: `NODE`
  - `data` (object or object or object or object, required)
    - INITIATED
      - `id` (string, required)
      - `node_id` (string, required)
      - `node_result_id` (string, required)
      - `state` (enum, required)
        - Allowed values: `INITIATED`
      - `data` (object or object or object or object or object or object or object or object or object or object or object, required, nullable)
        - PROMPT
          - `type` (enum, required)
            - Allowed values: `PROMPT`
          - `data` (object, required)
            - `output_id` (string, required)
            - `execution_meta` (object, optional, nullable) — The subset of the metadata tracked by Vellum during prompt execution that the request opted into with `expand_meta`.
            - `array_output_id` (string, optional, nullable)
            - `execution_id` (string, optional, nullable)
            - `text` (string, optional, nullable)
            - `delta` (string, optional, nullable)
        - SEARCH
          - `type` (enum, required)
            - Allowed values: `SEARCH`
          - `data` (object, required)
            - `results_output_id` (string, required)
            - `results` (list of object, required) — The results of the search. Each result represents a chunk that matches the search query.
            - `text_output_id` (string, required)
            - `text` (string, optional, nullable)
        - TEMPLATING
          - `type` (enum, required)
            - Allowed values: `TEMPLATING`
          - `data` (object, required)
            - `output` (object or object or object or object or object or object or object or object, required)
        - CODE_EXECUTION
          - `type` (enum, required)
            - Allowed values: `CODE_EXECUTION`
          - `data` (object, required)
            - `output` (object or object or object or object or object or object or object or object, required)
            - `log_output_id` (string, optional, nullable)
        - CONDITIONAL
          - `type` (enum, required)
            - Allowed values: `CONDITIONAL`
          - `data` (object, required)
            - `source_handle_id` (string, optional, nullable)
        - API
          - `type` (enum, required)
            - Allowed values: `API`
          - `data` (object, required)
            - `text_output_id` (string, required)
            - `json_output_id` (string, required)
            - `status_code_output_id` (string, required)
            - `status_code` (integer, required)
            - `json` (map from string to any, optional, nullable)
            - `text` (string, optional, nullable)
        - TERMINAL
          - `type` (enum, required)
            - Allowed values: `TERMINAL`
          - `data` (object, required)
            - `output` (object or object or object or object or object or object or object or object, required)
        - MERGE
          - `type` (enum, required)
            - Allowed values: `MERGE`
          - `data` (object, required)
            - `paused_node_data` (map from string to any, optional, nullable)
        - SUBWORKFLOW
          - `type` (enum, required)
            - Allowed values: `SUBWORKFLOW`
          - `data` (object, optional)
            - `execution_id` (string, optional, nullable)
        - METRIC
          - `type` (enum, required)
            - Allowed values: `METRIC`
        - MAP
          - `type` (enum, required)
            - Allowed values: `MAP`
          - `data` (object, optional)
            - `execution_ids` (list of string, required)
            - `iteration_state` (enum, optional, nullable) — * `INITIATED` - INITIATED * `FULFILLED` - FULFILLED * `REJECTED` - REJECTED
      - `ts` (string, optional, nullable)
      - `source_execution_id` (string, optional, nullable)
      - `input_values` (list of object or object or object or object or object or object or object or object or object or object or object or object or object, optional, nullable)
        - STRING
          - `node_input_id` (string, required)
          - `key` (string, required)
          - `type` (enum, required)
            - Allowed values: `STRING`
          - `value` (string, required, nullable)
        - NUMBER
          - `node_input_id` (string, required)
          - `key` (string, required)
          - `type` (enum, required)
            - Allowed values: `NUMBER`
          - `value` (double, required, nullable)
        - JSON
          - `node_input_id` (string, required)
          - `key` (string, required)
          - `type` (enum, required)
            - Allowed values: `JSON`
          - `value` (any, required, nullable)
        - CHAT_HISTORY
          - `node_input_id` (string, required)
          - `key` (string, required)
          - `type` (enum, required)
            - Allowed values: `CHAT_HISTORY`
          - `value` (list of object, required, nullable)
            - `role` (enum, required) — * `SYSTEM` - System * `ASSISTANT` - Assistant * `USER` - User * `FUNCTION` - Function
            - `text` (string, optional, nullable)
            - `content` (object or object or object or object or object or object or object, optional, nullable)
            - `source` (string, optional, nullable) — An optional identifier representing who or what generated this message.
            - `metadata` (map from string to any, optional, nullable)
        - SEARCH_RESULTS
          - `node_input_id` (string, required)
          - `key` (string, required)
          - `type` (enum, required)
            - Allowed values: `SEARCH_RESULTS`
          - `value` (list of object, required, nullable)
            - `text` (string, required) — The text of the chunk that matched the search query.
            - `score` (double, required) — A score representing how well the chunk matches the search query.
            - `keywords` (list of string, required)
            - `document` (object, required) — The document that contains the chunk that matched the search query.
            - `meta` (object, optional, nullable) — Additional information about the search result.
        - ERROR
          - `node_input_id` (string, required)
          - `key` (string, required)
          - `type` (enum, required)
            - Allowed values: `ERROR`
          - `value` (object, required, nullable)
            - `code` (enum, required) — * `INVALID_REQUEST` - INVALID_REQUEST * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_ERROR` - PROVIDER_ERROR * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `REQUEST_TIMEOUT` - REQUEST_TIMEOUT * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `NODE_CANCELLED` - NODE_CANCELLED * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `CHAT_QUOTA_EXCEEDED` - CHAT_QUOTA_EXCEEDED
            - `message` (string, required)
            - `raw_data` (map from string to any, optional, nullable)
        - ARRAY
          - `node_input_id` (string, required)
          - `key` (string, required)
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
        - FUNCTION_CALL
          - `node_input_id` (string, required)
          - `key` (string, required)
          - `type` (enum, required)
            - Allowed values: `FUNCTION_CALL`
          - `value` (object, required, nullable) — The final resolved function call value.
            - `arguments` (map from string to any, required)
            - `name` (string, required)
            - `id` (string, optional, nullable)
        - SECRET
          - `node_input_id` (string, required)
          - `key` (string, required)
          - `type` (enum, required)
            - Allowed values: `SECRET`
          - `value` (object, required)
            - `name` (string, required)
        - AUDIO
          - `node_input_id` (string, required)
          - `key` (string, required)
          - `type` (enum, required)
            - Allowed values: `AUDIO`
          - `value` (object, required, nullable)
            - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
            - `metadata` (map from string to any, optional, nullable)
        - VIDEO
          - `node_input_id` (string, required)
          - `key` (string, required)
          - `type` (enum, required)
            - Allowed values: `VIDEO`
          - `value` (object, required, nullable)
            - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
            - `metadata` (map from string to any, optional, nullable)
        - IMAGE
          - `node_input_id` (string, required)
          - `key` (string, required)
          - `type` (enum, required)
            - Allowed values: `IMAGE`
          - `value` (object, required, nullable)
            - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
            - `metadata` (map from string to any, optional, nullable)
        - DOCUMENT
          - `node_input_id` (string, required)
          - `key` (string, required)
          - `type` (enum, required)
            - Allowed values: `DOCUMENT`
          - `value` (object, required, nullable)
            - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
            - `metadata` (map from string to any, optional, nullable)
    - STREAMING
      - `id` (string, required)
      - `node_id` (string, required)
      - `node_result_id` (string, required)
      - `state` (enum, required)
        - Allowed values: `STREAMING`
      - `data` (object or object or object or object or object or object or object or object or object or object or object, required, nullable)
        - PROMPT
          - `type` (enum, required)
            - Allowed values: `PROMPT`
          - `data` (object, required)
            - `output_id` (string, required)
            - `execution_meta` (object, optional, nullable) — The subset of the metadata tracked by Vellum during prompt execution that the request opted into with `expand_meta`.
            - `array_output_id` (string, optional, nullable)
            - `execution_id` (string, optional, nullable)
            - `text` (string, optional, nullable)
            - `delta` (string, optional, nullable)
        - SEARCH
          - `type` (enum, required)
            - Allowed values: `SEARCH`
          - `data` (object, required)
            - `results_output_id` (string, required)
            - `results` (list of object, required) — The results of the search. Each result represents a chunk that matches the search query.
            - `text_output_id` (string, required)
            - `text` (string, optional, nullable)
        - TEMPLATING
          - `type` (enum, required)
            - Allowed values: `TEMPLATING`
          - `data` (object, required)
            - `output` (object or object or object or object or object or object or object or object, required)
        - CODE_EXECUTION
          - `type` (enum, required)
            - Allowed values: `CODE_EXECUTION`
          - `data` (object, required)
            - `output` (object or object or object or object or object or object or object or object, required)
            - `log_output_id` (string, optional, nullable)
        - CONDITIONAL
          - `type` (enum, required)
            - Allowed values: `CONDITIONAL`
          - `data` (object, required)
            - `source_handle_id` (string, optional, nullable)
        - API
          - `type` (enum, required)
            - Allowed values: `API`
          - `data` (object, required)
            - `text_output_id` (string, required)
            - `json_output_id` (string, required)
            - `status_code_output_id` (string, required)
            - `status_code` (integer, required)
            - `json` (map from string to any, optional, nullable)
            - `text` (string, optional, nullable)
        - TERMINAL
          - `type` (enum, required)
            - Allowed values: `TERMINAL`
          - `data` (object, required)
            - `output` (object or object or object or object or object or object or object or object, required)
        - MERGE
          - `type` (enum, required)
            - Allowed values: `MERGE`
          - `data` (object, required)
            - `paused_node_data` (map from string to any, optional, nullable)
        - SUBWORKFLOW
          - `type` (enum, required)
            - Allowed values: `SUBWORKFLOW`
          - `data` (object, optional)
            - `execution_id` (string, optional, nullable)
        - METRIC
          - `type` (enum, required)
            - Allowed values: `METRIC`
        - MAP
          - `type` (enum, required)
            - Allowed values: `MAP`
          - `data` (object, optional)
            - `execution_ids` (list of string, required)
            - `iteration_state` (enum, optional, nullable) — * `INITIATED` - INITIATED * `FULFILLED` - FULFILLED * `REJECTED` - REJECTED
      - `ts` (string, optional, nullable)
      - `source_execution_id` (string, optional, nullable)
      - `output` (object or object or object or object or object or object or object or object or object, optional, nullable)
        - STRING
          - `type` (enum, required)
            - Allowed values: `STRING`
          - `value` (string, required, nullable)
          - `node_output_id` (string, required)
          - `state` (enum, optional) — * `INITIATED` - INITIATED * `STREAMING` - STREAMING * `FULFILLED` - FULFILLED * `REJECTED` - REJECTED
            - Allowed values: `INITIATED`, `STREAMING`, `FULFILLED`, `REJECTED`
        - NUMBER
          - `type` (enum, required)
            - Allowed values: `NUMBER`
          - `value` (double, required, nullable)
          - `node_output_id` (string, required)
          - `state` (enum, optional) — * `INITIATED` - INITIATED * `STREAMING` - STREAMING * `FULFILLED` - FULFILLED * `REJECTED` - REJECTED
            - Allowed values: `INITIATED`, `STREAMING`, `FULFILLED`, `REJECTED`
        - JSON
          - `type` (enum, required)
            - Allowed values: `JSON`
          - `value` (any, required, nullable)
          - `node_output_id` (string, required)
          - `state` (enum, optional) — * `INITIATED` - INITIATED * `STREAMING` - STREAMING * `FULFILLED` - FULFILLED * `REJECTED` - REJECTED
            - Allowed values: `INITIATED`, `STREAMING`, `FULFILLED`, `REJECTED`
        - CHAT_HISTORY
          - `type` (enum, required)
            - Allowed values: `CHAT_HISTORY`
          - `value` (list of object, required, nullable)
            - `role` (enum, required) — * `SYSTEM` - System * `ASSISTANT` - Assistant * `USER` - User * `FUNCTION` - Function
            - `text` (string, optional, nullable)
            - `content` (object or object or object or object or object or object or object, optional, nullable)
            - `source` (string, optional, nullable) — An optional identifier representing who or what generated this message.
            - `metadata` (map from string to any, optional, nullable)
          - `node_output_id` (string, required)
          - `state` (enum, optional) — * `INITIATED` - INITIATED * `STREAMING` - STREAMING * `FULFILLED` - FULFILLED * `REJECTED` - REJECTED
            - Allowed values: `INITIATED`, `STREAMING`, `FULFILLED`, `REJECTED`
        - SEARCH_RESULTS
          - `type` (enum, required)
            - Allowed values: `SEARCH_RESULTS`
          - `value` (list of object, required, nullable)
            - `text` (string, required) — The text of the chunk that matched the search query.
            - `score` (double, required) — A score representing how well the chunk matches the search query.
            - `keywords` (list of string, required)
            - `document` (object, required) — The document that contains the chunk that matched the search query.
            - `meta` (object, optional, nullable) — Additional information about the search result.
          - `node_output_id` (string, required)
          - `state` (enum, optional) — * `INITIATED` - INITIATED * `STREAMING` - STREAMING * `FULFILLED` - FULFILLED * `REJECTED` - REJECTED
            - Allowed values: `INITIATED`, `STREAMING`, `FULFILLED`, `REJECTED`
        - ERROR
          - `type` (enum, required)
            - Allowed values: `ERROR`
          - `value` (object, required, nullable)
            - `code` (enum, required) — * `INVALID_REQUEST` - INVALID_REQUEST * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_ERROR` - PROVIDER_ERROR * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `REQUEST_TIMEOUT` - REQUEST_TIMEOUT * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `NODE_CANCELLED` - NODE_CANCELLED * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `CHAT_QUOTA_EXCEEDED` - CHAT_QUOTA_EXCEEDED
            - `message` (string, required)
            - `raw_data` (map from string to any, optional, nullable)
          - `node_output_id` (string, required)
          - `state` (enum, optional) — * `INITIATED` - INITIATED * `STREAMING` - STREAMING * `FULFILLED` - FULFILLED * `REJECTED` - REJECTED
            - Allowed values: `INITIATED`, `STREAMING`, `FULFILLED`, `REJECTED`
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
          - `node_output_id` (string, required)
          - `state` (enum, optional) — * `INITIATED` - INITIATED * `STREAMING` - STREAMING * `FULFILLED` - FULFILLED * `REJECTED` - REJECTED
            - Allowed values: `INITIATED`, `STREAMING`, `FULFILLED`, `REJECTED`
        - FUNCTION_CALL
          - `type` (enum, required)
            - Allowed values: `FUNCTION_CALL`
          - `value` (object, required, nullable) — The final resolved function call value.
            - `arguments` (map from string to any, required)
            - `name` (string, required)
            - `id` (string, optional, nullable)
          - `node_output_id` (string, required)
          - `state` (enum, optional) — * `INITIATED` - INITIATED * `STREAMING` - STREAMING * `FULFILLED` - FULFILLED * `REJECTED` - REJECTED
            - Allowed values: `INITIATED`, `STREAMING`, `FULFILLED`, `REJECTED`
        - THINKING
          - `type` (enum, required)
            - Allowed values: `THINKING`
          - `value` (object, required, nullable) — A value representing a string.
            - `type` (enum, required)
            - `value` (string, required, nullable)
          - `node_output_id` (string, required)
          - `state` (enum, optional) — * `INITIATED` - INITIATED * `STREAMING` - STREAMING * `FULFILLED` - FULFILLED * `REJECTED` - REJECTED
            - Allowed values: `INITIATED`, `STREAMING`, `FULFILLED`, `REJECTED`
      - `output_index` (integer, optional, nullable)
    - FULFILLED
      - `id` (string, required)
      - `node_id` (string, required)
      - `node_result_id` (string, required)
      - `state` (enum, required)
        - Allowed values: `FULFILLED`
      - `data` (object or object or object or object or object or object or object or object or object or object or object, required, nullable)
        - PROMPT
          - `type` (enum, required)
            - Allowed values: `PROMPT`
          - `data` (object, required)
            - `output_id` (string, required)
            - `execution_meta` (object, optional, nullable) — The subset of the metadata tracked by Vellum during prompt execution that the request opted into with `expand_meta`.
            - `array_output_id` (string, optional, nullable)
            - `execution_id` (string, optional, nullable)
            - `text` (string, optional, nullable)
            - `delta` (string, optional, nullable)
        - SEARCH
          - `type` (enum, required)
            - Allowed values: `SEARCH`
          - `data` (object, required)
            - `results_output_id` (string, required)
            - `results` (list of object, required) — The results of the search. Each result represents a chunk that matches the search query.
            - `text_output_id` (string, required)
            - `text` (string, optional, nullable)
        - TEMPLATING
          - `type` (enum, required)
            - Allowed values: `TEMPLATING`
          - `data` (object, required)
            - `output` (object or object or object or object or object or object or object or object, required)
        - CODE_EXECUTION
          - `type` (enum, required)
            - Allowed values: `CODE_EXECUTION`
          - `data` (object, required)
            - `output` (object or object or object or object or object or object or object or object, required)
            - `log_output_id` (string, optional, nullable)
        - CONDITIONAL
          - `type` (enum, required)
            - Allowed values: `CONDITIONAL`
          - `data` (object, required)
            - `source_handle_id` (string, optional, nullable)
        - API
          - `type` (enum, required)
            - Allowed values: `API`
          - `data` (object, required)
            - `text_output_id` (string, required)
            - `json_output_id` (string, required)
            - `status_code_output_id` (string, required)
            - `status_code` (integer, required)
            - `json` (map from string to any, optional, nullable)
            - `text` (string, optional, nullable)
        - TERMINAL
          - `type` (enum, required)
            - Allowed values: `TERMINAL`
          - `data` (object, required)
            - `output` (object or object or object or object or object or object or object or object, required)
        - MERGE
          - `type` (enum, required)
            - Allowed values: `MERGE`
          - `data` (object, required)
            - `paused_node_data` (map from string to any, optional, nullable)
        - SUBWORKFLOW
          - `type` (enum, required)
            - Allowed values: `SUBWORKFLOW`
          - `data` (object, optional)
            - `execution_id` (string, optional, nullable)
        - METRIC
          - `type` (enum, required)
            - Allowed values: `METRIC`
        - MAP
          - `type` (enum, required)
            - Allowed values: `MAP`
          - `data` (object, optional)
            - `execution_ids` (list of string, required)
            - `iteration_state` (enum, optional, nullable) — * `INITIATED` - INITIATED * `FULFILLED` - FULFILLED * `REJECTED` - REJECTED
      - `output_values` (list of object or object or object or object or object or object or object or object or object, required)
        - STRING
          - `type` (enum, required)
            - Allowed values: `STRING`
          - `value` (string, required, nullable)
          - `node_output_id` (string, required)
          - `state` (enum, optional) — * `INITIATED` - INITIATED * `STREAMING` - STREAMING * `FULFILLED` - FULFILLED * `REJECTED` - REJECTED
            - Allowed values: `INITIATED`, `STREAMING`, `FULFILLED`, `REJECTED`
        - NUMBER
          - `type` (enum, required)
            - Allowed values: `NUMBER`
          - `value` (double, required, nullable)
          - `node_output_id` (string, required)
          - `state` (enum, optional) — * `INITIATED` - INITIATED * `STREAMING` - STREAMING * `FULFILLED` - FULFILLED * `REJECTED` - REJECTED
            - Allowed values: `INITIATED`, `STREAMING`, `FULFILLED`, `REJECTED`
        - JSON
          - `type` (enum, required)
            - Allowed values: `JSON`
          - `value` (any, required, nullable)
          - `node_output_id` (string, required)
          - `state` (enum, optional) — * `INITIATED` - INITIATED * `STREAMING` - STREAMING * `FULFILLED` - FULFILLED * `REJECTED` - REJECTED
            - Allowed values: `INITIATED`, `STREAMING`, `FULFILLED`, `REJECTED`
        - CHAT_HISTORY
          - `type` (enum, required)
            - Allowed values: `CHAT_HISTORY`
          - `value` (list of object, required, nullable)
            - `role` (enum, required) — * `SYSTEM` - System * `ASSISTANT` - Assistant * `USER` - User * `FUNCTION` - Function
            - `text` (string, optional, nullable)
            - `content` (object or object or object or object or object or object or object, optional, nullable)
            - `source` (string, optional, nullable) — An optional identifier representing who or what generated this message.
            - `metadata` (map from string to any, optional, nullable)
          - `node_output_id` (string, required)
          - `state` (enum, optional) — * `INITIATED` - INITIATED * `STREAMING` - STREAMING * `FULFILLED` - FULFILLED * `REJECTED` - REJECTED
            - Allowed values: `INITIATED`, `STREAMING`, `FULFILLED`, `REJECTED`
        - SEARCH_RESULTS
          - `type` (enum, required)
            - Allowed values: `SEARCH_RESULTS`
          - `value` (list of object, required, nullable)
            - `text` (string, required) — The text of the chunk that matched the search query.
            - `score` (double, required) — A score representing how well the chunk matches the search query.
            - `keywords` (list of string, required)
            - `document` (object, required) — The document that contains the chunk that matched the search query.
            - `meta` (object, optional, nullable) — Additional information about the search result.
          - `node_output_id` (string, required)
          - `state` (enum, optional) — * `INITIATED` - INITIATED * `STREAMING` - STREAMING * `FULFILLED` - FULFILLED * `REJECTED` - REJECTED
            - Allowed values: `INITIATED`, `STREAMING`, `FULFILLED`, `REJECTED`
        - ERROR
          - `type` (enum, required)
            - Allowed values: `ERROR`
          - `value` (object, required, nullable)
            - `code` (enum, required) — * `INVALID_REQUEST` - INVALID_REQUEST * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_ERROR` - PROVIDER_ERROR * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `REQUEST_TIMEOUT` - REQUEST_TIMEOUT * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `NODE_CANCELLED` - NODE_CANCELLED * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `CHAT_QUOTA_EXCEEDED` - CHAT_QUOTA_EXCEEDED
            - `message` (string, required)
            - `raw_data` (map from string to any, optional, nullable)
          - `node_output_id` (string, required)
          - `state` (enum, optional) — * `INITIATED` - INITIATED * `STREAMING` - STREAMING * `FULFILLED` - FULFILLED * `REJECTED` - REJECTED
            - Allowed values: `INITIATED`, `STREAMING`, `FULFILLED`, `REJECTED`
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
          - `node_output_id` (string, required)
          - `state` (enum, optional) — * `INITIATED` - INITIATED * `STREAMING` - STREAMING * `FULFILLED` - FULFILLED * `REJECTED` - REJECTED
            - Allowed values: `INITIATED`, `STREAMING`, `FULFILLED`, `REJECTED`
        - FUNCTION_CALL
          - `type` (enum, required)
            - Allowed values: `FUNCTION_CALL`
          - `value` (object, required, nullable) — The final resolved function call value.
            - `arguments` (map from string to any, required)
            - `name` (string, required)
            - `id` (string, optional, nullable)
          - `node_output_id` (string, required)
          - `state` (enum, optional) — * `INITIATED` - INITIATED * `STREAMING` - STREAMING * `FULFILLED` - FULFILLED * `REJECTED` - REJECTED
            - Allowed values: `INITIATED`, `STREAMING`, `FULFILLED`, `REJECTED`
        - THINKING
          - `type` (enum, required)
            - Allowed values: `THINKING`
          - `value` (object, required, nullable) — A value representing a string.
            - `type` (enum, required)
            - `value` (string, required, nullable)
          - `node_output_id` (string, required)
          - `state` (enum, optional) — * `INITIATED` - INITIATED * `STREAMING` - STREAMING * `FULFILLED` - FULFILLED * `REJECTED` - REJECTED
            - Allowed values: `INITIATED`, `STREAMING`, `FULFILLED`, `REJECTED`
      - `ts` (string, optional, nullable)
      - `source_execution_id` (string, optional, nullable)
      - `mocked` (boolean, optional)
    - REJECTED
      - `id` (string, required)
      - `node_id` (string, required)
      - `node_result_id` (string, required)
      - `state` (enum, required)
        - Allowed values: `REJECTED`
      - `data` (object or object or object or object or object or object or object or object or object or object or object, required, nullable)
        - PROMPT
          - `type` (enum, required)
            - Allowed values: `PROMPT`
          - `data` (object, required)
            - `output_id` (string, required)
            - `execution_meta` (object, optional, nullable) — The subset of the metadata tracked by Vellum during prompt execution that the request opted into with `expand_meta`.
            - `array_output_id` (string, optional, nullable)
            - `execution_id` (string, optional, nullable)
            - `text` (string, optional, nullable)
            - `delta` (string, optional, nullable)
        - SEARCH
          - `type` (enum, required)
            - Allowed values: `SEARCH`
          - `data` (object, required)
            - `results_output_id` (string, required)
            - `results` (list of object, required) — The results of the search. Each result represents a chunk that matches the search query.
            - `text_output_id` (string, required)
            - `text` (string, optional, nullable)
        - TEMPLATING
          - `type` (enum, required)
            - Allowed values: `TEMPLATING`
          - `data` (object, required)
            - `output` (object or object or object or object or object or object or object or object, required)
        - CODE_EXECUTION
          - `type` (enum, required)
            - Allowed values: `CODE_EXECUTION`
          - `data` (object, required)
            - `output` (object or object or object or object or object or object or object or object, required)
            - `log_output_id` (string, optional, nullable)
        - CONDITIONAL
          - `type` (enum, required)
            - Allowed values: `CONDITIONAL`
          - `data` (object, required)
            - `source_handle_id` (string, optional, nullable)
        - API
          - `type` (enum, required)
            - Allowed values: `API`
          - `data` (object, required)
            - `text_output_id` (string, required)
            - `json_output_id` (string, required)
            - `status_code_output_id` (string, required)
            - `status_code` (integer, required)
            - `json` (map from string to any, optional, nullable)
            - `text` (string, optional, nullable)
        - TERMINAL
          - `type` (enum, required)
            - Allowed values: `TERMINAL`
          - `data` (object, required)
            - `output` (object or object or object or object or object or object or object or object, required)
        - MERGE
          - `type` (enum, required)
            - Allowed values: `MERGE`
          - `data` (object, required)
            - `paused_node_data` (map from string to any, optional, nullable)
        - SUBWORKFLOW
          - `type` (enum, required)
            - Allowed values: `SUBWORKFLOW`
          - `data` (object, optional)
            - `execution_id` (string, optional, nullable)
        - METRIC
          - `type` (enum, required)
            - Allowed values: `METRIC`
        - MAP
          - `type` (enum, required)
            - Allowed values: `MAP`
          - `data` (object, optional)
            - `execution_ids` (list of string, required)
            - `iteration_state` (enum, optional, nullable) — * `INITIATED` - INITIATED * `FULFILLED` - FULFILLED * `REJECTED` - REJECTED
      - `error` (object, required)
        - `message` (string, required)
        - `code` (enum, required) — * `WORKFLOW_INITIALIZATION` - WORKFLOW_INITIALIZATION * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `WORKFLOW_TIMEOUT` - WORKFLOW_TIMEOUT * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `NODE_EXECUTION_COUNT_LIMIT_REACHED` - NODE_EXECUTION_COUNT_LIMIT_REACHED * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `NODE_EXECUTION` - NODE_EXECUTION * `NODE_CANCELLED` - NODE_CANCELLED * `NODE_TIMEOUT` - NODE_TIMEOUT * `LLM_PROVIDER` - LLM_PROVIDER * `INVALID_TEMPLATE` - INVALID_TEMPLATE * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR
          - Allowed values: `WORKFLOW_INITIALIZATION`, `WORKFLOW_CANCELLED`, `WORKFLOW_TIMEOUT`, `PROVIDER_CREDENTIALS_UNAVAILABLE`, `INTEGRATION_CREDENTIALS_UNAVAILABLE`, `NODE_EXECUTION_COUNT_LIMIT_REACHED`, `INTERNAL_SERVER_ERROR`, `NODE_EXECUTION`, `NODE_CANCELLED`, `NODE_TIMEOUT`, `LLM_PROVIDER`, `INVALID_TEMPLATE`, `INVALID_INPUTS`, `PROVIDER_QUOTA_EXCEEDED`, `USER_DEFINED_ERROR`
        - `raw_data` (map from string to any or string, optional, nullable)
        - `stacktrace` (string, optional, nullable)
      - `ts` (string, optional, nullable)
      - `source_execution_id` (string, optional, nullable)
  - `run_id` (string, optional, nullable)
  - `external_id` (string, optional, nullable)

## Errors

### 400 Bad Request Error

- `map from string to any`

### 404 Not Found Error

- `detail` (string, required) — Details about why the request failed.

### 500 Internal Server Error

- `detail` (string, required) — Details about why the request failed.

## Examples

**Request**

```json
{
  "inputs": [
    {
      "name": "string",
      "type": "STRING",
      "value": "string"
    }
  ]
}
```

**Response**

```json
[
  {
    "type": "json",
    "value": {
      "execution_id": "string",
      "run_id": "string",
      "external_id": "string",
      "type": "WORKFLOW",
      "data": {
        "id": "string",
        "state": "INITIATED",
        "ts": "2024-01-15T09:30:00Z",
        "output": {
          "id": "string",
          "name": "string",
          "state": "INITIATED",
          "node_id": "string",
          "delta": "string",
          "type": "STRING",
          "value": "string"
        },
        "error": {
          "message": "string",
          "raw_data": {},
          "code": "WORKFLOW_INITIALIZATION",
          "stacktrace": "string"
        },
        "outputs": [
          {
            "id": "string",
            "name": "string",
            "type": "STRING",
            "value": "string"
          }
        ],
        "inputs": [
          {
            "id": "string",
            "name": "string",
            "type": "STRING",
            "value": "string"
          }
        ]
      }
    }
  }
]
```

**SDK Code**

```python
import requests

url = "https://predict.vellum.ai/v1/execute-workflow-stream"

payload = { "inputs": [
        {
            "name": "string",
            "type": "STRING",
            "value": "string"
        }
    ] }
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
const response = await client.executeWorkflowStream({
    inputs: [{
            name: "x",
            type: "STRING",
            value: "value"
        }, {
            name: "x",
            type: "STRING",
            value: "value"
        }]
});
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

	url := "https://predict.vellum.ai/v1/execute-workflow-stream"

	payload := strings.NewReader("{\n  \"inputs\": [\n    {\n      \"name\": \"string\",\n      \"type\": \"STRING\",\n      \"value\": \"string\"\n    }\n  ]\n}")

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

url = URI("https://predict.vellum.ai/v1/execute-workflow-stream")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["X-API-KEY"] = '<apiKey>'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"inputs\": [\n    {\n      \"name\": \"string\",\n      \"type\": \"STRING\",\n      \"value\": \"string\"\n    }\n  ]\n}"

response = http.request(request)
puts response.read_body
```

```java
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;

HttpResponse<String> response = Unirest.post("https://predict.vellum.ai/v1/execute-workflow-stream")
  .header("X-API-KEY", "<apiKey>")
  .header("Content-Type", "application/json")
  .body("{\n  \"inputs\": [\n    {\n      \"name\": \"string\",\n      \"type\": \"STRING\",\n      \"value\": \"string\"\n    }\n  ]\n}")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://predict.vellum.ai/v1/execute-workflow-stream', [
  'body' => '{
  "inputs": [
    {
      "name": "string",
      "type": "STRING",
      "value": "string"
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

var client = new RestClient("https://predict.vellum.ai/v1/execute-workflow-stream");
var request = new RestRequest(Method.POST);
request.AddHeader("X-API-KEY", "<apiKey>");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"inputs\": [\n    {\n      \"name\": \"string\",\n      \"type\": \"STRING\",\n      \"value\": \"string\"\n    }\n  ]\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "X-API-KEY": "<apiKey>",
  "Content-Type": "application/json"
]
let parameters = ["inputs": [
    [
      "name": "string",
      "type": "STRING",
      "value": "string"
    ]
  ]] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://predict.vellum.ai/v1/execute-workflow-stream")! as URL,
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