> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Code-first Approach

> Build Workflows in code and push them to the Vellum UI for collaboration and experimentation.

The instructions below will guide you through creating a Workflow using a starter template with the Vellum CLI.

### Set up your environment

#### Using uv (Recommended)

```bash
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv add vellum-ai
```

#### Using venv

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install vellum-ai
```

Before proceeding, make sure you have set your `VELLUM_API_KEY` environment variable. See the [installation guide](../installation#set-your-vellum-api-key) for instructions on how to set this up.

### Initialize a new Workflow from a template

Use the Vellum CLI to clone a starter template:

```bash
vellum workflows init
```

You'll see available templates. For this example, we'll use the **Prompt Chaining** template:

![Vellum workflows init showing available templates](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/13f65759-f3b9-4b00-a668-cffda2c2a53d-vellum-workflows-init-templates.png)

Select **Prompt Chaining** (option 1). When it completes succesfully, you'll get a message like: `Successfully pulled Workflow into ~/.../prompt_chaining`

### Understanding the Prompt Chaining template

The Prompt Chaining template generates blog topics, outlines, and full posts tailored to specific industries and audiences. It demonstrates key concepts like:

* **Workflow Inputs**: Parameters that customize the workflow behavior
* **Connecting Nodes**: How nodes pass data between each other
* **Scenarios**: Test cases for experimentation

The cloned Workflow includes these core files:

**`Project structure`**

```text title="Project structure"
prompt_chaining/                    # Project root directory
├── nodes/                          # Directory containing workflow nodes
│   ├── __init__.py
│   ├── topic_researcher.py        # Node for researching blog topics
│   ├── outline_creator.py         # Node for creating outlines
│   ├── content_generator.py       # Node for generating blog posts
│   └── final_output.py            # Final output node
├── display/                        # UI-specific files (auto-generated)
│   └── [UI-specific files]
├── __init__.py                     # Python package initialization
├── workflow.py                     # Main workflow definition
├── inputs.py                       # Workflow input schema
├── sandbox.py                      # Test scenarios and experimentation
├── vellum.lock.json               # Tracks workflow state for push/pull
└── pyproject.toml                 # Project configuration (alternative)
```

The `display/` directory contains UI-specific files that are useful when pushing back to the Vellum UI later. You don't need to modify these files.

### Run your Workflow

Test your Workflow using the sandbox file:

```bash
python -m prompt_chaining.sandbox
```

The `sandbox.py` file contains test cases that you can use as a "vibe-check" while experimenting. For more rigorous testing, use our [Evaluations product](/product/evaluation/quantitative-evaluation).

### Configuration files

Your project will include configuration files:

* **`vellum.lock.json`**: Tracks the state of your Workflow for push/pull operations
* **`pyproject.toml`**: Alternative configuration approach ([learn more](../configuration#configuring-your-project))

## Push to Vellum UI

Once you've built and tested your Workflow locally, you can push it to the Vellum UI for debugging, collaboration, or to let subject matter experts help with prompt optimization.

### Create a new Workflow Sandbox

1. Go to [app.vellum.ai/workflow-sandboxes](https://app.vellum.ai/workflow-sandboxes/)
2. Click **"Create Workflow"** to make a new Workflow Sandbox

![Create Workflow button in Workflow Sandboxes](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/13f65759-f3b9-4b00-a668-cffda2c2a53d-workflow-sandbox-create-workflow.png)

### Get the push command

From your Sandbox, click:

1. The **"Command Line"** button
2. The **"Push"** tab
3. **"Copy"** to get the CLI snippet

![Command Line push tab with copy button](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/13f65759-f3b9-4b00-a668-cffda2c2a53d-workflow-sandbox-push-command.png)

The snippet will look like:

```bash
vellum workflows push --workflow-sandbox-id=f059da6f-f7e4-4e18-aad2-23569baff905
```

### Push your Workflow

Add your module name to the command and run it:

```bash
vellum workflows push --workflow-sandbox-id=f059da6f-f7e4-4e18-aad2-23569baff905 prompt_chaining
```

You may need to remove the `display/` directory and `vellum.lock.json` file, or delete `from .display import *` from your `prompt_chaining/__init__.py` file before pushing.

### Success!

Once pushed successfully, you'll see a confirmation with a link to your Sandbox:

![Success message with link to Workflow Sandbox](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/13f65759-f3b9-4b00-a668-cffda2c2a53d-workflow-push-success.png)

If needed, you can click the **"Autolayout"** button in the Workflow editor to arrange the nodes nicely:

![Autolayout button in the Workflow editor](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/13f65759-f3b9-4b00-a668-cffda2c2a53d-workflow-autolayout-button.png)

## Next Steps

* [Core Concepts](/developers/workflows-sdk/core-concepts) - Learn about BaseWorkflow, BaseNode, and control flow
* [Defining Control Flow](/developers/workflows-sdk/defining-control-flow) - Master workflow graph patterns
* [Configuration](/developers/workflows-sdk/configuration) - Set up your development environment
* [Examples](/developers/workflows-sdk/tutorials/examples) - Explore real-world Workflow examples
* [Evaluations](/product/evaluation/quantitative-evaluation) - Test your Workflows rigorously