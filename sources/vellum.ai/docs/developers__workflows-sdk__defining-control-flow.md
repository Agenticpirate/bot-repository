> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

Here are some examples of how to represent different graphs using the Vellum Workflows SDK.

## Single Node Workflow

A single Node Workflow is the simplest possible Workflow, consisting of just one Node.

![graph1.png](https://storage.googleapis.com/vellum-public/help-docs/wac/Graph-1.png)

```python
class MyWorkflow(BaseWorkflow):
    graph = StartNode
```

## Serial Execution Between Two Nodes

Two Nodes connected in sequence, where the output of the first Node flows into the second Node. This is a fundamental pattern in Workflow design where a downstream operation directly depends on the output of an upstream operation.

![graph2.png](https://storage.googleapis.com/vellum-public/help-docs/wac/Graph-2.png)

```python
class MyWorkflow(BaseWorkflow):
    graph = StartNode >> EndNode
```

## Single Node Branches to Two Parallel Nodes

Here a single Node branches into two parallel execution paths, allowing multiple operations to run independently after the initial Node completes. This pattern is useful when you need to perform parallel processing or handle multiple aspects of a Workflow simultaneously.

![graph3.png](https://storage.googleapis.com/vellum-public/help-docs/wac/Graph-3.png)

```python
class MyWorkflow(BaseWorkflow):
    graph = StartNode >> {
        TopNode,
        BottomNode,
    }
```

## Two Parallel Nodes Merge into One Node

Here two parallel execution paths merge back together into a single Node. This pattern is useful when you need to combine the results of multiple parallel operations before proceeding with the rest of the Workflow.

![graph4.png](https://storage.googleapis.com/vellum-public/help-docs/wac/Graph-4.png)

```python
class MyWorkflow(BaseWorkflow):
    graph = StartNode >> {
        TopNode,
        BottomNode,
    } >> EndNode
```

## Conditional Routing with Ports

Ports enable conditional routing in workflows by allowing nodes to direct execution flow based on specific conditions. This is particularly useful for implementing branching logic where different paths should be taken based on the results of upstream nodes.

```python
class MyWorkflow(BaseWorkflow):
    graph = {
        ConditionalNode.Ports.if_port >> SomeNode,
        ConditionalNode.Ports.else_port >> SomeOtherNode,
    } >> FinalOutputNode
```

In this example, the `ConditionalNode` evaluates a condition and routes execution to either `SomeNode` (if the condition is true) or `SomeOtherNode` (if the condition is false). Both paths then converge at the `FinalOutputNode`.

For more details on how to define conditions and work with ports, see the [Ports and Conditionals section in Core Concepts](/developers/workflows-sdk/core-concepts#ports-and-conditionals).

## Loops

Loops are a powerful pattern in Workflow design that allow you to repeat a series of operations until a certain condition is met. Many agentic AI systems tend to include loops.

![image.png](https://storage.googleapis.com/vellum-public/help-docs/wac/Graph-5.png)

```python
class LoopNode(BaseNode):
    class Ports(BaseNode.Ports):
        loop = Port.on_if(Input.score.less_than(0.5))
        exit = Port.on_else()

class MyWorkflow(BaseWorkflow):
    graph = StartNode >> {
        LoopNode.Ports.loop >> StartNode,
        LoopNode.Ports.exit >> ExitNode,
    }
```

## Map

The Map pattern is useful when you need to apply the same operation to a list of items.

![image.png](https://storage.googleapis.com/vellum-public/help-docs/wac/Graph-6.png)

```python
@MapNode.wrap(items=Input.items)
class PromptNode(BaseNode):
    ...

class MyWorkflow(BaseWorkflow):
    graph = PromptNode
```

## Merge Strategies for Parallel Execution

When you have parallel execution paths that converge into a single downstream node, different node types handle this convergence differently. Understanding these merge strategies is crucial for building robust workflows.

### Prompt Nodes: Use AWAIT\_ATTRIBUTES

For Prompt Nodes, it's recommended to use `AWAIT_ATTRIBUTES` merge strategy, which waits only for the specific input attributes that the node actually uses:

```python
from vellum import ChatMessagePromptBlock, JinjaPromptBlock, PromptParameters, PromptSettings
from vellum.workflows.nodes.displayable import InlinePromptNode
from vellum.workflows.types.core import MergeBehavior
    
from .constant_one import ConstantOne
from .constant_two import ConstantTwo
    

class MergePrompt(InlinePromptNode):
    ml_model = "gpt-5-responses"
    blocks = [
        ChatMessagePromptBlock(
            chat_role="SYSTEM",
            blocks=[
                JinjaPromptBlock(
                    template="""\
You will receive two messages. Please combine them into a single response.

First message: {{ message_one }}
Second message: {{ message_two }}

Please create a thoughtful response that incorporates both messages.\
"""
                )
            ],
        ),
    ]
    prompt_inputs = {
        "message_one": ConstantOne.Outputs.result,
        "message_two": ConstantTwo.Outputs.result,
    }
    parameters = PromptParameters(
        stop=[],
        temperature=None,
        max_tokens=500,
        top_p=0,
        top_k=None,
        frequency_penalty=0,
        presence_penalty=0,
        logit_bias=None,
        custom_parameters={
            "json_mode": False,
        },
    )
    settings = PromptSettings(stream_enabled=False)

    class Trigger(InlinePromptNode.Trigger):
        merge_behavior = MergeBehavior.AWAIT_ALL

class MyWorkflow(BaseWorkflow):
    graph = {
        ConstantOne,
        ConstantTwo,
    } >> MergePrompt
```

### Custom Nodes: Default AWAIT\_ATTRIBUTES Behavior

Custom Nodes (extending `BaseNode`) automatically use `AWAIT_ATTRIBUTES` by default, waiting only for their referenced inputs:

```python
class ProcessingNode(BaseNode):
    # Inputs from parallel upstream nodes
    data_a = NodeA.Outputs.result
    data_b = NodeB.Outputs.result
    
    class Outputs(BaseNode.Outputs):
        combined_result: str
    
    def run(self) -> Outputs:
        # This node automatically waits for both NodeA and NodeB to complete
        # before executing, since it references both outputs as inputs
        return self.Outputs(
            combined_result=f"Combined: {self.data_a} + {self.data_b}"
        )

class MyWorkflow(BaseWorkflow):
    graph = {
        NodeA,
        NodeB,
    } >> ProcessingNode
```

### Merge Nodes: Use AWAIT\_ALL

For dedicated merge operations, use `AWAIT_ALL` to ensure all upstream nodes complete before proceeding:

```python
from vellum.workflows.nodes.displayable import MergeNode
from vellum.workflows.types import MergeBehavior
    
    
class Merge(MergeNode):
    class Trigger(MergeNode.Trigger):
        merge_behavior = MergeBehavior.AWAIT_ALL

class MyWorkflow(BaseWorkflow):
    graph = {
        NodeA,
        NodeB,
    } >> Merge >> TemplatingNode
```

When you need to merge parallel paths before node types that don't support automatic input waiting (like Templating Nodes), you should use a MergeNode with `AWAIT_ALL` strategy first.