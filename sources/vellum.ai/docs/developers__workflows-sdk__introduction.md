> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Workflows SDK

> Vellum's Workflows SDK is a framework for defining and executing complex AI systems as graphs.

If you don't have a Vellum account yet, you can [sign up for free here](https://app.vellum.ai/signup?f=wsdk\&utm_source=docs\&utm_medium=intro_page\&utm_campaign=sdk).

## What is Vellum Workflows SDK?

The Vellum Workflows SDK is a framework for defining and executing agentic AI systems as graphs using a declarative, type-safe approach.
Unlike other graph frameworks that are functional or event-driven, Vellum Workflows SDK:

* Defines control flow statically and declaratively with strict typing
* Provides type safety and intellisense benefits
* Makes graph structure known ahead of time
* Creates more predictable and robust AI systems

Additionally, Vellum Workflows SDK provides bidirectional syncing between code and Vellum's visual editor, making it easier to:

* Visualize and debug complex graphs (with loops, conditionals, and other control flow)
* Edit graphs visually or in code
* Execute graphs directly from the UI
* Seamlessly sync changes between code and UI
* Collaborate with non-technical users more directly

## Open Source

The Vellum Workflows SDK is fully open source and publicly available on [GitHub](https://github.com/vellum-ai/vellum-python-sdks/tree/main).

## Core Features

| Feature                                                                                                                                    | Description                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| [UI Integration](/developers/workflows-sdk/api-reference/cli)                                                                              | Bidirectional syncing between code and Vellum's visual editor                 |
| [Nodes](/developers/workflows-sdk/api-reference/nodes)                                                                                     | The basic building blocks of a graph that represent single tasks or functions |
| [Graph Syntax](/developers/workflows-sdk/defining-control-flow)                                                                            | Intuitive, declarative syntax for defining graph control flow                 |
| [Inputs](/developers/workflows-sdk/core-concepts#workflow-inputs)/[Outputs](/developers/workflows-sdk/core-concepts#defining-node-outputs) | Pass information between Nodes or Workflows using typed inputs and outputs    |
| [State Management](/developers/workflows-sdk/core-concepts#state)                                                                          | Share information between Nodes through the graph's global state              |
| [Advanced Control Flow](/developers/workflows-sdk/core-concepts#ports-and-conditionals)                                                    | Support for loops, conditionals, parallelism, state forking, and more         |
| [Streaming](/developers/workflows-sdk/core-concepts#streaming-outputs)                                                                     | Return partial results from long-running tasks like chat completions          |
| Human-in-the-loop                                                                                                                          | Pause Workflows for human or external system input                            |

## How It Works

1. **Define Nodes**: Create reusable components that represent specific tasks

2. **Build Your Graph**: Connect nodes to define your workflow's execution path

3. **Configure I/O**: Set up inputs, outputs, and state management for data flow

4. **Execute**: Run your workflow either programmatically or through the UI

5. **Visualize & Debug**: Use the UI to inspect execution paths and results

## Getting Started

#### [Code-first Quickstart](/developers/workflows-sdk/quickstart/code-first)

Define a Workflow entirely in code with full type safety, then push to UI

#### [UI-first Quickstart](/developers/workflows-sdk/quickstart/ui-first)

Build visually in the UI, then pull changes into code

#### [Core Concepts](/developers/workflows-sdk/core-concepts)

Learn about the core concepts of Vellum Workflows SDK