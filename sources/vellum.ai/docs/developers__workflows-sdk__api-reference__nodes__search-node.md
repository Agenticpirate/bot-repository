> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Search Node

> Perform hybrid search against a Document Index for RAG applications.

`vellum.workflows.nodes.SearchNode`

Used to perform a hybrid search against a Document Index in Vellum.

### Attributes

**`document_index`** `Union[UUID, str]` — required

Either the UUID or name of the Vellum Document Index that you'd like to search against

---

**`query`** `str` — required

The query to search for

---

**`options`** `SearchRequestOptionsRequest`

Runtime configuration for the search

---

**`chunk_separator`** `str`

The separator to use when joining the text of each search result

---

### Outputs

**`text`** `str`

The concatenated text output from the search

---

**`results`** `List[SearchResult]`

The raw results from the search

---

**`Example Usage`**

```python title="Example Usage"
from vellum import (
    SearchRequestOptionsRequest,
    SearchWeightsRequest,
    SearchResultMergingRequest,
    SearchFiltersRequest,
)
from vellum.workflows.nodes.displayable import SearchNode

class MySearchNode(SearchNode):
    query = "Hello, world"
    document_index = "my_document_index"
    options = SearchRequestOptionsRequest(
        limit=8,
        weights=SearchWeightsRequest(
            semantic_similarity=0.8,
            keywords=0.2,
        ),
        result_merging=SearchResultMergingRequest(
            enabled=True
        ),
        filters=SearchFiltersRequest(
            external_ids=None,
            metadata=None,
        ),
    )
    chunk_separator = "\n\n#####\n\n"
```

**`Example Outputs`**

```python title="Example Outputs"
from vellum import SearchResult, SearchResultDocument

MySearchNode.Outputs(
    text="Goodbye, world",
    results=[
        SearchResult(
            text="Goodbye, world",
            score=0.5,
            keywords=[...],
            document=SearchResultDocument(
                id="<id>",
                label="My Document",
                external_id="<external-id>",
                metadata={},
            ),
            meta=None,
        ),
        ...
    ],
)
```