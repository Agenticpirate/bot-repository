> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Execute Workflow Deployment as Stream

POST https://predict.vellum.ai/v1/workflow-deployments/{id}/execute-stream
Content-Type: application/json

Executes a deployed Workflow and streams back its results.

Reference: https://docs.vellum.ai/developers/client-sdk/workflows/deployments/execute-stream

## Authentication

- `X-API-KEY` header (required) — API Key authentication via header

## Request

### Path parameters

- `id` (string, required) — Either the Workflow Deployment's ID or its unique name

### Body (application/json)

This endpoint expects an object.

- `inputs` (map from string to any, optional) — A mapping from input name to value.
- `trigger` (string, optional, nullable) — The name or ID of a workflow trigger to use for this execution. If not specified, then a default manual trigger will be chosen.
- `release_tag` (string, optional, nullable) — Optionally specify a release tag if you want to pin to a specific release of the Workflow Deployment
- `external_id` (string, optional, nullable) — Optionally include a unique identifier for tracking purposes. Must be unique within a given Workspace.
- `metadata` (map from string to any, optional, nullable) — Arbitrary JSON metadata associated with this request. Can be used to capture additional monitoring data such as user id, session id, etc. for future analysis.
- `previous_execution_id` (string, optional, nullable) — The ID of a previous workflow execution to reference for context.

## Response

### 200

- Streaming response of `object or object or object or object or object or object or object or object or object or object or object or object or object or object`.
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
    - WORKFLOW_RELEASE_TAG
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
      - `links` (list of object, optional, nullable)
        - `trace_id` (string, required)
        - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
          - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
        - `span_context` (object or object or object or object or object or object or object or object or object, required)
      - `external_id` (string, optional, nullable)
      - `metadata` (map from string to any, optional, nullable)
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
      - WORKFLOW_RELEASE_TAG
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
        - `links` (list of object, optional, nullable)
        - `external_id` (string, optional, nullable)
        - `metadata` (map from string to any, optional, nullable)
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
    - WORKFLOW_RELEASE_TAG
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
      - `links` (list of object, optional, nullable)
        - `trace_id` (string, required)
        - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
          - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
        - `span_context` (object or object or object or object or object or object or object or object or object, required)
      - `external_id` (string, optional, nullable)
      - `metadata` (map from string to any, optional, nullable)
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
      - WORKFLOW_RELEASE_TAG
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
        - `links` (list of object, optional, nullable)
        - `external_id` (string, optional, nullable)
        - `metadata` (map from string to any, optional, nullable)
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
    - WORKFLOW_RELEASE_TAG
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
      - `links` (list of object, optional, nullable)
        - `trace_id` (string, required)
        - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
          - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
        - `span_context` (object or object or object or object or object or object or object or object or object, required)
      - `external_id` (string, optional, nullable)
      - `metadata` (map from string to any, optional, nullable)
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
      - WORKFLOW_RELEASE_TAG
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
        - `links` (list of object, optional, nullable)
        - `external_id` (string, optional, nullable)
        - `metadata` (map from string to any, optional, nullable)
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
        - Allowed values: `INVALID_WORKFLOW`, `INVALID_INPUTS`, `INVALID_OUTPUTS`, `INVALID_STATE`, `INVALID_CODE`, `INVALID_TEMPLATE`, `INTERNAL_ERROR`, `PROVIDER_CREDENTIALS_UNAVAILABLE`, `INTEGRATION_CREDENTIALS_UNAVAILABLE`, `PROVIDER_ERROR`, `PROVIDER_QUOTA_EXCEEDED`, `USER_DEFINED_ERROR`, `WORKFLOW_CANCELLED`, `WORKFLOW_TIMEOUT`, `NODE_CANCELLED`, `NODE_TIMEOUT`, `NODE_EXECUTION`
      - `raw_data` (map from string to any or string, optional, nullable)
    - `stacktrace` (string, optional, nullable)
  - `id` (string, required)
  - `timestamp` (string, required)
  - `trace_id` (string, required)
  - `span_id` (string, required)
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
    - WORKFLOW_RELEASE_TAG
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
      - `links` (list of object, optional, nullable)
        - `trace_id` (string, required)
        - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
          - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
        - `span_context` (object or object or object or object or object or object or object or object or object, required)
      - `external_id` (string, optional, nullable)
      - `metadata` (map from string to any, optional, nullable)
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
      - WORKFLOW_RELEASE_TAG
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
        - `links` (list of object, optional, nullable)
        - `external_id` (string, optional, nullable)
        - `metadata` (map from string to any, optional, nullable)
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
    - WORKFLOW_RELEASE_TAG
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
      - `links` (list of object, optional, nullable)
        - `trace_id` (string, required)
        - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
          - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
        - `span_context` (object or object or object or object or object or object or object or object or object, required)
      - `external_id` (string, optional, nullable)
      - `metadata` (map from string to any, optional, nullable)
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
      - WORKFLOW_RELEASE_TAG
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
        - `links` (list of object, optional, nullable)
        - `external_id` (string, optional, nullable)
        - `metadata` (map from string to any, optional, nullable)
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
    - WORKFLOW_RELEASE_TAG
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
      - `links` (list of object, optional, nullable)
        - `trace_id` (string, required)
        - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
          - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
        - `span_context` (object or object or object or object or object or object or object or object or object, required)
      - `external_id` (string, optional, nullable)
      - `metadata` (map from string to any, optional, nullable)
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
      - WORKFLOW_RELEASE_TAG
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
        - `links` (list of object, optional, nullable)
        - `external_id` (string, optional, nullable)
        - `metadata` (map from string to any, optional, nullable)
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
    - WORKFLOW_RELEASE_TAG
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
      - `links` (list of object, optional, nullable)
        - `trace_id` (string, required)
        - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
          - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
        - `span_context` (object or object or object or object or object or object or object or object or object, required)
      - `external_id` (string, optional, nullable)
      - `metadata` (map from string to any, optional, nullable)
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
      - WORKFLOW_RELEASE_TAG
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
        - `links` (list of object, optional, nullable)
        - `external_id` (string, optional, nullable)
        - `metadata` (map from string to any, optional, nullable)
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
  - `api_version` (enum, optional) — * `2024-10-25` - V2024_10_25 * `2025-07-30` - V2025_07_30
    - Allowed values: `2024-10-25`, `2025-07-30`
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
    - WORKFLOW_RELEASE_TAG
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
      - `links` (list of object, optional, nullable)
        - `trace_id` (string, required)
        - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
          - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
        - `span_context` (object or object or object or object or object or object or object or object or object, required)
      - `external_id` (string, optional, nullable)
      - `metadata` (map from string to any, optional, nullable)
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
      - WORKFLOW_RELEASE_TAG
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
        - `links` (list of object, optional, nullable)
        - `external_id` (string, optional, nullable)
        - `metadata` (map from string to any, optional, nullable)
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
    - WORKFLOW_RELEASE_TAG
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
      - `links` (list of object, optional, nullable)
        - `trace_id` (string, required)
        - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
          - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
        - `span_context` (object or object or object or object or object or object or object or object or object, required)
      - `external_id` (string, optional, nullable)
      - `metadata` (map from string to any, optional, nullable)
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
      - WORKFLOW_RELEASE_TAG
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
        - `links` (list of object, optional, nullable)
        - `external_id` (string, optional, nullable)
        - `metadata` (map from string to any, optional, nullable)
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
        - Allowed values: `INVALID_WORKFLOW`, `INVALID_INPUTS`, `INVALID_OUTPUTS`, `INVALID_STATE`, `INVALID_CODE`, `INVALID_TEMPLATE`, `INTERNAL_ERROR`, `PROVIDER_CREDENTIALS_UNAVAILABLE`, `INTEGRATION_CREDENTIALS_UNAVAILABLE`, `PROVIDER_ERROR`, `PROVIDER_QUOTA_EXCEEDED`, `USER_DEFINED_ERROR`, `WORKFLOW_CANCELLED`, `WORKFLOW_TIMEOUT`, `NODE_CANCELLED`, `NODE_TIMEOUT`, `NODE_EXECUTION`
      - `raw_data` (map from string to any or string, optional, nullable)
    - `stacktrace` (string, optional, nullable)
  - `id` (string, required)
  - `timestamp` (string, required)
  - `trace_id` (string, required)
  - `span_id` (string, required)
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
    - WORKFLOW_RELEASE_TAG
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
      - `links` (list of object, optional, nullable)
        - `trace_id` (string, required)
        - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
          - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
        - `span_context` (object or object or object or object or object or object or object or object or object, required)
      - `external_id` (string, optional, nullable)
      - `metadata` (map from string to any, optional, nullable)
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
      - WORKFLOW_RELEASE_TAG
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
        - `links` (list of object, optional, nullable)
        - `external_id` (string, optional, nullable)
        - `metadata` (map from string to any, optional, nullable)
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
    - WORKFLOW_RELEASE_TAG
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
      - `links` (list of object, optional, nullable)
        - `trace_id` (string, required)
        - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
          - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
        - `span_context` (object or object or object or object or object or object or object or object or object, required)
      - `external_id` (string, optional, nullable)
      - `metadata` (map from string to any, optional, nullable)
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
      - WORKFLOW_RELEASE_TAG
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
        - `links` (list of object, optional, nullable)
        - `external_id` (string, optional, nullable)
        - `metadata` (map from string to any, optional, nullable)
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
        - `name` (string, required) — The name of the resource, typically a class name.
        - `module` (list of string, required) — The module that this resource is defined in.
      - `name` (string, required)
      - `inputs_class` (object, optional, nullable) — The definition of a resource defined in code.
        - `name` (string, required) — The name of the resource, typically a class name.
        - `module` (list of string, required) — The module that this resource is defined in.
      - `instance` (any, optional, nullable)
  - `id` (string, required)
  - `timestamp` (string, required)
  - `trace_id` (string, required)
  - `span_id` (string, required)
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
    - WORKFLOW_RELEASE_TAG
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
      - `links` (list of object, optional, nullable)
        - `trace_id` (string, required)
        - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
          - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
        - `span_context` (object or object or object or object or object or object or object or object or object, required)
      - `external_id` (string, optional, nullable)
      - `metadata` (map from string to any, optional, nullable)
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
      - WORKFLOW_RELEASE_TAG
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
        - `links` (list of object, optional, nullable)
        - `external_id` (string, optional, nullable)
        - `metadata` (map from string to any, optional, nullable)
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
    - WORKFLOW_RELEASE_TAG
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
      - `links` (list of object, optional, nullable)
        - `trace_id` (string, required)
        - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
          - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
        - `span_context` (object or object or object or object or object or object or object or object or object, required)
      - `external_id` (string, optional, nullable)
      - `metadata` (map from string to any, optional, nullable)
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
      - WORKFLOW_RELEASE_TAG
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
        - `links` (list of object, optional, nullable)
        - `external_id` (string, optional, nullable)
        - `metadata` (map from string to any, optional, nullable)
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
    - WORKFLOW_RELEASE_TAG
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
      - `links` (list of object, optional, nullable)
        - `trace_id` (string, required)
        - `type` (enum, required) — * `TRIGGERED_BY` - TRIGGERED_BY * `PREVIOUS_SPAN` - PREVIOUS_SPAN * `ROOT_SPAN` - ROOT_SPAN
          - Allowed values: `TRIGGERED_BY`, `PREVIOUS_SPAN`, `ROOT_SPAN`
        - `span_context` (object or object or object or object or object or object or object or object or object, required)
      - `external_id` (string, optional, nullable)
      - `metadata` (map from string to any, optional, nullable)
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
      - WORKFLOW_RELEASE_TAG
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
        - `links` (list of object, optional, nullable)
        - `external_id` (string, optional, nullable)
        - `metadata` (map from string to any, optional, nullable)
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
  - `api_version` (enum, optional) — * `2024-10-25` - V2024_10_25 * `2025-07-30` - V2025_07_30
    - Allowed values: `2024-10-25`, `2025-07-30`

## Errors

### 400 Bad Request Error

- `map from string to any`

### 404 Not Found Error

- `map from string to any`

### 500 Internal Server Error

- `map from string to any`

## Examples

### String input example

**Request**

```json
{
  "inputs": {
    "question": "What is the capital of France?"
  }
}
```

**Response**

```json
[
  {
    "type": "json",
    "value": {
      "name": "workflow.execution.initiated",
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "timestamp": "2024-01-15T10:30:00Z",
      "trace_id": "550e8400-e29b-41d4-a716-446655440010",
      "span_id": "550e8400-e29b-41d4-a716-446655440011",
      "body": {
        "workflow_definition": {
          "id": "550e8400-e29b-41d4-a716-446655440020",
          "name": "MyWorkflow",
          "module": [
            "my_workflows"
          ]
        },
        "inputs": {
          "question": "What is the capital of France?"
        }
      }
    }
  },
  {
    "type": "json",
    "value": {
      "name": "workflow.execution.streaming",
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "timestamp": "2024-01-15T10:30:01Z",
      "trace_id": "550e8400-e29b-41d4-a716-446655440010",
      "span_id": "550e8400-e29b-41d4-a716-446655440011",
      "body": {
        "workflow_definition": {
          "id": "550e8400-e29b-41d4-a716-446655440020",
          "name": "MyWorkflow",
          "module": [
            "my_workflows"
          ]
        },
        "output": {
          "name": "answer",
          "delta": "The capital of France is Paris."
        }
      }
    }
  },
  {
    "type": "json",
    "value": {
      "name": "workflow.execution.fulfilled",
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "timestamp": "2024-01-15T10:30:02Z",
      "trace_id": "550e8400-e29b-41d4-a716-446655440010",
      "span_id": "550e8400-e29b-41d4-a716-446655440011",
      "body": {
        "workflow_definition": {
          "id": "550e8400-e29b-41d4-a716-446655440020",
          "name": "MyWorkflow",
          "module": [
            "my_workflows"
          ]
        },
        "outputs": {
          "answer": "The capital of France is Paris."
        }
      }
    }
  }
]
```

**SDK Code**

```python String input example
import requests

url = "https://predict.vellum.ai/v1/workflow-deployments/my-workflow/execute-stream"

payload = { "inputs": { "question": "What is the capital of France?" } }
headers = {
    "X-API-KEY": "<apiKey>",
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)

print(response.json())
```

```typescript String input example
import { VellumClient } from "vellum-ai";

const client = new VellumClient({ apiKey: "YOUR_API_KEY", apiVersion: "YOUR_API_VERSION" });
const response = await client.workflowDeployments.executeStream("my-workflow", {
    inputs: {
        "question": "What is the capital of France?"
    }
});
for await (const item of response) {
    console.log(item);
}

```

```go String input example
package main

import (
	"fmt"
	"strings"
	"net/http"
	"io"
)

func main() {

	url := "https://predict.vellum.ai/v1/workflow-deployments/my-workflow/execute-stream"

	payload := strings.NewReader("{\n  \"inputs\": {\n    \"question\": \"What is the capital of France?\"\n  }\n}")

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

```ruby String input example
require 'uri'
require 'net/http'

url = URI("https://predict.vellum.ai/v1/workflow-deployments/my-workflow/execute-stream")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["X-API-KEY"] = '<apiKey>'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"inputs\": {\n    \"question\": \"What is the capital of France?\"\n  }\n}"

response = http.request(request)
puts response.read_body
```

```java String input example
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;

HttpResponse<String> response = Unirest.post("https://predict.vellum.ai/v1/workflow-deployments/my-workflow/execute-stream")
  .header("X-API-KEY", "<apiKey>")
  .header("Content-Type", "application/json")
  .body("{\n  \"inputs\": {\n    \"question\": \"What is the capital of France?\"\n  }\n}")
  .asString();
```

```php String input example
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://predict.vellum.ai/v1/workflow-deployments/my-workflow/execute-stream', [
  'body' => '{
  "inputs": {
    "question": "What is the capital of France?"
  }
}',
  'headers' => [
    'Content-Type' => 'application/json',
    'X-API-KEY' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp String input example
using RestSharp;

var client = new RestClient("https://predict.vellum.ai/v1/workflow-deployments/my-workflow/execute-stream");
var request = new RestRequest(Method.POST);
request.AddHeader("X-API-KEY", "<apiKey>");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"inputs\": {\n    \"question\": \"What is the capital of France?\"\n  }\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift String input example
import Foundation

let headers = [
  "X-API-KEY": "<apiKey>",
  "Content-Type": "application/json"
]
let parameters = ["inputs": ["question": "What is the capital of France?"]] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://predict.vellum.ai/v1/workflow-deployments/my-workflow/execute-stream")! as URL,
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

### Chat trigger example

**Request**

```json
{
  "inputs": {
    "message": "What is machine learning?"
  },
  "trigger": "chat",
  "previous_execution_id": "550e8400-e29b-41d4-a716-446655440099"
}
```

**Response**

```json
[
  {
    "type": "json",
    "value": {
      "name": "workflow.execution.initiated",
      "id": "550e8400-e29b-41d4-a716-446655440004",
      "timestamp": "2024-01-15T10:31:00Z",
      "trace_id": "550e8400-e29b-41d4-a716-446655440050",
      "span_id": "550e8400-e29b-41d4-a716-446655440051",
      "body": {
        "workflow_definition": {
          "id": "550e8400-e29b-41d4-a716-446655440060",
          "name": "MyChatWorkflow",
          "module": [
            "my_workflows"
          ]
        },
        "inputs": {
          "message": "What is machine learning?"
        },
        "trigger": {
          "id": "550e8400-e29b-41d4-a716-446655440070",
          "name": "ChatTrigger",
          "module": [
            "my_workflows",
            "triggers"
          ]
        }
      }
    }
  },
  {
    "type": "json",
    "value": {
      "name": "workflow.execution.streaming",
      "id": "550e8400-e29b-41d4-a716-446655440005",
      "timestamp": "2024-01-15T10:31:01Z",
      "trace_id": "550e8400-e29b-41d4-a716-446655440050",
      "span_id": "550e8400-e29b-41d4-a716-446655440051",
      "body": {
        "workflow_definition": {
          "id": "550e8400-e29b-41d4-a716-446655440060",
          "name": "MyChatWorkflow",
          "module": [
            "my_workflows"
          ]
        },
        "output": {
          "name": "response",
          "delta": "Machine learning is a subset of artificial intelligence."
        }
      }
    }
  },
  {
    "type": "json",
    "value": {
      "name": "workflow.execution.fulfilled",
      "id": "550e8400-e29b-41d4-a716-446655440006",
      "timestamp": "2024-01-15T10:31:02Z",
      "trace_id": "550e8400-e29b-41d4-a716-446655440050",
      "span_id": "550e8400-e29b-41d4-a716-446655440051",
      "body": {
        "workflow_definition": {
          "id": "550e8400-e29b-41d4-a716-446655440060",
          "name": "MyChatWorkflow",
          "module": [
            "my_workflows"
          ]
        },
        "outputs": {
          "response": "Machine learning is a subset of artificial intelligence that enables systems to learn from data."
        }
      }
    }
  }
]
```

**SDK Code**

```python Chat trigger example
import requests

url = "https://predict.vellum.ai/v1/workflow-deployments/my-chat-workflow/execute-stream"

payload = {
    "inputs": { "message": "What is machine learning?" },
    "trigger": "chat",
    "previous_execution_id": "550e8400-e29b-41d4-a716-446655440099"
}
headers = {
    "X-API-KEY": "<apiKey>",
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)

print(response.json())
```

```typescript Chat trigger example
import { VellumClient } from "vellum-ai";

const client = new VellumClient({ apiKey: "YOUR_API_KEY", apiVersion: "YOUR_API_VERSION" });
const response = await client.workflowDeployments.executeStream("my-chat-workflow", {
    trigger: "chat",
    previousExecutionId: "550e8400-e29b-41d4-a716-446655440099",
    inputs: {
        "message": "What is machine learning?"
    }
});
for await (const item of response) {
    console.log(item);
}

```

```go Chat trigger example
package main

import (
	"fmt"
	"strings"
	"net/http"
	"io"
)

func main() {

	url := "https://predict.vellum.ai/v1/workflow-deployments/my-chat-workflow/execute-stream"

	payload := strings.NewReader("{\n  \"inputs\": {\n    \"message\": \"What is machine learning?\"\n  },\n  \"trigger\": \"chat\",\n  \"previous_execution_id\": \"550e8400-e29b-41d4-a716-446655440099\"\n}")

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

```ruby Chat trigger example
require 'uri'
require 'net/http'

url = URI("https://predict.vellum.ai/v1/workflow-deployments/my-chat-workflow/execute-stream")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["X-API-KEY"] = '<apiKey>'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"inputs\": {\n    \"message\": \"What is machine learning?\"\n  },\n  \"trigger\": \"chat\",\n  \"previous_execution_id\": \"550e8400-e29b-41d4-a716-446655440099\"\n}"

response = http.request(request)
puts response.read_body
```

```java Chat trigger example
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;

HttpResponse<String> response = Unirest.post("https://predict.vellum.ai/v1/workflow-deployments/my-chat-workflow/execute-stream")
  .header("X-API-KEY", "<apiKey>")
  .header("Content-Type", "application/json")
  .body("{\n  \"inputs\": {\n    \"message\": \"What is machine learning?\"\n  },\n  \"trigger\": \"chat\",\n  \"previous_execution_id\": \"550e8400-e29b-41d4-a716-446655440099\"\n}")
  .asString();
```

```php Chat trigger example
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://predict.vellum.ai/v1/workflow-deployments/my-chat-workflow/execute-stream', [
  'body' => '{
  "inputs": {
    "message": "What is machine learning?"
  },
  "trigger": "chat",
  "previous_execution_id": "550e8400-e29b-41d4-a716-446655440099"
}',
  'headers' => [
    'Content-Type' => 'application/json',
    'X-API-KEY' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp Chat trigger example
using RestSharp;

var client = new RestClient("https://predict.vellum.ai/v1/workflow-deployments/my-chat-workflow/execute-stream");
var request = new RestRequest(Method.POST);
request.AddHeader("X-API-KEY", "<apiKey>");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"inputs\": {\n    \"message\": \"What is machine learning?\"\n  },\n  \"trigger\": \"chat\",\n  \"previous_execution_id\": \"550e8400-e29b-41d4-a716-446655440099\"\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift Chat trigger example
import Foundation

let headers = [
  "X-API-KEY": "<apiKey>",
  "Content-Type": "application/json"
]
let parameters = [
  "inputs": ["message": "What is machine learning?"],
  "trigger": "chat",
  "previous_execution_id": "550e8400-e29b-41d4-a716-446655440099"
] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://predict.vellum.ai/v1/workflow-deployments/my-chat-workflow/execute-stream")! as URL,
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