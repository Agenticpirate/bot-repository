> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Mocks

> Override node outputs during local workflow execution for testing specific scenarios.

`vellum.workflows.nodes.mocks.MockNodeExecution`

Mocks allow you to override node outputs during local execution, which is useful for testing specific scenarios without calling external services or APIs.

## MockNodeExecution

The `MockNodeExecution` class provides fine-grained control over when and what outputs to mock.

### Attributes

**`when_condition`** `BaseDescriptor` — required

A condition that determines when this mock should be applied. Supports expressions using workflow inputs and node execution counters.

Note: Currently, the only `when_condition` supported by the Vellum UI is the same node's execution count greater than or equal to 0.

---

**`then_outputs`** `BaseOutputs` — required

The outputs to return when the condition is met. Must be an instance of the node's `Outputs` class.

---

**`disabled`** `Optional[bool]`

Set to `True` to disable this mock without removing it from the dataset.

---

## Simple Mocks

For simple cases, you can pass a node's `Outputs` instance directly to the `mocks` list:

```python
from vellum.workflows import DatasetRow

from .inputs import Inputs
from .nodes.my_prompt_node import MyPromptNode

dataset = [
    DatasetRow(
        label="With simple mock",
        inputs=Inputs(query="test"),
        mocks=[
            MyPromptNode.Outputs(text="Mocked response"),
        ],
    ),
]
```

## Conditional Mocks

For more complex scenarios, use `MockNodeExecution` with conditions:

```python
from vellum.workflows import DatasetRow, MockNodeExecution

from .inputs import Inputs
from .nodes.process_node import ProcessNode

dataset = [
    DatasetRow(
        label="With conditional mocks",
        inputs=Inputs(threshold=5),
        mocks=[
            MockNodeExecution(
                when_condition=(
                    Inputs.threshold.equals(5) & 
                    ProcessNode.Execution.count.equals(0)
                ),
                then_outputs=ProcessNode.Outputs(result="first_execution"),
            ),
            MockNodeExecution(
                when_condition=(
                    Inputs.threshold.equals(5) & 
                    ProcessNode.Execution.count.equals(1)
                ),
                then_outputs=ProcessNode.Outputs(result="second_execution"),
            ),
        ],
    ),
]
```

## Condition Operators

The `when_condition` supports various comparison operators:

| Operator                           | Description              |
| ---------------------------------- | ------------------------ |
| `.equals(value)`                   | Equal to                 |
| `.does_not_equal(value)`           | Not equal to             |
| `.greater_than(value)`             | Greater than             |
| `.greater_than_or_equal_to(value)` | Greater than or equal to |
| `.less_than(value)`                | Less than                |
| `.less_than_or_equal_to(value)`    | Less than or equal to    |
| `&`                                | Logical AND              |
| `\|`                               | Logical OR               |