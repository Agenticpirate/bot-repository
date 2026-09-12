> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Search Node

> Search against a Document Index, great for RAG.

The Search Node returns results from a Document Index stored inside Vellum Search. Once your documents are uploaded in an index (details on how to do that here: [Uploading Documents](/product/documents/uploading-documents)), you can start using them in a Workflow.

**Environment Context**: Search Nodes respect Environment boundaries. Documents uploaded to a Document Index are Environment-scoped, so Search Node results will only include documents from the same Environment context as the Workflow execution. This ensures proper isolation between your different environments.

## Search Node Interface

The Search Node provides a simple interface for configuring your document searches:

![Search Node](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/c96366ea-6ab5-4593-b08e-01a9f64c1fd5-search_node_1.png)

When you open the Search Node, you'll see a detailed configuration interface:

![Search Node Configuration](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/c96366ea-6ab5-4593-b08e-01a9f64c1fd5-search_node_2.png)

## Advanced Configuration

The Search Node offers advanced configuration options through its settings panel:

![Search Node Advanced Configuration](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/c96366ea-6ab5-4593-b08e-01a9f64c1fd5-search_node_3.png)

## Key Features

### Dynamic Document Index Selection

The index in a Search Node can be fixed for the Workflow or chosen dynamically based on the output of an upstream node:

![Static Document Index Selection](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/c96366ea-6ab5-4593-b08e-01a9f64c1fd5-search_node_4.png)

![Dynamic Document Index Selection](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/c96366ea-6ab5-4593-b08e-01a9f64c1fd5-search_node_5.png)

This is particularly useful if you want to separate your users' content into different siloes or vector databases.

### Metadata Filtering

The Search Node supports metadata filtering, allowing you to narrow down search results based on document metadata. For example, you can specify that you only want to search across documents that match a certain `policy_type` or other metadata field.

### Advanced Chunking

If you want Search Node results to include additional metadata, such as starting and ending page numbers of the document chunks, or text interpretations of images / charts / table data, you can use [Advanced Chunking](/product/documents/uploading-documents#advanced-chunking-strategy) on your Document Index.