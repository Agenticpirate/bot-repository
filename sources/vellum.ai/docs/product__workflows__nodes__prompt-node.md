> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Prompt Node

> Invoke LLMs with your prompts, optionally using variables from other nodes.

A core part of any LLM application. This node represents a call to a Large Language Model (LLM). Similar to Vellum Prompts, you can use models from any of the major providers or open source community, including: OpenAI, Anthropic, Meta, Cohere, Google, Mosaic, and Falcon-40b.

Upon creating a Prompt Node you'll be asked to import a prompt from an existing Deployment, Sandbox, or create one from scratch. Prompts are defined by their variables, prompt template, model provider, and parameters. Refer to this help center article to learn more about our prompt syntax ([Vellum Prompt Template Syntax](/product/prompts/prompt-engineering)).

## Prompt Node Interface

The Prompt Node provides a simple interface for configuring your LLM call:

![Prompt Node](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/c96366ea-6ab5-4593-b08e-01a9f64c1fd5-prompt_node_1.png)

When you open the Prompt Node, you'll see a detailed configuration interface where you can set up your prompt, select models, and configure parameters:

![Prompt Node Configuration](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/c96366ea-6ab5-4593-b08e-01a9f64c1fd5-prompt_node_2.png)

## Key Features

* **Variable Integration**: Easily incorporate variables from upstream nodes
* **Model Selection**: Choose from a wide range of LLM providers and models
* **Parameter Configuration**: Fine-tune model behavior with parameters like Temperature, Max Output Tokens, and more
* **Prompt Editing**: Create and edit prompts directly within the workflow
* **Function Calling**: Support for structured outputs via function calling (with compatible models)