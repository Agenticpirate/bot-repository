> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Guardrail Node

> Run an inline evaluation using a pre-defined Metric.

Guardrail Nodes allow you to use Evaluation Metrics from within a Workflow. Guardrail Nodes let you run pre-defined evaluation criteria at runtime as part of a Workflow execution so that you can drive downstream behavior based on that Metric's score.

For example, if building a RAG application, you might determine whether the generated response passes some threshold for [Ragas Faithfulness](https://docs.ragas.io/en/latest/concepts/metrics/faithfulness.html) and if not, loop around to try again.

![Guardrail Nodes](https://storage.googleapis.com/vellum-public/help-docs/changelogs/2024-05/guardrail-nodes.png)