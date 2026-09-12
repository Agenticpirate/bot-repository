> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Conditional Node

> Branch workflow execution based on conditions and upstream node results.

`vellum.workflows.nodes.ConditionalNode`

Used to conditionally determine which port to invoke next. This node exists to be backwards compatible with Vellum's Conditional Node, and for most cases, you should extend `BaseNode.Ports` directly.

Read more on ports [here](/developers/workflows-sdk/core-concepts#ports-and-conditionals).

**`Basic Example`**

```python title="Basic Example"
from vellum.workflows import BaseWorkflow
from vellum.workflows.nodes import BaseNode
from vellum.workflows.state import BaseState


class SourceNode(BaseNode):
    pass

class MiddleNode(BaseNode):
    class Ports(BaseNode.Ports):
        top = Port.on_if(SourceNode.Execution.count.less_than(1))
        bottom = Port.on_else()

class TargetNode(BaseNode):
    pass

class MyWorkflow(BaseWorkflow):
    graph = SourceNode >> {
        # here we use Ports to execute the SourceNode one more time
        # before proceeding to the TargetNode
        MiddleNode.Ports.top >> SourceNode,
        MiddleNode.Ports.bottom >> TargetNode,
    }

    class Outputs(BaseWorkflow.Outputs):
        result = TargetNode.Outputs

```