> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# UI-first Approach

> Pull Workflows from the Vellum UI to modify and run locally.

The instructions below will guide you through pulling a Workflow from the Vellum UI to modify and run locally.

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

### Get CLI command from Vellum UI

1. Open a Workflow on the [Workflows page in Vellum](https://app.vellum.ai/workflow-sandboxes/). In this example we'll use one of the prebuilt workflows: Prompt Chaining.

![](https://storage.googleapis.com/vellum-public/help-docs/wsdk_ui_example_prompt_chain.png)

2. Click the "Command Line" option and copy the CLI snippet in the subsequent modal.

   The command should look like this:

   `vellum workflows pull --workflow-sandbox-id=<some_id> --include-sandbox`

3. Paste that command into your terminal and voila! You've now pulled your Workflow into locally runnable SDK code.

### Closing out

If you run `ls` in your terminal, you should see two new items in your current directory:

* `vellum.lock.json`
* `prompt_chaining/` (or `[your_workflow_module]/`)

From here, you can do the following:

#### View the Workflow code

Open `[your_workflow_module]/workflow.py` to see the top-level graph definition for your Workflow. In the Prompt Chaining example, it should look like this:

```python
# ... node imports ...

class Workflow(BaseWorkflow[Inputs, BaseState]):
  graph = TopicResearch >> OutlineCreation >> ContentGeneration >> FinalOutput
  unused_graphs = {Note}

  class Outputs(BaseWorkflow.Outputs):
      final_output = FinalOutput.Outputs.value
```

#### Run the Workflow

Run the code locally with:

`python -m [your_workflow_module].sandbox`

#### Push changes back to the UI

To push changes back to the UI, head back to the Workflow Sandbox UI and grab the "push" CLI command from the Command Line UI.

The command should look like this:

`vellum workflows push [your_workflow_module]`

for example:

`vellum workflows push prompt_chaining`

## Next Steps

* [Core Concepts](/developers/workflows-sdk/core-concepts) - Learn about BaseWorkflow, BaseNode, and control flow
* [Defining Control Flow](/developers/workflows-sdk/defining-control-flow) - Master workflow graph patterns
* [Configuration](/developers/workflows-sdk/configuration) - Create a `pyproject.toml` and set up your development environment
* [Examples](/developers/workflows-sdk/tutorials/examples) - Explore real-world Workflow examples
* [Evaluations](/product/evaluation/quantitative-evaluation) - Test your Workflows rigorously
* [Custom Nodes](/developers/workflows-sdk/custom-container-images#including-custom-nodes-in-your-docker-image) - Add Custom Nodes to your project, share with teammates in UI or as code