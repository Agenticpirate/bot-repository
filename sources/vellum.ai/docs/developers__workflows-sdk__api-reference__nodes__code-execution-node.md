> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Code Execution Node

> Run custom Python or TypeScript code within your workflows.

`vellum.workflows.nodes.CodeExecutionNode`

Used to execute arbitrary Python code within your workflow. Supports custom package dependencies and any Python or TypeScript runtimes.

**Important**: Your code file must contain a `main()` function with parameters that match the names of the node's inputs. Without this function, you'll get a `NameError: name 'main' is not defined` error.

### Attributes

**`filepath`** `str` — required

Path to the Python script file to execute

---

**`code_inputs`** `EntityInputsInterface` — required

The inputs for the custom script. Supports:

* Strings
* Numbers (float)
* Arrays
* Chat History (List\[ChatMessage])
* Search Results (List\[SearchResult])
* JSON objects (Dict\[str, Any])
* Function Calls
* Errors
* Secrets

---

**`runtime`** `CodeExecutionRuntime` — default: PYTHON\_3\_12

The runtime to use for the custom script

---

**`packages`** `Optional[Sequence[CodeExecutionPackage]]`

The packages to use for the custom script

---

**`request_options`** `Optional[RequestOptions]`

The request options to use for the custom script

---

### Outputs

**`result`** `_OutputType`

The result returned by the executed code, type depends on the node's generic type parameter

---

**`log`** `str`

The execution logs from the code run

---

**`Example Usage`**

```python title="Example Usage"
from vellum.workflows.nodes import CodeExecutionNode
from vellum import ChatMessage, CodeExecutionPackage
from vellum.workflows.state import BaseState
from typing import List, Dict

class MyCodeExecutionNode(CodeExecutionNode[BaseState, Dict[str, Any]]):
    filepath = "./scripts/process_data.py"
    code_inputs = {
        "text": "Process this text",
        "chat_history": [
            ChatMessage(role="user", content="Hello"),
            ChatMessage(role="assistant", content="Hi there!")
        ],
        "config": {
            "max_length": 100,
            "temperature": 0.7
        }
    }
    runtime = "PYTHON_3_11_6"
    packages = [
        CodeExecutionPackage(name="pandas", version="2.0.0"),
        CodeExecutionPackage(name="numpy", version="1.24.0")
    ]
```

**`Example Script (process_data.py)`**

```python title="Example Script (process_data.py)"
import pandas as pd
import numpy as np

def process(text: str, chat_history: List[dict], config: dict, api_key: str):
    # Your processing logic here
    result = {
        "processed_text": text.upper(),
        "history_length": len(chat_history),
        "config_used": config
    }
    return result
    
# The script must have a 'main' function that takes the inputs
# Parameter names must match the node's input names exactly
def main(text, chat_history, config, api_key):
    return process(text, chat_history, config, api_key)
```

**`Example Outputs`**

```python title="Example Outputs"
MyCodeExecutionNode.Outputs(
    result={
        "processed_text": "PROCESS THIS TEXT",
        "history_length": 2,
        "config_used": {
            "max_length": 100,
            "temperature": 0.7
        }
    },
    log="INFO: Starting processing...\nINFO: Processing complete"
)
```

**`Error Example`**

```python title="Error Example"
try:
    node.run()
except NodeException as e:
    if e.code == VellumErrorCode.INVALID_INPUTS:
        print("Invalid input provided")
    elif e.code == VellumErrorCode.INVALID_OUTPUTS:
        print("Output type mismatch")
    else:
        raise
```