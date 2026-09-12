> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# PDF Content Summarization

> Extract and summarize the contents of PDF documents

Vellum Document Indexes are typically used to power RAG systems via Search Nodes. However, they can also be used to operate on the entirety of a single file's contents.
In this example, we make use of Vellum Document Indexes not for the purpose of search, instead, to leverage the OCR that's performed and operate on the raw text that's extracted
from a PDF file.

## Prerequisites

Before building this workflow, you need to have:

* Created a Document Index. Note: it doesn't matter what embedding model or chunking strategy you choose, since we're only leveraging the OCR capabilities of the Document Index.
* Uploaded a PDF file to the Document Index and noted down its ID.
* Generated a Vellum API Token and saved its value as a Workspace Secret.

## Implementation Steps

### Set the input to the workflow

This will be the ID of a Document that was previously uploaded to a Document Index

### Add a Templating Node (`Document API URL`)

This will construct the url of a Vellum API we want to hit.

### Add an API Node (`Document API`)

This will ping the Vellum API and retrieve metadata about the Document.

### Add a Templating Node (`Processed Document URL`)

This will extract the url of the processed document from the API response.

### Add an API Node (`Processed Document Contents`)

This will retrieve the text contents of the Document.

### Pass those contents to a Prompt Node that summarizes the text.