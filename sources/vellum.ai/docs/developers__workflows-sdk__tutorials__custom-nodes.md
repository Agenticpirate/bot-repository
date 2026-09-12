> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Custom Nodes

> Learn how to create custom nodes for Vellum Workflows with the Workflows SDK.

In this guide, we will walk through the process of creating custom nodes for Vellum Workflows using the Workflows SDK. Custom nodes allow you to extend the functionality of your Workflows by implementing specific logic tailored to your needs.

## Overview

In this tutorial, we will create a simple workflow that:

1. Fetches fake social media posts from an API
2. Maintains strong types by validating the API response with Pydantic, via the Workflows SDK `UniversalBaseModel`
3. Depending on runtime inputs, also fetches & appends post author data
4. Passes the data to a Prompt Node to summarize the results using a language model.

## Components

### 1. `workflow.py`

This file defines the main workflow. The workflow consists of a graph that connects a `CustomNode` (our data fetcher) to a `SummarizeResultsNode`. The `Outputs` class specifies the expected output of the workflow.

**`workflow.py`**

```python title="workflow.py" 
from vellum.workflows import BaseWorkflow
from .nodes.custom_node import CustomNode
from .nodes.summarize_results_node import SummarizeResultsNode

class Workflow(BaseWorkflow):
    graph = CustomNode >> SummarizeResultsNode

    class Outputs(BaseWorkflow.Outputs):
        results = SummarizeResultsNode.Outputs.text
```

### 2. `custom_node.py`

In `custom_node.py` we define a `CustomNode` that extends `BaseNode`. The `run` method fetches fake social media posts from an API and, depending on the `include_user_details` input, fetches user details from a separate API and returns the results. This node demonstrates how you can use the `run` method to define custom runtime logic based on the node's inputs.

In `types.py` we define response types using `UniversalBaseModel` (which inherits from Pydantic) to achieve static type checking & type inference throughout our Workflow. We also use `pydash` to coerce our response types from camel case to snake case, to achieve consistency with the code conventions we prefer (and simultaneously, make our linter happy).

**`nodes/custom_node.py`**

```python title="nodes/custom_node.py"
from typing import List

import requests

from vellum.workflows.nodes import BaseNode

from examples.extend_base_node.inputs import Inputs
from examples.extend_base_node.nodes.types import Post, PostsResponse, User


class CustomNode(BaseNode):
    search_query: str = Inputs.search_query
    include_user_details = Inputs.include_user_details

    class Outputs(BaseNode.Outputs):
        posts: List[Post]

    def run(self) -> BaseNode.Outputs:
        raw_response = requests.get(f"https://dummyjson.com/posts/search?q={self.search_query}&limit=3", timeout=10).json()
        response = PostsResponse.model_validate(raw_response)
        posts = response.posts

        if self.include_user_details:
            for post in posts:
                user_id = post.user_id
                raw_user_response = requests.get(f"https://dummyjson.com/users/{user_id}", timeout=10).json()
                user = User.model_validate(raw_user_response)
                post.user = user

        return self.Outputs(posts=posts)
```

**`nodes/types.py`**

```python title="nodes/types.py"
from typing import List, Optional

from pydantic import ConfigDict
from pydash import camel_case

from vellum.core import UniversalBaseModel

# The `pydash` library is a dependency of `vellum-ai` and is included with installation.
camel_case_config = ConfigDict(
    alias_generator=camel_case,
)


class Company(UniversalBaseModel):
    department: str
    name: str
    title: str


class User(UniversalBaseModel):
    id: int
    first_name: str
    last_name: str
    maiden_name: str
    email: str
    username: str
    birth_date: str
    image: str
    university: str
    company: Company
    ein: str
    ssn: str
    user_agent: str
    role: str

    model_config = camel_case_config


class Reactions(UniversalBaseModel):
    likes: int
    dislikes: int


class Post(UniversalBaseModel):
    id: int
    title: str
    body: str
    tags: List[str]
    reactions: Reactions
    views: int
    user_id: int
    user: Optional[User] = None

    model_config = camel_case_config


class PostsResponse(UniversalBaseModel):
    posts: List[Post]
    total: int
    skip: int
    limit: int

```

### 3. `summarize_results_node.py`

This file defines a `SummarizeResultsNode` that extends `InlinePromptNode`. It uses GPT-4o-mini to summarize the posts data fetched by the `CustomNode`. The node is configured with prompt blocks that define how the input data should be processed.

**`nodes/summarize_results_node.py`**

```python title="nodes/summarize_results_node.py"
from vellum import ChatMessagePromptBlock, JinjaPromptBlock
from vellum.workflows.nodes import InlinePromptNode
from .nodes.custom_node import CustomNode

class SummarizeResultsNode(InlinePromptNode):
    ml_model = "gpt-4o-mini"
    blocks = [
        ChatMessagePromptBlock(
            chat_role="SYSTEM",
            blocks=[
                JinjaPromptBlock(
                    block_type="JINJA",
                    template="Summarize the following social media posts: <posts>{{ posts }}</posts>",
                ),
            ],
        ),
    ]
    prompt_inputs = {"results": CustomNode.Outputs.results}
```

## Running the Workflow

To execute the workflow, create a `script.py` like the one below, and run it via `python script.py`. The workflow will fetch the social media posts, process them through the `SummarizeResultsNode`, and log the summary.

**`script.py`**

```python title="script.py"
import logging
from .workflow import Workflow

logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
if __name__ == "__main__":
    workflow = Workflow()
    terminal_event = workflow.run()
    if terminal_event.name == "workflow.execution.fulfilled":
        logger.info(terminal_event.outputs["results"])
    else:
        logger.error(terminal_event)
```

Output:

```plaintext wordWrap
1. In the first post titled "The leather jacket showed the scars," he reflects
on a well-worn leather jacket that has become a symbol of pride and character 
over the years. The jacket's scars are seen as enhancements rather than flaws,
indicating it is still in its prime. This post received 428 likes and 19
dislikes, with 765 views.
  
2. The second post, "Sometimes it's just better not to be seen," discusses a 
character named Harry who prefers to remain unnoticed and blend into the
background. He is surprised when someone actually notices him, challenging his
self-perception. This post garnered 390 likes and 25 dislikes, with a total of 2,928 views. 
  
Both posts are tagged with themes of French fiction and classic storytelling.
```

## Conclusion

By following this guide, you have learned how to extend `BaseNode` to create custom nodes in Vellum Workflows. This approach allows you to tailor workflows to your specific requirements, integrating external data sources and processing them with advanced language models.