> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Displayable Nodes Overview

> Overview of all Workflows SDK Displayable Node types that support bidirectional synchronization between UI and code.

## Supported Displayable Nodes

Displayable nodes are nodes that can be displayed and edited in the Vellum UI. They support complete push and pull operations allowing you to edit the node's configuration in either the Vellum UI or as code and have those changes reflected in the other.

Below is an overview of each Displayable Node type with links to their detailed API reference pages.

| Node                                                                                                     | Description                                                                        |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [Agent Node](/developers/workflows-sdk/api-reference/nodes/agent-node)                                   | Simplify tool calling with automatic schema handling and iterative loop logic      |
| [Inline Prompt Node](/developers/workflows-sdk/api-reference/nodes/inline-prompt-node)                   | Execute prompts directly within workflows without requiring prompt deployments     |
| [Inline Subworkflow Node](/developers/workflows-sdk/api-reference/nodes/inline-subworkflow-node)         | Execute subworkflows defined inline within your workflow code                      |
| [Prompt Deployment Node](/developers/workflows-sdk/api-reference/nodes/prompt-deployment-node)           | Execute deployed prompts from your Prompt Deployment system                        |
| [Search Node](/developers/workflows-sdk/api-reference/nodes/search-node)                                 | Perform hybrid search against a Document Index for RAG applications                |
| [Subworkflow Deployment Node](/developers/workflows-sdk/api-reference/nodes/subworkflow-deployment-node) | Execute deployed workflows as subworkflows within parent workflows                 |
| [API Node](/developers/workflows-sdk/api-reference/nodes/api-node)                                       | Make HTTP requests to external API endpoints                                       |
| [Code Execution Node](/developers/workflows-sdk/api-reference/nodes/code-execution-node)                 | Run custom Python or TypeScript code within your workflows                         |
| [Templating Node](/developers/workflows-sdk/api-reference/nodes/templating-node)                         | Apply Jinja2 templating for lightweight data transformations                       |
| [Guardrail Node](/developers/workflows-sdk/api-reference/nodes/guardrail-node)                           | Run inline evaluations using pre-defined Metrics for quality checks                |
| [Map Node](/developers/workflows-sdk/api-reference/nodes/map-node)                                       | Iterate over arrays, executing subworkflows for each item with parallel processing |
| [Conditional Node](/developers/workflows-sdk/api-reference/nodes/conditional-node)                       | Branch workflow execution based on conditions and upstream node results            |
| [Merge Node](/developers/workflows-sdk/api-reference/nodes/merge-node)                                   | Consolidate divergent execution paths using configurable merge strategies          |
| [Error Node](/developers/workflows-sdk/api-reference/nodes/error-node)                                   | Terminate workflow execution and raise custom error messages                       |
| [Final Output Node](/developers/workflows-sdk/api-reference/nodes/final-output-node)                     | Stream workflow responses to production endpoints with Expression inputs           |

## Push and Pull Operations

All Displayable Nodes support bidirectional synchronization between the Vellum UI and your SDK code:

* **Push**: Upload locally defined node configurations to the Vellum application using `vellum workflows push`
* **Pull**: Download node configurations from the Vellum UI to your local SDK using `vellum workflows pull`

This enables seamless collaboration between technical and non-technical team members, allowing nodes to be configured in either environment while maintaining consistency.

## Node Configuration

Each Displayable Node can be configured with:

* **Attributes**: Required and optional parameters that define the node's behavior
* **Outputs**: The data types and values returned by the node after execution
* **Input Mapping**: References to Workflow inputs or outputs from upstream nodes
* **Ports**: Conditional routing logic that controls workflow execution flow based on node outputs

For detailed configuration options and code examples, see the individual node reference pages linked above.

For comprehensive examples of port syntax and conditional logic patterns, see the [Ports and Branches tutorial](/developers/workflows-sdk/tutorials/ports-and-branches).