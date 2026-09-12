> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Final Output Node

> Stream workflow responses to production endpoints with Expression inputs.

`vellum.workflows.nodes.FinalOutputNode`

Used to directly reference the output of another node. This provides backward compatibility with Vellum's Final Output Node functionality. *In most cases, you should reference the Workflow Output directly to the output of a particular node, without adding a Final Output Node.*

### Attributes

**`value`** `_OutputType` — required

The value to be output. The type is inferred by the type of the node connected to this attribute.

---

### Outputs

**`value`** `_OutputType`

The output value, with the same type as the input value

---

**`Basic Example`**

```python title="Basic Example"
from vellum.workflows.inputs.base import BaseInputs
from vellum.workflows.state import BaseState
from vellum.workflows import BaseWorkflow
from vellum.workflows.nodes import FinalOutputNode

class Inputs(BaseInputs):
    input: str


class BasicFinalOutputNode(FinalOutputNode):
    class Outputs(FinalOutputNode.Outputs):
        value = Inputs.input


class BasicFinalOutputNodeWorkflow(BaseWorkflow[Inputs, BaseState]):
    graph = BasicFinalOutputNode

    class Outputs(BaseWorkflow.Outputs):
        value = BasicFinalOutputNode.Outputs.value
```