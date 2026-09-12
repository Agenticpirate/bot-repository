> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Map Node

> Iterate over arrays, executing subworkflows for each item with parallel processing.

`vellum.workflows.nodes.MapNode`

Used to map over a list of items and execute a Subworkflow for each item. This enables parallel processing of multiple items through the same workflow logic.

### Attributes

**`items`** `List[Any]` — required

The list of items to map over. Each item will be processed by the subworkflow.

---

**`subworkflow`** `Type[BaseWorkflow[WorkflowInputsType, InnerStateType]]` — required

The Subworkflow class to execute for each item

---

**`max_concurrency`** `Optional[int]` — default: None

The maximum number of concurrent subworkflow executions.

---

### Outputs

The outputs are determined by the subworkflow's outputs, with each output field becoming a list containing results from all iterations.

**`Basic Example`**

```python title="Basic Example" {24-30} maxLines=30
from vellum.workflows.inputs.base import BaseInputs
from vellum.workflows.state import BaseState
from vellum.workflows import BaseWorkflow
from vellum.workflows.nodes import MapNode, BaseNode
from typing import List

class MapNodeInputs(BaseInputs):
    my_list: List[str]

class Iteration(BaseNode):
    item = MapNode.SubworkflowInputs.item
    index = MapNode.SubworkflowInputs.index

    class Outputs(BaseNode.Outputs):
        result: str

    def run(self) -> Outputs:
        return self.Outputs(result=self.item + str(self.index))
    
class IterationSubworkflow(BaseWorkflow[MapNode.SubworkflowInputs, BaseState]):
    graph = Iteration

    class Outputs(BaseWorkflow.Outputs):
        result = Iteration.Outputs.result

class MyMapNode(MapNode):
    items = MapNodeInputs.my_list
    subworkflow = IterationSubworkflow

    class Outputs(BaseNode.Outputs):
        result: List[str] # this MUST match the Subworkflow's Outputs.result attribute
```

**`Example Outputs`**

```python title="Example Outputs"
MyMapNode.Outputs(
    result=[
        "text0",
        "text1",
        "text2"
    ]
)
```