> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

## Defining a Workflow

All Vellum Workflows extend from the `BaseWorkflow` class. Workflows define the *control flow* of your application,
orchestrating the order of execution between each Node.

Workflows can be invoked via a `run` method, which returns the final event that was emitted by the Workflow.

```python
class MyWorkflow(BaseWorkflow):
    pass

workflow = MyWorkflow()
final_event = workflow.run()

assert final_event.name == "workflow.execution.fulfilled"
```

In the example above, `final_event` has a `name` of `"workflow.execution.fulfilled"`. This indicates that the Workflow
ran to completion successfully. Had the Workflow encountered an error, the `name` would have been `"workflow.execution.rejected"`.

## Workflow Outputs

You can think of a Workflow as a black box that produces values for pre-defined outputs. To specify the outputs of a Workflow,
you must define an `Outputs` class that extends from `BaseWorkflow.Outputs`.

Here is a very basic Workflow that defines a single output called `hello` with a hard-coded return value of the string `"world"`.

```python
class MyWorkflow(BaseWorkflow):
    class Outputs(BaseWorkflow.Outputs):
        greeting = "Hello, world!"


workflow = MyWorkflow()
final_event = workflow.run()

assert final_event.name == "workflow.execution.fulfilled"
assert final_event.outputs.greeting == "Hello, world!"
```

## Defining Nodes

Nodes are the building blocks of a Workflow and are responsible for executing a specific task. All Nodes in a Workflow
must extend from the `BaseNode` class.

Here we define a very simple custom Node called `GreetingNode` that overrides the `run` method to print `"Hello, world!"` to the
console. Notably, this Node doesn't produce any outputs (yet!).

```python
class GreetingNode(BaseNode):
    def run(self) -> BaseNode.Outputs:
        print("Hello, world!")
        return self.Outputs()
```

## Defining Node Outputs

Most Nodes produce Outputs that can be referenced elsewhere in the Workflow. Just like a Workflow, a Node defines its
outputs via an `Outputs` class, this time, extending from `BaseNode.Outputs`.

Here we define a `GreetingNode` that produces a single output of type `str` called `greeting`. The `run` method returns
an instance of `GreetingNode.Outputs` with the `greeting` attribute set to `"Hello, world!"`.

```python
class GreetingNode(BaseNode):
    class Outputs(BaseNode.Outputs):
        greeting: str

    def run(self) -> BaseNode.Outputs:
        greeting = "Hello, world!"
        print(greeting)
        return self.Outputs(greeting=greeting)
```

## Using a Node in a Workflow

Nodes are executed as part of a Workflow once they're added to the Workflow's `graph` attribute. Once added, a Node's
output can be used as the Workflow's output.

```python {11-16}
class GreetingNode(BaseNode):
    class Outputs(BaseNode.Outputs):
        greeting: str

    def run(self) -> BaseNode.Outputs:
        greeting = "Hello, world!"
        print(greeting)
        return self.Outputs(greeting=greeting)

class MyWorkflow(BaseWorkflow):
    # Add the GreetingNode to the Workflow's graph
    graph = GreetingNode

    class Outputs(BaseWorkflow.Outputs):
        # Use the GreetingNode's output as the Workflow's output
        greeting = GreetingNode.Outputs.greeting  

workflow = MyWorkflow()
final_event = workflow.run()

assert final_event.name == "workflow.execution.fulfilled"
assert final_event.outputs.greeting == "Hello, world!"
```

## Workflow Inputs

The runtime behavior of a Workflow almost always depends on some set of input values that are provided at the time of
execution.

You can define a Workflow's inputs via an `Inputs` class that extends from `BaseInputs` and that's then referenced in
the Workflow's parent class as a generic type.

Here's a Workflow that defines a single input called `greeting` of type `str` and simply passes it through
as an output.

```python maxLines=12
class Inputs(BaseInputs):
    greeting: str

class MyWorkflow(BaseWorkflow[Inputs, BaseState]):
    class Outputs(BaseWorkflow.Outputs):
        greeting = Inputs.greeting

workflow = MyWorkflow()
final_event = workflow.run(inputs=Inputs(greeting="Hello, world!"))

assert final_event.name == "workflow.execution.fulfilled"
assert final_event.outputs.greeting == "Hello, world!"
```

## Node Attributes

A Workflow's inputs are usually used to drive the behavior of its Nodes. Nodes can reference these inputs via class
attributes that are resolved at runtime.

Below we drive the behavior of a `GreetingNode` by specifying `noun = Inputs.noun` as a class attribute, then referencing
`self.noun` in the `run` method to produce a dynamic greeting.

```python {4-5,10-11} maxLines=12
class Inputs(BaseInputs):
    noun: str

class GreetingNode(BaseNode):
    noun = Inputs.noun

    class Outputs(BaseNode.Outputs):
        greeting: str

    def run(self) -> Outputs:
        return self.Outputs(greeting=f"Hello, {self.noun}!")

class MyWorkflow(BaseWorkflow[Inputs, BaseState]):
    graph = GreetingNode

    class Outputs(BaseWorkflow.Outputs):
        hello = GreetingNode.Outputs.greeting

workflow = MyWorkflow()

# Run it once with "world"
final_event = workflow.run(inputs=Inputs(noun="world"))

assert final_event.name == "workflow.execution.fulfilled"
assert final_event.outputs.hello == "Hello, world!"

# Run it again with "universe"
final_event = workflow.run(inputs=Inputs(noun="universe"))

assert final_event.name == "workflow.execution.fulfilled"
assert final_event.outputs.hello == "Hello, universe!"
```

#### Descriptors

`Inputs.noun` is what we call a "descriptor" and is not a literal value. Think of it like a pointer or reference whose value is resolved at runtime. *If you were to call `Inputs.noun` within a node's run method instead of `self.noun` an exception would be raised.*

## Control Flow

### Defining Control Flow

Until now, we've only defined Workflows that contain a single Node – not very interesting! Most Workflows orchestrate
the execution of multiple Nodes in a specific order. This is achieved by defining a `graph` attribute with a special
syntax that describes the control flow between Nodes.

Here we define three Nodes, `GreetingNode`, `EndNode`, and `AggregatorNode`, then define the order of their execution
by using the `>>` operator.

**`workflow.py`**

```python title="workflow.py" {2}
class MyWorkflow(BaseWorkflow):
    graph = GreetingNode >> SalutationNode >> AggregatorNode

    class Outputs(BaseWorkflow.Outputs):
        results = AggregatorNode.Outputs.results

workflow = MyWorkflow()
final_event = workflow.run()

assert final_event.name == "workflow.execution.fulfilled"
assert final_event.outputs.results == ["Hello, world!", "Goodbye, world!"]
```

**`nodes/greeting.py`**

```python title="nodes/greeting.py"
class GreetingNode(BaseNode):
    class Outputs(BaseNode.Outputs):
        greeting: str

    def run(self) -> Outputs:
        return self.Outputs(greeting=f"Hello, world!")
```

**`nodes/salutation.py`**

```python title="nodes/salutation.py"
class SalutationNode(BaseNode):
    class Outputs(BaseNode.Outputs):
        salutation: str

    def run(self) -> Outputs:
        return self.Outputs(salutation="Goodbye, world!")
```

**`nodes/aggregator.py`**

```python title="nodes/aggregator.py"
class AggregatorNode(BaseNode):
    greeting = GreetingNode.Outputs.greeting
    salutation = SalutationNode.Outputs.salutation

    class Outputs(BaseNode.Outputs):
        results: list[str]

    def run(self) -> Outputs:
        return self.Outputs(results=[self.greeting, self.salutation])
```

### Ports and Conditionals

Nodes contain Ports and use them to determine which Nodes to execute next. Ports are useful for performing branching logic and conditional execution of subsequent Nodes.

We haven't seen any Ports up until now, but they're actually present in every Node. By default, a Node has a single Port called `default`, which is always invoked after the Node's `run` method completes.

The following Workflows are equivalent:

```python {2,8}
class MyWorkflow1(BaseWorkflow):
    graph = GreetingNode >> SomeNode,

    class Outputs(BaseWorkflow.Outputs):
        result = "Hello"

class MyWorkflow2(BaseWorkflow):
    graph = GreetingNode.Ports.default >> SomeNode,

    class Outputs(BaseWorkflow.Outputs):
        result = "Hello"
```

You can explicitly define a `Ports` class on a Node and define the conditions in which one Node or another should execute. Below, we define a `SwitchNode` that has a `winner` Port and a `loser` Port.

**`workflow.py`**

```python title="workflow.py" {3-6} maxLines=12
class SwitchNode(BaseNode):
    class Ports(BaseNode.Ports):
        # Invoke the `winner` Port if the `StartNode`'s `score` output is greater than `5`
        winner = Port.on_if(StartNode.Outputs.score.greater_than(5))
        # Otherwise, invoke the `loser` Port
        loser = Port.on_else()

class MyWorkflow(BaseWorkflow):
    graph = StartNode >> {
        SwitchNode.Ports.winner >> WinnerNode,
        SwitchNode.Ports.loser >> LoserNode,
    }

    class Outputs(BaseWorkflow.Outputs):
        result = WinnerNode.Outputs.result.coalesce(LoserNode.Outputs.result)


workflow = MyWorkflow()
final_event = workflow.run()

assert final_event.name == "workflow.execution.fulfilled"
assert final_event.outputs.result in ("We won!", "We lost :(")
```

**`nodes/start_node.py`**

```python title="nodes/start_node.py"
class StartNode(BaseNode):
    class Outputs(BaseNode.Outputs):
        score: int

    def run(self) -> Outputs:
        return self.Outputs(score=random.randint(0, 10))
```

**`nodes/winner_node.py`**

```python title="nodes/winner_node.py"
class WinnerNode(BaseNode):
    class Outputs(BaseNode.Outputs):
        result = "We won!"
```

**`nodes/loser_node.py`**

```python title="nodes/loser_node.py"
class LoserNode(BaseNode):
    class Outputs(BaseNode.Outputs):
        result = "We lost :("
```

Notice that we use the `greater_than` *Expression* to define the `winner` Port— more on Expressions next.

### Expressions

Descriptors support a declarative syntax for defining Expressions. Expressions are usually used in conjunction with Ports
to define conditional execution of subsequent Nodes, but can also be used as short-hand for performing simple
operations that would otherwise have to be manually defined in a Node's `run` method.

Here we define a `StartNode` that produces a random `score` between 0 and 10. We then define an `EndNode` that has a
single output called `winner` that is `True` if the `score` is greater than 5.

For example, the longform definition of a Node that relies on `StartNode.Outputs.score` would look like this:

```python
class EndNode(BaseNode):
    score = StartNode.Outputs.score

    class Outputs(BaseNode.Outputs):
        winner: bool

    def run(self) -> Outputs:
        return self.Outputs(winner=self.score > 5)
```

And the shortform using an Expression would look like this:

```python
class EndNode(BaseNode):

    class Outputs(BaseNode.Outputs):
        winner = StartNode.Outputs.score.greater_than(5)
```

### Triggers

In some cases, you may want to delay the execution of a Node until a certain condition is met. For example, you may want to wait for multiple upstream Nodes to complete before executing a Node, like when executing Nodes in parallel. This is where Triggers come in.

Just as Nodes define a `Ports` class implicitly by default, they also define a `Trigger` class implicitly by default. Here's what the default `Trigger` class looks like:

```python
class Trigger(BaseNode.Trigger):
    merge_behavior = MergeBehavior.AWAIT_ANY
```

This means that by default, a Node will execute as soon as any one of its immediately upstream Nodes have fulfilled. You might instead want to wait until all of its upstream Nodes have fulfilled. To do this, you can explicitly define a `Trigger` class on a Node like so:

```python
class Trigger(BaseNode.Trigger):
    merge_behavior = MergeBehavior.AWAIT_ALL
```

Here's a complete example:

```python
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
        merge_strategy = MergeBehavior.AWAIT_ALL

    def run(self) -> Outputs:
        return self.Outputs(message=f"{self.prefix} {self.suffix}")


class MyWorkflow(BaseWorkflow):
    graph = {
        QuickNode,
        SlowNode,
    } >> MergeNode

    class Outputs(BaseWorkflow.Outputs):
        result = MergeNode.Outputs.message


workflow = MyWorkflow()
final_event = workflow.run()

assert final_event.name == "workflow.execution.fulfilled"
assert final_event.outputs.result == "Hello World"
```

It's usually sufficient to stick with the "Await All" and "Await Any" merge behaviors that are provided out-of-box. However, you can also define your own custom merge behaviors by overriding the `Trigger` class's `should_initiate` method. By doing so, you can access any information about the Node's dependencies or the Workflow's State (more on State later).

### Parallel Execution

You may want to run multiple execution paths in parallel. For example, if you want to run multiple LLM prompts concurrently, or respond to a user while performing background tasks. To do this, you can use "set syntax" as follows:

**`workflow_parallelized.py`**

```python title="workflow_parallelized.py" {9-12} {22,23}
class FirstNode(TimeSinceStartNode):
    pass


class SecondNode(TimeSinceStartNode):
    pass

class BasicParallelizationWorkflow(BaseWorkflow):
    graph = StartNode >> {
        FirstNode,
        SecondNode,
    }

    class Outputs(BaseWorkflow.Outputs):
        first_node_time: int = FirstNode.Outputs.total_time
        second_node_time: int = SecondNode.Outputs.total_time

workflow = BasicParallelizationWorkflow()
final_event = workflow.run()

assert final_event.name == "workflow.execution.fulfilled"
assert final_event.outputs.first_node_time == 1
assert final_event.outputs.second_node_time == 1
```

**`workflow_sequential.py`**

```python title="workflow_sequential.py"
class FirstNode(TimeSinceStartNode):
    pass


class SecondNode(TimeSinceStartNode):
    pass

class BasicSequentialWorkflow(BaseWorkflow):
    graph = StartNode >> FirstNode >> SecondNode

    class Outputs(BaseWorkflow.Outputs):
        first_node_time: int = FirstNode.Outputs.total_time
        second_node_time: int = SecondNode.Outputs.total_time

workflow = BasicSequentialWorkflow()
final_event = workflow.run()

assert final_event.name == "workflow.execution.fulfilled"
assert final_event.outputs.first_node_time == 1
assert final_event.outputs.second_node_time == 2
```

**`nodes/time_since_beginning_node.py`**

```python title="nodes/time_since_beginning_node.py"
class TimeSinceStartNode(BaseNode):
    start_time = StartNode.Outputs.start_time

    class Outputs(BaseNode.Outputs):
        total_time: int

    def run(self) -> Outputs:
        time.sleep(1)
        return self.Outputs(total_time=math.floor(time.time() - self.start_time))
```

**`nodes/start_node.py`**

```python title="nodes/start_node.py"
class StartNode(BaseNode):
    class Outputs(BaseNode.Outputs):
        start_time = time.time()
```

## State

In most cases it's sufficient to drive a Node's behavior based on either inputs to the Workflow, or the outputs of upstream Nodes. However, Workflow's also support writing to and reading from a global state object that lives for the duration of the Workflow's execution.

Here's an example of how to define the schema of a State object and use it in a Workflow.

```python
class State(BaseState):
    items: Set[int]


class TopNode(BaseNode[State]):
    def run(self) -> BaseNode.Outputs:
        self.state.items.add(random.randint(0, 10))
        return self.Outputs()


class BottomNode(BaseNode[State]):
    def run(self) -> BaseNode.Outputs:
        self.state.items.add(random.randint(10, 20))
        return self.Outputs()


class MergeNode(BaseNode):
    all_items = State.items

    class Outputs(BaseNode.Outputs):
        total: int

    class Trigger(BaseNode.Trigger):
        merge_strategy = MergeBehavior.AWAIT_ALL

    def run(self) -> Outputs:
        return self.Outputs(total=len(self.all_items))


class MyWorkflow(BaseWorkflow[BaseInputs, State]):
    graph = {
        TopNode,
        BottomNode,
    } >> MergeNode

    class Outputs(BaseWorkflow.Outputs):
        result = MergeNode.Outputs.total


workflow = MyWorkflow()
final_event = workflow.run()

assert final_event.name == "workflow.execution.fulfilled"
assert final_event.outputs.result == 2
```

Even if no `State` class is explicitly defined, Workflows use State under the hood to track all information about a Workflow's execution. This information is stored under the reserved `meta` attribute on the `State` class and can be accessed for your own purposes.

## Streaming Outputs

### Workflow Event Streaming

Until now, we've only seen the `run()` method being invoked on Workflows we've defined. `run()` is a blocking
call that waits for the Workflow to complete before returning a terminal fulfilled or rejected event.

In some cases, you may want to stream the events a Workflow produces as they're being emitted. This is useful
when your Workflow produces outputs along the way, and you want to consume them in real-time.

You can do this via the `stream()` method, which returns a Generator that yields events as they're produced.

```python
class Inputs(BaseInputs):
    boost: int

class StartNode(BaseNode):
    boost = Inputs.boost
    class Outputs(BaseNode.Outputs):
        score: int

    def run(self) -> Outputs:
        return self.Outputs(score=random.randint(0, 10) + self.boost)


class EndNode(BaseNode):
    class Outputs(BaseNode.Outputs):
        winner = StartNode.Outputs.score.greater_than(15)


class MyWorkflow(BaseWorkflow):
    graph = StartNode >> EndNode

    class Outputs(BaseWorkflow.Outputs):
        score = StartNode.Outputs.score
        winner = EndNode.Outputs.winner


workflow = MyWorkflow()
events = workflow.stream(inputs=Inputs(boost=10))

for event in events:
    if event.name == "workflow.execution.initiated":
        assert event.inputs.boost == 10
    elif event.name == "workflow.execution.fulfilled":
        assert event.outputs.winner is True
    elif event.name == "workflow.execution.streaming":
        if event.output.name == "score":
            assert event.output.value > 10
        elif event.output.name == "winner":
            assert event.output.value is True
```

### Node Event Streaming

By default, when you call a Workflow's `stream()` method, you'll only receive Workflow-level events. However, you may
also opt in to receive Node-level events by specifying a custom `event_filter` parameter. We provide a few out of box filters:

* `workflow_event_filter` - only Workflow-level events emitted by the Workflow
* `root_workflow_event_filter` - all Workflow-level and Node-level events emitted by the root Workflow and *not* its nested Subworkflows
* `all_events_filter` - All Workflow and Node-level events, including from nested Subworkflows

With this, you can receive the events that Nodes in the Workflow produce as they're emitted. This is useful when you want
to inspect the outputs of individual Nodes for debugging purposes.

```python
class Inputs(BaseInputs):
    boost: int


class StartNode(BaseNode):
    boost = Inputs.boost

    class Outputs(BaseNode.Outputs):
        score: int

    def run(self) -> Outputs:
        return self.Outputs(score=random.randint(0, 10) + self.boost)


class EndNode(BaseNode):
    class Outputs(BaseNode.Outputs):
        winner = StartNode.Outputs.score.greater_than(15)


class MyWorkflow(BaseWorkflow):
    graph = StartNode >> EndNode

    class Outputs(BaseWorkflow.Outputs):
        winner = EndNode.Outputs.winner


workflow = MyWorkflow()
events = workflow.stream(
    inputs=Inputs(boost=10),
    event_filter=root_workflow_event_filter,
)

for event in events:
    if event.name == "workflow.execution.initiated":
        assert event.inputs.boost == 10
    elif event.name == "workflow.execution.fulfilled":
        assert event.outputs.winner is True
    elif event.name == "node.execution.fulfilled":
        if event.node_class is StartNode:
            assert event.outputs.score > 10
        elif event.node_class is EndNode:
            assert event.outputs.winner is True
```

### Node Comments

You can add comments to Nodes by adding a docstring to the Node class. These comments will appear as comments in the Node in the Vellum UI upon pushing.

```python
class MyNode(BaseNode):
    """
    This is a comment explaining what the MyNode class does.
    """
    pass
```

### Node Context

All nodes receive a `_context` attribute that contains information about the Node's execution and surrounding Workflow environment. The commonly used attributes are:

* `self._context.vellum_client` - A Vellum client instance that can be used to make API calls to Vellum, already authenticated with the `VELLUM_API_KEY` environment variable.
* `self._context.parent_context` - A reference to the parent context, detailing what invoked the current Node all the way up to the root Workflow Sandbox or Deployment.

```python
class MyNode(BaseNode):
    document_id = Inputs.document_id

    class Outputs(BaseNode.Outputs):
        processing_state: str

    def run(self) -> Outputs:
        response = self._context.vellum_client.documents.retrieve(id=self.document_id)
        return self.Outputs(processing_state=response.processing_state)
```

### Emitting Log Events

The `emit_log_event` method allows you to emit custom log events from within a Node's execution. These events are persisted to Vellum's monitoring layer and can be viewed in the Workflow Sandbox UI, on execution details pages, and retrieved via the execution details APIs.

```python
self._context.emit_log_event(
    severity="INFO",  # "INFO", "WARNING", or "ERROR"
    message="Your log message here",
    attributes={"key": "value"},  # Optional dictionary of additional data
    exc_info=True,  # Optional: include exception traceback if in an exception handler
)
```

The method accepts the following parameters:

* `severity` - The log level: `"INFO"`, `"WARNING"`, or `"ERROR"`
* `message` - A string describing the log event
* `attributes` - An optional dictionary of additional key-value pairs to include with the log
* `exc_info` - When set to `True` inside an exception handler, automatically captures and includes the current exception traceback

Here's a complete example showing different logging scenarios:

```python
class DataProcessingNode(BaseNode):
    data = Inputs.data

    class Outputs(BaseNode.Outputs):
        result: str

    def run(self) -> Outputs:
        # Log informational messages with custom attributes
        self._context.emit_log_event(
            severity="INFO",
            message="Starting data processing",
            attributes={"record_count": len(self.data)},
        )

        # Log warnings for non-critical issues
        if len(self.data) > 1000:
            self._context.emit_log_event(
                severity="WARNING",
                message="Large dataset detected, processing may be slow",
            )

        try:
            processed = self.process_data(self.data)
        except ValueError:
            # Log errors with exception traceback
            self._context.emit_log_event(
                severity="ERROR",
                message="Failed to process data",
                exc_info=True,
            )
            raise

        return self.Outputs(result=processed)
```

## Workflow Triggers

Workflow Triggers define how and when a Workflow Execution is initiated. By default, Workflows use a `ManualTrigger`, which means they execute when explicitly invoked via `workflow.run()` by default. However, you can also configure Workflows to execute automatically based on schedules or external events.

### Scheduled Trigger

A `ScheduleTrigger` allows you to invoke your workflow on a recurring schedule using cron expressions. This is useful for workflows that need to run periodically, such as daily reports, data synchronization tasks, or scheduled maintenance operations.

To use a scheduled trigger, create a custom trigger class that extends `ScheduleTrigger` and define the schedule in a nested `Config` class:

```python
from vellum.workflows import BaseWorkflow
from vellum.workflows.nodes.bases import BaseNode
from vellum.workflows.triggers.schedule import ScheduleTrigger

class DailyScheduleTrigger(ScheduleTrigger):
    class Config(ScheduleTrigger.Config):
        cron = "0 9 * * *"  # Every day at 9am
        timezone = "America/New_York"

class DailyReportNode(BaseNode):
    # Access the scheduled execution time from the trigger
    current_run_at = DailyScheduleTrigger.current_run_at
    next_run_at = DailyScheduleTrigger.next_run_at

    class Outputs(BaseNode.Outputs):
        report: str

    def run(self) -> Outputs:
        report = f"Report generated at {self.current_run_at}"
        return self.Outputs(report=report)

class DailyReportWorkflow(BaseWorkflow):
    # Use the custom scheduled trigger in the workflow graph
    graph = DailyScheduleTrigger >> DailyReportNode

    class Outputs(BaseWorkflow.Outputs):
        result = DailyReportNode.Outputs.report
```

The `ScheduleTrigger` provides two attributes that can be referenced in your workflow nodes:

* `current_run_at` - The datetime when the current execution was triggered
* `next_run_at` - The datetime when the next execution is scheduled

The schedule is defined in the `Config` class with:

* `cron` - A cron expression (e.g., `"0 9 * * *"` for daily at 9 AM)
* `timezone` - Optional timezone for the schedule (e.g., `"America/New_York"`)

### Integration Trigger

An `IntegrationTrigger` allows your workflow to be invoked automatically in response to webhook events from external services. This enables event-driven workflows that react to activities in platforms like Slack, Gmail, GitHub, and other integrated services.

```python
from vellum.workflows import BaseWorkflow
from vellum.workflows.nodes.bases import BaseNode
from vellum.workflows.triggers.integration import IntegrationTrigger
from vellum.workflows.constants import VellumIntegrationProviderType

class SlackMessageTrigger(IntegrationTrigger):
    # Define the event payload structure for Slack messages
    message: str
    channel: str
    user: str

    class Config(IntegrationTrigger.Config):
        provider = VellumIntegrationProviderType.COMPOSIO
        integration_name = "SLACK"
        slug = "slack_new_message"

class ProcessMessageNode(BaseNode):
    # Reference trigger attributes in your nodes
    message = SlackMessageTrigger.message
    channel = SlackMessageTrigger.channel

    class Outputs(BaseNode.Outputs):
        result: str

    def run(self) -> Outputs:
        return self.Outputs(
            result=f"Received '{self.message}' from channel {self.channel}"
        )

class SlackWorkflow(BaseWorkflow):
    # Workflow is triggered by Slack messages
    graph = SlackMessageTrigger >> ProcessMessageNode

    class Outputs(BaseWorkflow.Outputs):
        result = ProcessMessageNode.Outputs.result
```

When defining an `IntegrationTrigger`, you specify:

* **Event attributes** - Type-annotated fields that define the structure of the webhook payload. These attributes vary by integration type and are based on the specific event payload from that integration. For example, Slack messages have `message`, `channel`, and `user` attributes, while other integrations like Linear or GitHub would have different attributes specific to their event payloads.
* **Config class** - Configuration that specifies which integration provider and event type to use

The trigger attributes you annotate become available as typed references that can be used throughout your workflow, just like workflow inputs or node outputs. When the webhook event occurs, the trigger is instantiated with the event data, and your workflow executes with access to all the event information. Only the attributes you explicitly annotate in your trigger class definition will be exposed as typed references in your nodes, though other event data may exist at runtime.

Integration triggers are configured through the Vellum platform, where you connect your external service accounts and select which events should trigger your workflow. The trigger class definition in your code specifies the event payload structure and ensures type safety when referencing trigger data in your nodes.

### Chat Message Trigger

A `ChatMessageTrigger` allows your workflow to be automatically invoked when chat messages are received. This is perfect for building conversational AI agents, customer support bots, or any chatbot that needs to respond to user messages in real-time.

Chat message triggers work with a `State` that maintains conversation history, automatically appending user messages and assistant responses. Here's how to use it:

```python
from pydantic import Field

from vellum.client.types import ChatMessage
from vellum.workflows import BaseWorkflow, BaseInputs, BaseNode, LazyReference, BaseState, ChatMessageTrigger

class ConversationState(BaseState):
    """State that maintains the conversation history for chat interactions."""
    chat_history: list[ChatMessage] = Field(default_factory=list)

class ChatbotResponseNode(BaseNode):
    """Node that generates responses for customer support interactions."""

    class Outputs(BaseNode.Outputs):
        response: str = "Hello! I'm here to help. How can I assist you today?"

class CustomerSupportTrigger(ChatMessageTrigger):
    """Chat trigger that handles customer support conversations."""

    class Config(ChatMessageTrigger.Config):
        # Reference the workflow's response output to include it in chat history
        output = LazyReference("CustomerSupportWorkflow.Outputs.response")

class CustomerSupportWorkflow(BaseWorkflow[BaseInputs, ConversationState]):
    """Workflow for handling customer support chat conversations."""

    graph = CustomerSupportTrigger >> ChatbotResponseNode

    class Outputs(BaseWorkflow.Outputs):
        response = ChatbotResponseNode.Outputs.response
        chat_history = ConversationState.chat_history
```

The key components are:

* **ConversationState**: Maintains the `chat_history` as a list of `ChatMessage` objects for the conversation
* **ChatMessageTrigger subclass**: Configured with a reference to the workflow's response output for proper chat history management
* **Automatic chat history management**: The trigger automatically appends the user message when the workflow starts and the assistant response when it completes