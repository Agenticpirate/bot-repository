> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# RAG System Architecture

> Build a Retrieval Augmented Generation system to enhance LLM responses with relevant data

LLM applications often require specific context from a Vector DB which is added into the prompt. Forget signing up for multiple systems and being stuck on various micro decisions, with Vellum you can prototype a RAG system in minutes.

## Implementation Steps

### Create a Document Index and upload your documents

Follow this article for tips: [Uploading Documents](/product/documents/uploading-documents))

### Add a Search Node in your Workflow

Place this anywhere and connect it to the "entrypoint"

### Add a Prompt Node

The prompt node should take the results of your Search Node as an input variable

### Link to a Final Output or other downstream node

For example, if the Prompt Node result is a certain value branch execution based on a Conditional Node)

### Set up input variables and hit Run!