> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Templating Node

> Apply Jinja2 templating for lightweight data transformations.

`vellum.workflows.nodes.TemplatingNode`

Used to render text templates using Jinja2 syntax

### Attributes

**`template`** `str` — required

The Jinja2 template to render

---

**`inputs`** `EntityInputsInterface` — required

The values to substitute into the template for the specified variables.

---

### Outputs

**`result`** `_OutputType`

The rendered template in the appropriate type as specified by the type specified in the Templating Node subclass definition.

---

**`Basic String Example`**

```python title="Basic String Example"
from vellum.workflows.nodes import TemplatingNode

# Notice `str` is used to specify the output type of the Templating Node
# ... in fact, `str` is also the default output type for the Templating Node, so this could be omitted
class MyTemplatingNode(TemplatingNode[BaseState, str]):
    template = "The weather in {{ city }} is {{ weather }}."

    inputs = {
        "city": Inputs.city,
        "weather": Inputs.weather,
    }
```

**`JSON Example`**

```python title="JSON Example"
from vellum.workflows.nodes import TemplatingNode

# Notice `dict` is used to specify the output type of the Templating Node
class MyJSONTemplatingNode(TemplatingNode[BaseState, dict]):
    template = """
    {
        "user": {
            "name": "{{ user.name }}",
            "age": {{ user.age }},
            "roles": {{ roles | tojson }}
        },
        "metadata": {
            "timestamp": "{{ timestamp }}",
            "version": "{{ version }}"
        }
    }
    """
    inputs = {
        "user": {
            "name": "Jane Doe",
            "age": 30
        },
        "roles": ["admin", "editor"],
        "timestamp": "2024-01-01T00:00:00Z",
        "version": "1.0"
    }
```

**`String Template Output`**

```python title="String Template Output"
MyTemplatingNode.Outputs(
    result="""
    Dear Jane Doe,
    
    Thank you for your 5 years of service at Acme Corp.
    Your dedication to Engineering has been invaluable.
    
    Best regards,
    HR Team
    """
)
```

**`JSON Template Output`**

```python title="JSON Template Output"
MyJSONTemplatingNode.Outputs(
    result={
        "user": {
            "name": "Jane Doe",
            "age": 30,
            "roles": ["admin", "editor"]
        },
        "metadata": {
            "timestamp": "2024-01-01T00:00:00Z",
            "version": "1.0"
        }
    }
)
```