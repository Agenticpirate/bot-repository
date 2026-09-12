> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Error Node

> Terminate workflow execution and raise custom error messages.

`vellum.workflows.nodes.ErrorNode`

Used to raise an error to reject the surrounding Workflow and return custom error messages.

### Attributes

**`error`** `Union[str, VellumError]` — required

The error to raise. Can be either:

* A string message
* A VellumError object with a `message` and error `code`

---

### Outputs

This node doesn't produce outputs. However, Workflows that invoke this node will error and the error message will appear in the Vellum UI.

**`Basic Example`**

```python title="Basic Example"
from vellum.workflows import BaseWorkflow
from vellum.workflows.nodes import ErrorNode
from vellum.workflows.inputs.base import BaseInputs
from vellum.workflows.state import BaseState

class Inputs(BaseInputs):
    threshold: int

class StartNode(BaseNode):
    class Ports(BaseNode.Ports):
        success = Port.on_if(Inputs.threshold.greater_than(10))
        fail = Port.on_else()

class SuccessNode(BaseNode):
    class Outputs(BaseNode.Outputs):
        result = Inputs.threshold

class FailNode(ErrorNode):
    error = "Input threshold was too low"

class BasicErrorNodeWorkflow(BaseWorkflow[Inputs, BaseState]):
    graph = {
        StartNode.Ports.success >> SuccessNode,
        StartNode.Ports.fail >> FailNode,
    }
    class Outputs(BaseWorkflow.Outputs):
        final_value = SuccessNode.Outputs.result
```

**`Using VellumError`**

```python title="Using VellumError"
from vellum import VellumError
from vellum.workflows.errors.types import VellumErrorCode
from vellum.workflows.nodes import ErrorNode

class CustomErrorNode(ErrorNode):
    error = VellumError(
        message="Rate limit exceeded for API calls",
        code=VellumErrorCode.USER_DEFINED_ERROR
    )
```