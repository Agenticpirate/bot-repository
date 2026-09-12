> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Code Execution Node

> Run custom Python or Typescript code.

The Code Execution Node empowers you to include custom logic defined directly in the workflow. You can even import custom public packages within the node's logic.

**Important**: Code Execution Nodes expect a `main()` function with parameters that match the names of the node's inputs. If you don't define a `main()` function, you'll encounter a `NameError: name 'main' is not defined` error.

## Code Structure Requirements

Your code must include a `main()` function that serves as the entry point. The function parameters must match the input variable names defined in your node.

### Basic Example

```python
def main(input_text, user_data):
    # Your custom logic here
    processed_text = input_text.upper()
    result = {
        "processed": processed_text,
        "user_id": user_data.get("id", "unknown")
    }
    return result
```

If your node has inputs named `input_text` and `user_data`, your `main()` function must have parameters with exactly those names.

### Common Error

If you write code without a `main()` function:

```python
# ❌ This will cause an error
text = "Hello World"
result = text.upper()
```

You'll see this error:

```
NameError: name 'main' is not defined. Did you mean: 'min'?
```

### Correct Structure

```python
# ✅ This is the correct structure
def main(input_text):
    result = input_text.upper()
    return result
```

## Code Execution Node Interface

The Code Execution Node provides a simple interface for configuring your custom code:

![Code Execution Node](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/c96366ea-6ab5-4593-b08e-01a9f64c1fd5-code_execution_node_1.png)

When you open the Code Execution Node, you'll see a detailed code editor interface:

![Code Execution Node Editor](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/c96366ea-6ab5-4593-b08e-01a9f64c1fd5-code_execution_node_2.png)

## Supported Languages

We support the following languages:

* Python
* TypeScript

## Input Parameter Matching

The `main()` function parameters must exactly match your node's input names:

* If your node has an input called `user_message`, your function parameter must be `user_message`
* If your node has an input called `chat_history`, your function parameter must be `chat_history`
* Parameter names are case-sensitive and must match exactly

## Advanced Examples

### Working with Chat History

```python
def main(chat_history, user_query):
    # Process chat history
    message_count = len(chat_history)
    last_message = chat_history[-1] if chat_history else None
    
    response = {
        "query": user_query,
        "context": f"Found {message_count} previous messages",
        "last_message": last_message
    }
    return response
```

### Using External Packages

```python
import json
import datetime

def main(data_input, timestamp):
    # Process JSON data with timestamp
    parsed_data = json.loads(data_input) if isinstance(data_input, str) else data_input
    
    result = {
        "processed_at": datetime.datetime.now().isoformat(),
        "input_timestamp": timestamp,
        "data": parsed_data
    }
    return result
```

## Troubleshooting

### "NameError: name 'main' is not defined"

This error occurs when your code doesn't include a `main()` function. Always ensure your code has a `main()` function as the entry point.

### Parameter Name Mismatches

If your function parameters don't match your node's input names exactly, you may encounter unexpected behavior or errors. Double-check that parameter names match your node inputs precisely.