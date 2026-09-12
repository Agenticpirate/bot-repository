> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Building a RAG Chatbot from Scratch

> Learn how to build a complete RAG chatbot in Vellum's Workflow Builder, starting with a basic chatbot and then adding document context to reduce hallucinations and provide more accurate responses.

# Building a RAG Chatbot from Scratch

In this comprehensive tutorial, we'll walk through building a complete Retrieval Augmented Generation (RAG) chatbot using Vellum's Workflow Builder. RAG systems combine the power of Large Language Models with external knowledge sources to provide more accurate, context-aware responses while reducing hallucinations.

By the end of this tutorial, you'll have built a chatbot that:

* Maintains conversation context across multiple turns
* Searches through your document knowledge base
* Provides responses grounded in your specific content
* Gracefully handles questions outside its knowledge scope

## What You'll Learn

#### Basic Chatbot Setup

Create a foundational chatbot with Chat History support

#### Document Index Creation

Upload and configure documents for search and retrieval

#### RAG Implementation

Integrate search functionality with LLM responses

#### Hallucination Prevention

Constrain responses to available context

## Part 1: Building the Foundation

### Step 1: Create Your Workflow

Start by creating a new Workflow in Vellum. You'll begin with an empty canvas containing just an Entrypoint node.

### Step 2: Set Up Workflow Inputs

First, configure your workflow to accept chat history as input:

1. Click on the **Inputs** tab in the left sidebar
2. Click **Add** and select **Chat History** from the dropdown
3. Add a test message to simulate user input

![Add test message to chat history](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/ccc98d88-faad-4f94-a600-9bc56b814f6f-step4-add-test-message.png)

### Step 3: Add and Configure the Prompt Node

1. Drag from the Entrypoint node to create a connection and select **Prompt** from the node panel
2. In the Prompt Node configuration, update the system prompt to include context constraints:

```
Please answer the user's questions, but only use the <context> you're given below. If you can't answer their questions with the <context>, please say "Sorry, I'm unable to answer that."

<context>

</context>
```

3. Add a **Chat History** input variable and connect it to your workflow's chat history
4. Connect the Prompt Node to the Final Output Node

The context tags in the prompt are placeholders - we'll populate them with search results in the next section.

### Step 4: Test the Basic Setup

Before adding RAG capabilities, test your basic chatbot:

1. Ensure your Chat History contains only one user message (remove any assistant responses from previous tests)
2. Run the workflow

![Clean chat history setup](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/ea06ee56-f484-47e2-abd8-b74cc2921674-workflow-inputs-clean-chat-history.png)

You should see output similar to this, where the chatbot correctly responds that it cannot answer without context:

![Chatbot unable to answer without context](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/ea06ee56-f484-47e2-abd8-b74cc2921674-workflow-output-unable-to-answer.png)

## Part 2: Creating Your Knowledge Base

### Step 5: Create a Document Index

Now we'll create a Document Index to store your knowledge base:

1. Navigate to the [Document Indexes page](https://app.vellum.ai/document-indexes)
2. Click **Create Index** in the top right corner

![Document Indexes main page](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/ea06ee56-f484-47e2-abd8-b74cc2921674-document-indexes-page.png)

3. Name your index (e.g., "Countries") and configure the settings:

![Document Index creation dialog](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/ea06ee56-f484-47e2-abd8-b74cc2921674-create-document-index-dialog.png)

You can read more about [Document Index configuration options and chunking strategies](/product/documents/uploading-documents) in our documentation.

4. Click **Save** to create your index

### Step 6: Upload Documents

After creating your index, you'll see the upload interface:

![Document upload interface](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/ea06ee56-f484-47e2-abd8-b74cc2921674-document-upload-area.png)

Vellum supports various file types including:

* PDF documents
* Word documents (DOCX)
* Text files (TXT)
* CSV files
* PowerPoint presentations (PPTX)
* HTML files

Drag and drop your documents or click to select files for upload.

### Step 7: Preview Your Documents

Once uploaded, you can preview your documents to ensure they were processed correctly:

![Document preview interface](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/ea06ee56-f484-47e2-abd8-b74cc2921674-document-preview.png)

## Part 3: Implementing RAG Functionality

### Step 8: Restructure Your Workflow

Now we'll modify the workflow to include document search:

1. **Delete the existing connection** between Entrypoint and Prompt Node:
   * Click on the edge between nodes
   * Press **Backspace** or click the **Delete** icon

![Delete edge between nodes](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/ea06ee56-f484-47e2-abd8-b74cc2921674-delete-edge-workflow.png)

### Step 9: Add a Templating Node

We'll use a Templating Node to extract the most recent user message for our search query:

1. Create a **Templating Node** between the Entrypoint and Prompt Node

![Adding Templating Node](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/ea06ee56-f484-47e2-abd8-b74cc2921674-add-templating-node.png)

2. Configure the Templating Node:
   * Connect `chat_history` as an input variable
   * Use this template to extract the latest user message:

```jinja
{{ chat_history[-1].text }}
```

![Templating Node setup](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/ea06ee56-f484-47e2-abd8-b74cc2921674-templating-node-configuration.png)

3. **Optional**: Rename the node to "Current User Message" for clarity

4. Test the Templating Node by running the workflow:

![Templating Node output](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/ea06ee56-f484-47e2-abd8-b74cc2921674-templating-node-output.png)

### Step 10: Add a Search Node

1. Drag from the Templating Node to create a new connection and select **Search Node**
2. Configure the Search Node:
   * **Document Index**: Select your "Countries" index
   * **Search Query**: Connect to the "Current User Message" output

![Search Node setup](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/ea06ee56-f484-47e2-abd8-b74cc2921674-search-node-configuration.png)

### Step 11: Connect Search Results to the Prompt

1. Connect the Search Node to your Prompt Node
2. In the Prompt Node, add a new input variable of type **String**
3. Connect this input to the Search Node output

![Prompt Node with search input](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/ea06ee56-f484-47e2-abd8-b74cc2921674-prompt-node-with-search-input.png)

### Step 12: Insert Search Results into the Prompt

1. Place your cursor between the `<context>` tags in your prompt
2. Press the **/** key to open the variable insertion dropdown
3. Select the Search Node results to insert them into the context

![Search results insertion dropdown](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/ea06ee56-f484-47e2-abd8-b74cc2921674-insert-search-results-dropdown.png)

## Part 4: Testing Your RAG Chatbot

### Step 13: Run the Complete RAG Workflow

Now test your complete RAG implementation:

1. Ensure your chat history contains a question that can be answered from your documents
2. Run the workflow
3. Observe how the chatbot now provides context-aware responses based on your document content

![Final RAG workflow output](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/ea06ee56-f484-47e2-abd8-b74cc2921674-final-rag-workflow-output.png)

### Step 14: Test Edge Cases

Test your chatbot with various scenarios:

#### Questions Within Knowledge Base

Ask questions that can be answered using your uploaded documents. The chatbot should provide accurate, context-grounded responses.

#### Questions Outside Knowledge Base

Ask questions about topics not covered in your documents. The chatbot should respond with "Sorry, I'm unable to answer that."

#### Multi-turn Conversations

Test follow-up questions and conversation continuity using the Chat History tab.

## Advanced Enhancements

### Adding Source Citations

To make your RAG chatbot even more useful, consider implementing source citations. This will be covered in a future tutorial, but you can explore:

* Using metadata from search results
* Formatting citations in responses
* Providing document references

### Optimizing Search Performance

Fine-tune your RAG system by:

* Adjusting chunking strategies in your Document Index
* Experimenting with different search weights
* Implementing metadata filtering for more precise results

### Evaluation and Monitoring

Consider setting up:

* [RAG-specific evaluation metrics](/product/evaluation/evaluating-rag-pipelines)
* [Online evaluations](/product/evaluation/online-evaluations) for production monitoring
* Cost tracking for your workflow executions

## Key Takeaways

#### Hallucination Prevention

By constraining responses to provided context, RAG systems significantly reduce hallucinations

#### Modular Architecture

The workflow's modular design makes it easy to modify and extend functionality

#### Context Extraction

Using Templating Nodes to extract user queries enables precise document searches

#### Scalable Knowledge

Document Indexes can be updated independently without changing the workflow

## Next Steps

Now that you have a working RAG chatbot, consider exploring:

* **[Evaluating RAG Pipelines](/product/evaluation/evaluating-rag-pipelines)** - Learn how to measure and improve your RAG system's performance
* **[Advanced Chunking Strategies](/product/documents/uploading-documents)** - Optimize how your documents are processed and stored
* **[Metadata Filtering](/product/documents/metadata-filtering)** - Add more sophisticated search capabilities
* **[Workflow Deployment](/product/workflows/integrating)** - Deploy your chatbot to production

## Additional Resources

* [RAG System Architecture](/product/workflows/architectures/rag-system)
* [Search Node Documentation](/product/workflows/nodes/search-node)
* [Templating Node Guide](/product/workflows/nodes/templating-node)
* [Document Index Management](/product/documents/uploading-documents)
* [Prompt Engineering Best Practices](/product/prompts/prompt-engineering-in-vellum)