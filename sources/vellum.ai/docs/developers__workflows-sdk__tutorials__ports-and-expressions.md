> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Branching with Ports and Expressions

> Learn how to use Ports and conditional logic in Vellum workflows with comprehensive examples of all available operators and LazyReference usage.

This guide demonstrates the syntax for using Ports and Expressions to control the flow of execution in Vellum Workflows.

## Basic Port Types

Below is a basic example:

```python
# nodes/my_prompt_node.py
class MyNode(BaseNode):

    # ... prompt node attributes go here ...
    
    class Ports(BaseNode.Ports):
        first_condition = Port.on_if(condition_expression)
        second_condition = Port.on_elif(another_condition)
        fallback = Port.on_else()

# workflow.py
class MyWorkflow(BaseWorkflow):
    graph = {
        # Can route to nodes or other Workflows
        MyPromptNode.Ports.first_condition >> MyOtherNode,
        MyPromptNode.Ports.second_condition >> AnotherNode1,
        MyPromptNode.Ports.fallback >> AnotherNode2,
    }

    class Outputs(BaseWorkflow.Outputs):
        final_output = MyOtherNode.Outputs.output
```

Prefer using Ports directly on Nodes rather than using legacy Conditional Nodes.

## LazyReference for Self-Referencing

A common use case for Ports is to branch based on the result a node's own outputs. For example, if a Prompt Node classifies text as "positive" or "negative", you can use a Port to immediately branch based on the result.

In this case, the node needs to reference its own outputs in port conditions, use `LazyReference` to do so:

```python
from vellum.workflows.nodes.displayable import InlinePromptNode
from vellum.workflows.ports import Port
from vellum.workflows.references import LazyReference

class SentimentAnalysisNode(InlinePromptNode):

    # ... inline prompt node attributes go here ...
    
    class Ports(InlinePromptNode.Ports):
        # Self-referencing port condition
        positive = Port.on_if(
            LazyReference(lambda: SentimentAnalysisNode.Outputs.json["sentiment"].equals("positive"))
        )
        negative = Port.on_elif(
            LazyReference(lambda: SentimentAnalysisNode.Outputs.json["sentiment"].equals("negative"))
        )
        else_port = Port.on_else()

# workflow.py
class MyWorkflow(BaseWorkflow):
    graph = {
        SentimentAnalysisNode.Ports.positive >> MyOtherNode,
        SentimentAnalysisNode.Ports.negative >> AnotherNode1,
        SentimentAnalysisNode.Ports.else_port >> MyOtherNode,
    }

    class Outputs(BaseWorkflow.Outputs):
        final_output = MyOtherNode.Outputs.output
```

## Expressions

Ports use Expressions to evaluate which Port to route to. Below is a list of all available expression operators.

### Equality and Inequality

```python
# Basic equality
Port.on_if(Inputs.category.equals("question"))
Port.on_if(SomeNode.Outputs.status.does_not_equal("error"))

# String comparisons
Port.on_if(Inputs.text.contains("keyword"))
Port.on_if(Inputs.text.does_not_contain("spam"))
Port.on_if(Inputs.filename.begins_with("temp_"))
Port.on_if(Inputs.filename.does_not_begin_with("system"))
Port.on_if(Inputs.url.ends_with(".pdf"))
Port.on_if(Inputs.url.does_not_end_with(".tmp"))
```

### Numeric Comparisons

```python
# Numeric operators
Port.on_if(Inputs.score.greater_than(0.8))
Port.on_if(Inputs.count.less_than(100))
Port.on_if(Inputs.rating.greater_than_or_equal_to(4.0))
Port.on_if(Inputs.attempts.less_than_or_equal_to(3))

# Range checks
Port.on_if(Inputs.temperature.between(20, 30))
Port.on_if(Inputs.age.not_between(13, 17))
```

### Collection Operations

```python
# Membership testing
Port.on_if(Inputs.status.in_(["active", "pending"]))
Port.on_if(Inputs.category.not_in(["spam", "deleted"]))
```

## Null and Undefined Checks

```python
# Null checks
Port.on_if(Inputs.optional_field.is_null())
Port.on_if(Inputs.required_field.is_not_null())

# Nil checks (empty/blank values)
Port.on_if(Inputs.description.is_nil())
Port.on_if(Inputs.title.is_not_nil())

# Undefined checks
Port.on_if(Inputs.config_value.is_undefined())
Port.on_if(Inputs.user_input.is_not_undefined())

# Blank checks (empty strings, whitespace)
Port.on_if(Inputs.comment.is_blank())
Port.on_if(Inputs.name.is_not_blank())
```

## Data Processing

```python
# JSON parsing
Port.on_if(Inputs.json_string.parse_json())

# Coalescing (fallback values)
Port.on_if(Inputs.primary_value.coalesce(Inputs.fallback_value))
```

## Working with JSON

Access JSON fields using bracket notation:

```python
# Access JSON object fields
Port.on_if(PromptNode.Outputs.json["status"].equals("success"))
Port.on_if(APINode.Outputs.response["data"]["count"].greater_than(10))

# Combine with LazyReference for self-referencing
Port.on_if(LazyReference(lambda: DataProcessorNode.Outputs.result)["confidence"].greater_than(0.8))

# Check nested JSON values
Port.on_if(Inputs.config["settings"]["enabled"].equals(True))
Port.on_if(CodeNode.Outputs.analysis["metrics"]["accuracy"].between(0.8, 1.0))
```

## Logical Operators

### AND Operations

Use the `&` operator to combine conditions with AND logic:

```python
Port.on_if(
    Inputs.category.equals("urgent") 
    & Inputs.priority.greater_than(5)
)

# Complex AND with parentheses
Port.on_if(
    Inputs.status.equals("active")
    & (Inputs.verified.equals(True) & Inputs.premium.equals(True))
)
```

### OR Operations

Use the `|` operator to combine conditions with OR logic:

```python
Port.on_if(
    Inputs.category.equals("error") 
    | Inputs.category.equals("warning")
)

# Mixed AND/OR with proper precedence
Port.on_if(
    Inputs.type.equals("admin")
    & (Inputs.role.equals("owner") | Inputs.role.equals("manager"))
)
```

### Complex Logical Expressions

```python
# Parentheses control precedence
Port.on_if(
    (
        Inputs.user_type.equals("premium")
        & Inputs.subscription.equals("active")
    )
    | Inputs.admin_override.equals(True)
)
```