> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Merge Node

> Consolidate divergent execution paths using configurable merge strategies.

`vellum.workflows.nodes.MergeNode`

Used to merge the control flow of multiple nodes into a single node. This node exists primarily for backwards compatibility with Vellum's Merge Node functionality.

For most cases, you should extend from `BaseNode.Trigger` directly instead of using MergeNode. Read more on [Triggers](/developers/workflows-sdk/core-concepts#triggers)

### Attributes

This node doesn't have any specific attributes as it's a simple control flow node.

### Outputs

This node passes through any outputs from its parent nodes without modification.

**`Basic Example`**

```python title="Basic Example"
from vellum.workflows.nodes import BaseNode

class QuickNode(BaseNode):
    class Outputs(BaseNode.Outputs):
        prefix = "Hello"

class SlowNode(BaseNode):
    class Outputs(BaseNode.Outputs):
        suffix: str
    def run(self) -> Outputs:
        time.sleep(5)
        return self.Outputs(suffix="World")

class MergeNode(BaseNode):
    prefix = QuickNode.Outputs.prefix
    suffix = SlowNode.Outputs.suffix
    class Outputs(BaseNode.Outputs):
        message: str
    class Trigger(BaseNode.Trigger):
        merge_strategy = MergeStrategy.AWAIT_ALL
    def run(self) -> Outputs:
        return self.Outputs(message=f"{self.prefix} {self.suffix}")
```