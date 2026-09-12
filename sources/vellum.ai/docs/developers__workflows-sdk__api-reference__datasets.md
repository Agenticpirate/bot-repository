> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Datasets Overview

> Define test scenarios and sample data for local workflow development using DatasetRow, inputs, triggers, and mocks.

`vellum.workflows.inputs.DatasetRow`

Datasets allow you to define test scenarios and sample data for local workflow development. They are stored in the `sandbox.py` file within your workflow directory and are included when you push or pull your workflow artifact using the Vellum CLI.

## DatasetRow

The `DatasetRow` class represents a single test scenario with a label, inputs, optional trigger, and optional mocks.

### Attributes

**`label`** `str` — required

A descriptive label for the test scenario. This helps identify the scenario in the Vellum UI and logs.

---

**`inputs`** `Union[BaseInputs, Dict[str, Any]]` — required

The input data for the workflow. Can be either a `BaseInputs` instance or a dictionary of input values.

---

**`workflow_trigger`** `Optional[BaseTrigger]`

Optional trigger instance for this scenario. Use this to test workflows that are triggered by schedules or integrations.

---

**`mocks`** `Optional[Sequence[Union[BaseOutputs, MockNodeExecution]]]`

Optional sequence of node output mocks for testing scenarios. Allows you to override node outputs during local execution.

---

## Basic Usage

The `sandbox.py` file defines your dataset and creates a `WorkflowSandboxRunner` to execute your workflow locally.

```python
from vellum.workflows.inputs import DatasetRow
from vellum.workflows.sandbox import WorkflowSandboxRunner

from .inputs import Inputs
from .workflow import Workflow

dataset = [
    DatasetRow(label="Scenario 1", inputs=Inputs(user_message="Hello")),
    DatasetRow(label="Scenario 2", inputs=Inputs(user_message="How are you?")),
]

runner = WorkflowSandboxRunner(workflow=Workflow(), dataset=dataset)

if __name__ == "__main__":
    runner.run()
```

You can run a specific scenario by passing an index to the `run()` method:

```python
runner.run(index=1)  # Runs "Scenario 2"
```

## Inputs

Inputs can be provided as either a typed `BaseInputs` instance or a dictionary. Using typed inputs provides better IDE support and validation.

#### Using Typed Inputs

The `Inputs` class is defined in your workflow's `./inputs.py` file:

```python
# ./inputs.py
from vellum.workflows.inputs import BaseInputs

class Inputs(BaseInputs):
    user_message: str
    temperature: float = 0.7
```

Then reference it in your `sandbox.py`:

```python
# ./sandbox.py
from vellum.workflows.inputs import DatasetRow

from .inputs import Inputs

dataset = [
    DatasetRow(
        label="With typed inputs",
        inputs=Inputs(user_message="Hello", temperature=0.5),
    ),
]
```

#### Using Dictionary Inputs

```python
from vellum.workflows.inputs import DatasetRow

dataset = [
    DatasetRow(
        label="With dict inputs",
        inputs={"user_message": "Hello", "temperature": 0.5},
    ),
]
```

## Triggers

Triggers allow you to test workflows that are activated by schedules or external integrations. The `workflow_trigger` attribute accepts any trigger type that extends `BaseTrigger`.

When using `workflow_trigger`, you should not define `inputs` as the trigger provides its own input context.

### Available Trigger Types

| Trigger              | Description                                        |
| -------------------- | -------------------------------------------------- |
| `ScheduleTrigger`    | For workflows triggered on a schedule (cron-based) |
| `IntegrationTrigger` | For workflows triggered by external integrations   |
| `ManualTrigger`      | For workflows triggered manually                   |

#### Using Schedule Triggers

The trigger class is defined in your workflow's `./triggers/scheduled.py` file:

```python
# ./triggers/scheduled.py
from vellum.workflows.triggers import ScheduleTrigger

class MySchedule(ScheduleTrigger):
    pass
```

Then reference it in your `sandbox.py`:

```python
# ./sandbox.py
from datetime import datetime
from vellum.workflows.inputs import DatasetRow

from .triggers.scheduled import MySchedule

dataset = [
    DatasetRow(
        label="Scheduled execution",
        workflow_trigger=MySchedule(
            current_run_at=datetime.now(),
            next_run_at=datetime.now(),
        ),
    ),
]
```