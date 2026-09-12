> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Prompt Deployment Node

> Execute deployed prompts from your Prompt Deployment system.

`vellum.workflows.nodes.PromptDeploymentNode`

Used to execute a Prompt Deployment and surface a string output for convenience.

### Attributes

**`deployment`** `Union[UUID, str]` — required

Either the Prompt Deployment's UUID or its name

---

**`prompt_inputs`** `EntityInputsInterface` — required

The inputs for the Prompt

---

**`release_tag`** `str` — default: LATEST

The release tag to use for the Prompt Execution

---

**`external_id`** `Optional[str]`

Optionally include a unique identifier for tracking purposes. Must be unique within a given Prompt Deployment.

---

**`expand_meta`** `Optional[PromptDeploymentExpandMetaRequest]`

Expandable execution fields to include in the response. See more [here](/developers/client-sdk/prompts/execute-prompt#request.body.expand_meta).

---

**`raw_overrides`** `Optional[RawPromptExecutionOverridesRequest]`

The raw overrides to use for the Prompt Execution

---

**`expand_raw`** `Optional[Sequence[str]]`

Expandable raw fields to include in the response

---

**`metadata`** `Optional[Dict[str, Optional[Any]]]`

The metadata to use for the Prompt Execution

---

**`request_options`** `Optional[RequestOptions]`

The request options to use for the Prompt Execution

---

### Outputs

**`text`** `str`

The generated text output from the prompt execution

---

**`results`** `List[PromptOutput]`

The array of results from the prompt execution. PromptOutput is a union of the following types:

* StringVellumValue
* FunctionCallVellumValue

---

**`Example Usage`**

```python title="Example Usage"
from vellum.workflows.nodes import PromptDeploymentNode
from vellum.client import PromptDeploymentExpandMetaRequest, RawPromptExecutionOverridesRequest

class MyPromptDeploymentNode(PromptDeploymentNode):
    deployment = "my_prompt_deployment"
    prompt_inputs = {
        "question": "What is the meaning of life?",
        "chat_history": [
            ChatMessage(role="USER", text="Hello!"),
            ChatMessage(role="ASSISTANT", text="Hi there!"),
        ],
        "context": {
            "source": "philosophy_book",
            "chapter": 42
        }
    }
    release_tag = "production"
    external_id = "unique-execution-id"
    expand_meta = PromptDeploymentExpandMetaRequest(
        model_name=True,
        usage=True,
        cost=True,
        finish_reason=True,
        latency=True,
        deployment_release_tag=True,
        prompt_version_id=True
    )
    metadata = {
        "user_id": "123",
        "session_id": "abc"
    }
```

**`Example String Outputs`**

```python title="Example String Outputs"
MyPromptDeploymentNode.Outputs(
    text="happily",
    results=[
        StringVellumValue(value="h"),
        StringVellumValue(value="app"),
        StringVellumValue(value="ily"),
    ]
)
```

**`Example Function Call Outputs`**

```python title="Example Function Call Outputs"
MyPromptDeploymentNode.Outputs(
    results=[
        FunctionCallVellumValue(value=FunctionCall(name="get_weather", arguments={"city": "San Francisco"})),
    ]
)
```