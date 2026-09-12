> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Guardrail Node

> Run inline evaluations using pre-defined Metrics for quality checks.

`vellum.workflows.nodes.GuardrailNode`

Used to execute a Metric Definition and surface a float output representing the score. This node is commonly used to implement quality checks and guardrails in your workflows.

Metrics are defined in the Vellum UI and can be reused across workflows.

### Attributes

**`metric_definition`** `Union[UUID, str]` — required

Either the Metric Definition's UUID or its name

---

**`metric_inputs`** `EntityInputsInterface` — required

The inputs for the Metric

---

**`release_tag`** `str` — default: LATEST

The release tag to use for the Metric

---

**`request_options`** `Optional[RequestOptions]`

The request options to use for the Metric execution

---

### Outputs

**`score`** `float`

The score output from the metric execution (between 0 and 1)

---

Additional outputs may be available depending on the metric definition.

**`Example Usage`**

```python title="Example Usage"
from vellum import ChatMessage
from vellum.workflows.nodes import GuardrailNode

class QualityCheckNode(GuardrailNode):
    release_tag = "production"
    metric_definition = "response_quality_metric"  # or UUID("...")
    # `metric_inputs` align with the custom Metric we've created in the Vellum UI
    metric_inputs = {
        "response": "This is the AI response to evaluate",
        "chat_history": [
            ChatMessage(role="USER", text="What's the weather?"),
            ChatMessage(role="ASSISTANT", text="It's sunny today!")
        ],
        "evaluation_criteria": {
            "coherence": True,
            "relevance": True,
            "safety": True
        }
    }
```

**`Basic Output Example`**

```python title="Basic Output Example"
QualityCheckNode.Outputs(
    # `score` is a mandatory field for all Metrics and thus will be available on all Guardrail Nodes
    score=0.92, 
    # `details` is a result of our custom Metric definition
    details={ 
        "coherence_score": 0.95,
        "relevance_score": 0.88,
        "safety_score": 0.93
    }
)
```