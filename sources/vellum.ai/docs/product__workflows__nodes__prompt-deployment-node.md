> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Prompt Deployment Node

> Execute deployed prompts in your workflows.

The Prompt Deployment Node allows you to execute a prompt that has been deployed through Vellum's Prompt Deployment system. This provides a way to reference and use prompts that are already versioned and managed in your Vellum workspace.

## Prompt Deployment Node Interface

The Prompt Deployment Node provides a simple interface for connecting to your deployed prompts:

![Prompt Deployment Node](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/c96366ea-6ab5-4593-b08e-01a9f64c1fd5-prompt_deployment_node_1.png)

When you open the Prompt Deployment Node, you'll see a detailed configuration interface where you can select the deployment and configure inputs:

![Prompt Deployment Node Configuration](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/c96366ea-6ab5-4593-b08e-01a9f64c1fd5-prompt_deployment_node_2.png)

## Key Features

* **Deployment Integration**: Connect to any prompt deployment in your workspace
* **Release Tag Selection**: Choose specific versions of your prompts using release tags
* **Input Mapping**: Map workflow variables to prompt inputs
* **Versioning Benefits**: Take advantage of Vellum's prompt versioning and management
* **Centralized Updates**: Update the prompt in one place and all workflows using it will reflect the changes

## When to Use

Use a Prompt Deployment Node when:

* You want to maintain a single source of truth for prompts used across multiple workflows
* You want to leverage Vellum's Prompt Versioning and Custom Release Tags
* You're building complex applications where Prompt management is critical
* You want to update prompts without modifying workflow configurations
* You want to unit test your Prompts in isolation from your Workflows

## Compared to Inline Prompt Node

While the [Prompt Node](/product/workflows/nodes/prompt-node) allows you to define prompts directly within your workflow, the Prompt Deployment Node references prompts that have been deployed separately. This separation provides better organization and version control for production systems.