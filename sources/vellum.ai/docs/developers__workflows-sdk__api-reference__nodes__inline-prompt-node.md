> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Inline Prompt Node

> Execute prompts directly within workflows without requiring prompt deployments.

`vellum.workflows.nodes.InlinePromptNode`

Used to execute a prompt directly within a workflow, without requiring a prompt deployment.

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

**`functions`** `Optional[List[FunctionDefinition]]`

The functions to include in the prompt

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

**`expand_meta`** `Optional[PromptDeploymentExpandMetaRequest]`

Expandable execution fields to include in the response. See more [here](/developers/client-sdk/prompts/execute-prompt#request.body.expand_meta).

---

**`request_options`** `RequestOptions`

Additional options for request-specific configuration when calling APIs via the SDK. This is used primarily as an optional final parameter for service functions.

* timeout\_in\_seconds: The number of seconds to await an API call before timing out
* max\_retries: The max number of retries to attempt if the API call fails
* additional\_headers: A dictionary containing additional parameters to spread into the request's header dict
* additional\_query\_parameters: A dictionary containing additional parameters to spread into the request's query parameters dict
* additional\_body\_parameters: A dictionary containing additional parameters to spread into the request's body parameters dict

---

### Outputs

**`text`** `str`

The generated text output from the prompt execution

---

**`results`** `List[PromptOutput]`

The array of results from the prompt execution. PromptOutput is a union of the following types:

* StringVellumValue
* JsonVellumValue
* ErrorVellumValue
* FunctionCallVellumValue

---

#### Using Workflow Inputs and Upstream Node Outputs

```python
from vellum.workflows.nodes import InlinePromptNode
from vellum import (
    ChatMessagePromptBlock,
    JinjaPromptBlock,
    PlainTextPromptBlock,
    PromptParameters,
    RichTextPromptBlock,
    VariablePromptBlock,
)
from .some_other_node import SomeOtherNode

class Inputs(BaseInputs):
    foo: str

class MyPrompt(InlinePromptNode):
    ml_model = "gpt-5"
    blocks = [
        ChatMessagePromptBlock(
            chat_role="SYSTEM",
            blocks=[
                RichTextPromptBlock(
                    blocks=[
                        # Prefer RichTextPromptBlock for a nicer UI editing experience
                        PlainTextPromptBlock(text="Answer the user's question: "),
                        VariablePromptBlock(input_variable="question"),
                    ]
                ),
                JinjaPromptBlock(
                    template="Using a templating block to write Jinja templates inline: {{ query | upper | truncate(3) }}"
                ),
            ],
        ),
        # Use VariablePromptBlock at the top level to include chat history in context, for any chatbot / chat agent use-cases
        VariablePromptBlock(input_variable="chat_history"),
    ]
    prompt_inputs = {
        "foo": Inputs.foo,  # Reference workflow input
        "bar": SomeOtherNode.Outputs.bar,  # Reference upstream node output
        "chat_history": Inputs.chat_history,  # List[ChatMessage]
    }


class Workflow(BaseWorkflow[Inputs, BaseState]):
    graph = SomeOtherNode >> MyPrompt
```

### Examples

#### JSON Extraction and Ports

```python
from vellum import (
    ChatMessagePromptBlock,
    JinjaPromptBlock,
    PlainTextPromptBlock,
    PromptParameters,
    PromptSettings,
    RichTextPromptBlock,
    VariablePromptBlock,
)
from vellum.workflows.nodes.displayable import InlinePromptNode
from vellum.workflows.ports import Port
from vellum.workflows.references import LazyReference

# nodes/router_prompt.py
class RouterPrompt(InlinePromptNode):
    """
    This prompt is used to route to the appropriate handler based on the type of document being parsed.
    """
    ml_model = "gpt-5"
    blocks = [
        ChatMessagePromptBlock(
            chat_role="SYSTEM",
            blocks=[
                RichTextPromptBlock(
                    blocks=[
                        # Prefer RichTextPromptBlock for a nicer UI editing experience
                        PlainTextPromptBlock(text="Answer the user's question: "),
                        VariablePromptBlock(input_variable="question"),
                    ]
                ),
                JinjaPromptBlock(
                    template="Using a templating block to write Jinja templates inline: {{ query | upper | truncate(3) }}"
                ),
            ],
        ),
        # Use VariablePromptBlock at the top level to include chat history in context, for any chatbot / chat agent use-cases
        VariablePromptBlock(input_variable="chat_history"),
    ]
    prompt_inputs = {
        "document_text": Inputs.document_text,  # Reference workflow input
        "chat_history": Inputs.chat_history,  # List[ChatMessage]
    }
    custom_parameters={
        # prefer json_schema over json_mode if strict types are required
        # json_mode is a more flexible way to produce valid JSON through schemas defined in the prompt itself
        "json_mode": True,
        "json_schema": {
            "strict": True,
            "name": "schema",
            "schema": {
                "type": "object",
                "properties": {
                    "classification": {
                        "type": "string",
                        "description": "What type of document to classify as",
                        "enum": [
                            "policy",
                            "certificate_of_insurance",
                        ],
                    },
                },
                "required": [
                    "classification",
                ],
            },
        },
    },

    class Ports(InlinePromptNode.Ports):
        group_1_if_port = Port.on_if(LazyReference(lambda: RouterPrompt.Outputs.json)["classification"].equals("policy"))
        group_1_else_port = Port.on_else()

class FinalOutputNode(BaseOutputs):
    classification: str


# workflow.py
class Workflow(BaseWorkflow[Inputs, BaseState]):
    graph = GetDocument >> {
        RouterPrompt.Ports.group_1_if_port >> MyPolicyParserWorkflow,
        RouterPrompt.Ports.group_1_else_port >> MyCOIParserWorkflow,
    } >> FinalOutputNode

    class Outputs(BaseWorkflow.Outputs):
        final_output = FinalOutput.Outputs.value
```