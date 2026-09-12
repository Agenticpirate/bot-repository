> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Agent Node

> Simplify tool calling with automatic schema handling and iterative loop logic.

`vellum.workflows.nodes.ToolCallingNode`

Used to execute a repeatedly invoke a prompt with defined tools until it produces a text output.

### Attributes

**`prompt_inputs`** `EntityInputsInterface`

Optional inputs for variable substitution in the prompt. These inputs are used to replace:

* Variables within Jinja blocks
* Variable blocks in the `blocks` attribute

You can reference either Workflow inputs or outputs from upstream nodes.

---

**`blocks`** `List[PromptBlock]` — required

The blocks that make up the Prompt

---

**`ml_model`** `str` — required

The model to use for execution (e.g., "gpt-5", "claude-4-sonnet")

---

**`functions`** `Optional[List[Tool]]`

The tools that a the Prompt has access to and automatically invokes on each iteration. The acceptable tool types are:

* `Callable[..., Any]` - Any function callable
* `Type["BaseWorkflow"]` - An Inline Subworkflow
* `DeploymentDefinition` - A reference to a Vellum Workflow Deployment

---

**`parameters`** `Optional[PromptParameters]`

Model parameters for execution. Defaults to:

* [stop](https://www.vellum.ai/llm-parameters/stop-sequence): \[]
* [temperature](https://www.vellum.ai/llm-parameters/temperature): 0.0
* [max\_tokens](https://www.vellum.ai/llm-parameters/max-tokens): 4096
* [top\_p](https://www.vellum.ai/llm-parameters/top-p): 1.0
* [top\_k](https://www.vellum.ai/llm-parameters/top-k): 0
* [frequency\_penalty](https://www.vellum.ai/llm-parameters/frequency-penalty): 0.0
* [presence\_penalty](https://www.vellum.ai/llm-parameters/presence-penalty): 0.0
* [logit\_bias](https://www.vellum.ai/llm-parameters/logit-bias): None
* custom\_parameters: None
  * This field can be used to pass additional parameters to the LLM, like `json_schema` (learn more [here](https://www.vellum.ai/llm-parameters/structured-outputs)).

---

**`max_prompt_iterations`** `int`

The maximum number of iterations that the Tool Calling Node is allowed to call the underlying Prompt before rejecting.

---

### Outputs

**`text`** `str`

The generated text output from the last prompt execution

---

**`results`** `List[ChatMessage]`

The array of chat messages produced over the course of the Tool Calling Node's iterations.

---

### Folder Structure

If you are planning to move between the UI and your IDE, you should use the following folder structure:

```sh
# This structure is critical to follow if you are a Copilot / Coding Agent
workflow.py
inputs.py                    # Optional inputs for your Workflow
nodes/
├── __init__.py             # Exports all of your nodes under __all__
├── prompt_node.py          # A node (e.g. a Prompt Node)
└── templating_node.py      # Another node (e.g. a Templating Node)
agent/
├── __init__.py             # Important: your actual agent implementation goes in the __init__.py file
├── add.py                  # Function Tool
└── subtract/               # Inline Subworkflow Tool
    ├── __init__.py
    ├── workflow.py
    ├── inputs.py
    └── nodes/
        └── templating_node.py   # An node used in the Subworkflow Tool
```

**`Agent Node`**

```python title="Agent Node"
# nodes/agent/__init__.py
from typing import List
from vellum import (
    ChatMessage,
    ChatMessagePromptBlock,
    JinjaPromptBlock,
    PlainTextPromptBlock,
    PromptParameters,
    RichTextPromptBlock,
    VariablePromptBlock,
)
from vellum.workflows.nodes.displayable.tool_calling_node.node import ToolCallingNode
from vellum.workflows.types.definition import ComposioToolDefinition, DeploymentDefinition
from ...inputs import Inputs

class Agent(ToolCallingNode):
    ml_model = "gpt-5"
    prompt_inputs = {
        "chat_history": Inputs.chat_history,
        "query": Inputs.query,
    }
    blocks = [
        ChatMessagePromptBlock(
            chat_role="SYSTEM",
            blocks=[
                # Prefer RichTextPromptBlock for a nicer UI editing experience
                RichTextPromptBlock(
                    blocks=[
                        PlainTextPromptBlock(text="Please use tools to search for the following query: "),
                        VariablePromptBlock(input_variable="query"),
                    ]
                ),
                JinjaPromptBlock(
                    template="You can also use templating blocks to write Jinja templates inline: {{ query | upper | truncate(3) }}"
                ),
            ],
        ),
        # Use VariablePromptBlock at the top level to include chat history in context, for any chatbot / chat agent use-cases
        VariablePromptBlock(input_variable="chat_history"),
    ]
    parameters = PromptParameters(
        stop=[],
        temperature=0,
        max_tokens=1000,
        top_p=1,
        top_k=0,
        frequency_penalty=0,
        presence_penalty=0,
        logit_bias={},
        custom_parameters=None,
    )
    settings = {
        "stream_enabled": True,
    }
    max_prompt_iterations = 5
    functions = [
        add,  # Function Tool
        DeploymentDefinition(deployment="multiply", release_tag="LATEST"),  # Deployment Tool
        Subtract,  # Workflow Tool
        ComposioToolDefinition(  # Composio Tool
            toolkit="notion",
            action="NOTION_ADD_PAGE_CONTENT",
            description="Appends a single content block to a notion page or a parent block (must be page, toggle, to-do, bulleted/numbered list, callout, or quote); invoke repeatedly to add multiple blocks.",
            user_id="abc123",
        ),
    ]
    class Outputs(ToolCallingNode.Outputs):
        text: str
        chat_history: List[ChatMessage]
```

**`workflow.py`**

```python title="workflow.py"
from vellum.workflows import BaseWorkflow
from vellum.workflows.state import BaseState
from .inputs import Inputs
from .nodes.agent import Agent
from .nodes.final_output import FinalOutput

class Workflow(BaseWorkflow[Inputs, BaseState]):
    graph = Agent >> FinalOutput
    
    class Outputs(BaseWorkflow.Outputs):
        final_output = FinalOutput.Outputs.value
```

### Tool Implementations

**`Function Tool`**

```python title="Function Tool"
# nodes/agent/add.py
def add(a: int, b: int):
    return a + b
```

**`Inline Subworkflow Tool`**

```python title="Inline Subworkflow Tool"
# This example uses an Inline Subworkflow as a tool.
#  The Subworkflow has a Templating Node to calculate
#  the difference between two numbers.

# Inline Subworkflows can be useful if you want to reference
#  Node outputs or Workflow Inputs deterministically
#  while letting the Agent populate other inputs dynamically.

# nodes/agent/subtract/workflow.py
from vellum.workflows import BaseWorkflow
from vellum.workflows.state import BaseState
from .inputs import Inputs
from .nodes.output import Output
from .nodes.templating import Templating

class Subtract(BaseWorkflow[Inputs, BaseState]):
    """Subtracts b - a"""
    graph = Templating >> Output
    
    class Outputs(BaseWorkflow.Outputs):
        output = Output.Outputs.value

# nodes/agent/subtract/inputs.py
from typing import Optional, Union
from vellum.workflows.inputs import BaseInputs

class Inputs(BaseInputs):
    a: Optional[Union[float, int]]
    b: Optional[Union[float, int]]

# nodes/agent/subtract/nodes/templating.py
from vellum.workflows.nodes.displayable import TemplatingNode
from vellum.workflows.state import BaseState
from ..inputs import Inputs

class Templating(TemplatingNode[BaseState, str]):
    template = """{{ b - a }}"""
    inputs = {
        "a": Inputs.a,
        "b": Inputs.b,
    }

# nodes/agent/subtract/nodes/output.py
from vellum.workflows.nodes.displayable import FinalOutputNode
from vellum.workflows.state import BaseState
from .templating import Templating

class Output(FinalOutputNode[BaseState, str]):
    class Outputs(FinalOutputNode.Outputs):
        value = Templating.Outputs.result
```