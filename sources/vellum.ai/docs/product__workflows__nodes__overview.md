> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Nodes Overview

> Overview of all Vellum Workflow Node types.

## Supported Nodes

Vellum offers over a dozen Node types that you can use to build any Workflow you can imagine. Below is an overview of each Node type with links to their detailed pages.

| Node                                                                      | Description                                                                 |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [Agent Node](/product/workflows/nodes/agent-node)                         | Streamline tool calling with automatic schema handling and loop logic       |
| [Prompt Node](/product/workflows/nodes/prompt-node)                       | Invoke LLMs with your prompts, optionally using variables from other nodes  |
| [Prompt Deployment Node](/product/workflows/nodes/prompt-deployment-node) | Execute deployed prompts in your workflows                                  |
| [Templating Node](/product/workflows/nodes/templating-node)               | Apply Jinja templating to perform lightweight data transformations          |
| [Search Node](/product/workflows/nodes/search-node)                       | Search against a Document Index, great for RAG                              |
| [API Node](/product/workflows/nodes/api-node)                             | Make an HTTP request to an API endpoint                                     |
| [Code Execution Node](/product/workflows/nodes/code-execution-node)       | Run custom Python or Typescript code                                        |
| [Subworkflow Node](/product/workflows/nodes/subworkflow-node)             | Makes Workflows reusable and more maintainable as they get more complex     |
| [Map Node](/product/workflows/nodes/map-node)                             | Iterate over an array, executing a sub-workflow for each item               |
| [Guardrail Node](/product/workflows/nodes/guardrail-node)                 | Run an inline evaluation using a pre-defined Metric                         |
| [Conditional Node](/product/workflows/nodes/conditional-node)             | Branch your workflow based on a condition, also useful for error handling   |
| [Merge Node](/product/workflows/nodes/merge-node)                         | Wait for one or multiple branches to complete before continuing             |
| [Final Output Node](/product/workflows/nodes/final-output-node)           | Exposes values you can use in your application, you may have more than one! |
| [Error Node](/product/workflows/nodes/error-node)                         | Stop workflow execution and raise an error                                  |
| [Note Node](/product/workflows/nodes/note-node)                           | A simple node that displays text to help annotate your Workflow             |

## Node Adornments

In addition to the standard nodes, Vellum also supports [Node Adornments](/product/workflows/nodes/node-adornments) that can be applied to existing nodes to add functionality like error handling and retry logic:

| Adornment                                                                             | Description                                                              |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [Retry Node Adornment](/product/workflows/nodes/node-adornments#retry-node-adornment) | Repeatedly invokes a node until it succeeds or reaches maximum attempts  |
| [Try Node Adornment](/product/workflows/nodes/node-adornments#try-node-adornment)     | Attempts to invoke a node and continues with an Error output if it fails |