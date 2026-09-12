> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Document Data Extraction

> Learn how to build a Data Extraction Workflow that extracts key information from documents stored in Vellum and outputs the data in JSON format.

In this example, we'll build a Data Extraction Workflow that fetches documents from a Vellum Document Index, extracts key information from unstructured text, and generated structured JSON data using Pydantic models. This is useful for automating data extraction from PDFs (insurance policies, reports, lesson plans), spreadsheets, and more.

Ultimately, we'll end up with a Workflow that performs the following steps:

1. `RetrieveData`: retrieves document content using the Vellum API
2. `DataExtractionNode`: processes the document content and extracts structured data in JSON format

**`workflow.py`**

```python title="workflow.py"
class DataExtractionWorkflow(BaseWorkflow[Inputs, BaseState]):
    graph = RetrieveData >> DataExtractionNode

    class Outputs(BaseWorkflow.Outputs):
        extracted_data = DataExtractionNode.Outputs.text

    ## Running it
    workflow = DataExtractionWorkflow()
    terminal_event = workflow.run(
        inputs=Inputs(
            document_id="b9442ad1-ee4c-4582-8690-b6375d9b8611"
        )
    )

## Output:
print(terminal_event.outputs.extracted_data)

"""
{
    "Example Table": "Description of test results",
    "Disability Category": {
        "blind": {
            "participants": 25,
            "Ballots Completed": 20,
            "Ballots Incomplete/Terminated": 5,
            "accuracy": "95% (n=20)",
            "Time to Complete": "15-20 minutes"
        },
        "Low Vision": {
            "participants": 30,
            "Ballots Completed": 28,
            "Ballots Incomplete/Terminated": 2,
            "accuracy": "92% (n=28)",
            "Time to Complete": "12-18 minutes"
        },
        ...
    }
}
"""
```

You can get document IDs from the [Vellum UI](/product/documents/uploading-documents) or via an `external_id` when [uploading documents](/developers/client-sdk/documents/upload-document).

# Setup

## Install Vellum

```bash
pip install vellum-ai
```

## Create your Project

In this example, we'll structure our project like this:

```sh
document_data_extraction/
├── sandbox.py
├── workflow.py
├── inputs.py
├── __init__.py
└── nodes/
    ├── __init__.py
    ├── retrieve_data.py
    └── data_extraction.py
```

Folder structure matters! Vellum relies on this structure to convert between UI and code representations of the graph. If you don't want to use the UI, you can use whatever folder structure you'd like.

## Define Workflow Inputs

**`inputs.py`**

```python title="inputs.py"
from vellum.workflows.inputs.base import BaseInputs

class Inputs(BaseInputs):
    document_id: str
```

The workflow takes a single input: the ID of the document to process. This ID is used to retrieve the document's content from Vellum's API.

# Build the Nodes

### Retrieve Data Node

This node handles retrieving document content from Vellum's API. It polls until the document is ready to be used, in case it has been recently uploaded and is still being indexed. Files are usually available within a few seconds.

**`nodes/retrieve_data.py`**

```python title="nodes/retrieve_data.py"
import os
import requests
from vellum import Vellum
from vellum.workflows.errors import WorkflowErrorCode
from vellum.workflows.exceptions import NodeException
from vellum.workflows.nodes import BaseNode, RetryNode

api_key = os.getenv("VELLUM_API_KEY")
if api_key is None:
    raise ValueError("VELLUM_API_KEY environment variable is not set")
client = Vellum(api_key=api_key)

@RetryNode.wrap(max_attempts=20, retry_on_error_code=WorkflowErrorCode.USER_DEFINED_ERROR)
class RetrieveData(BaseNode):
    document_id = Inputs.document_id

    class Outputs(BaseNode.Outputs):
        document_content: str

    def run(self) -> BaseNode.Outputs:
        # Retrieve the document status from Vellum
        try:
            response = client.documents.retrieve(id=self.document_id)
            indexing_state = response.document_to_document_indexes[0].indexing_state
            processing_state = response.processing_state
            text_file_url = response.document_to_document_indexes[0].extracted_text_file_url

            if indexing_state == "INDEXED":
                return self.Outputs(document_content=requests.get(text_file_url).text)
            elif indexing_state == "FAILED" or processing_state == "FAILED":
                raise NodeException("Indexing or processing failed")

            raise NodeException("Document processing not complete yet.", retry_on_error_code=WorkflowErrorCode.USER_DEFINED_ERROR)
        except Exception as e:
            raise NodeException(f"An error occurred: {str(e)}")
```

This node subclasses `BaseNode` and implements a custom `run()` method to:

* Check document processing status
* Retrieve document content if processing is complete
* Retry while the document is still being indexed
* Throw errors if the document processing fails

### Data Extraction Node

This node extracts structured data from the processed document content according to a Pydantic model schema.

**`nodes/data_extraction.py`**

```python title="nodes/data_extraction.py"
from pydantic import BaseModel, Field
from vellum import ChatMessagePromptBlock, JinjaPromptBlock, PromptParameters
from vellum.workflows.nodes import InlinePromptNode

# Define Pydantic models to match the JSON structure
class CategoryMetrics(BaseModel):
    participants: int = Field(..., description="Number of participants in the category.")
    ballots_completed: int = Field(..., alias="Ballots Completed", description="Number of ballots completed.")
    ballots_incomplete_terminated: int = Field(
        ..., alias="Ballots Incomplete/Terminated", description="Number of ballots incomplete or terminated."
    )
    accuracy: str = Field(..., description="Accuracy percentage with sample size.")
    time_to_complete: str = Field(..., alias="Time to Complete", description="Time taken to complete ballots.")

class ExtractedSchema(BaseModel):
    example_table: str = Field(..., alias="Example Table", description="Description of the table.")
    disability_category: DisabilityCategory = Field(..., alias="Disability Category")

class DataExtractionNode(InlinePromptNode):
    ml_model = "gpt-4o-mini"
    blocks = [
        ChatMessagePromptBlock(
            chat_role="SYSTEM",
            blocks=[
                JinjaPromptBlock(
                    template="""Analyze the following document content and extract all identifiable key-value pairs. Present the extracted information in JSON format, ensuring compliance with the following schema:
<document_content>
{{ document_content }}
</document_content>
Extracted Data (in JSON format):
""",
                ),
            ],
        ),
    ]
    prompt_inputs = {"document_content": RetrieveData.Outputs.document_content}
    parameters = PromptParameters(
        temperature=0,
        max_tokens=1000,
        top_p=1,
        custom_parameters={
            "json_schema": {"name": "data_extraction_schema", "schema": ExtractedSchema.model_json_schema()}
        },
    )
```

This node uses:

* Pydantic models to define the expected JSON structure
* An `InlinePromptNode` to process the document content with an LLM
* Custom prompt parameters to ensure consistent, structured output

# Running the Workflow

## Using the Sandbox Runner

The sandbox runner is ideal for testing and development. It enables you to execute the workflow locally using sample inputs, providing a quick way to validate functionality.

You can run the sandbox runner by running the following command: `python -m basic_rag_chatbot.sandbox 0` (where `0` is the index of the Scenario you want to run).

**`sandbox.py`**

```python title="sandbox.py"
from vellum.workflows.sandbox import WorkflowSandboxRunner
from .inputs import Inputs
from .workflow import DataExtractionWorkflow

if __name__ != "__main__":
    raise Exception("This file is not meant to be imported")

runner = WorkflowSandboxRunner(
    workflow=DataExtractionWorkflow(),
    inputs=[
        Inputs(document_id="b9442ad1-ee4c-4582-8690-b6375d9b8611"),
    ],
)

runner.run()
```

The sandbox runner is useful for testing and development, allowing you to run the workflow locally with sample inputs.

# Integration into Project

### Instantiate the Workflow

```python
## From any file / function from which you want to reference the Workflow

# Required import (the file imported from depends on your folder structure)
# from .workflow import DataExtractionWorkflow

workflow = DataExtractionWorkflow()
```

### Invoke the Workflow and Output the Results

```python
## From any file / function from which you want to run the Workflow

# Required imports (the file imported from depends on your folder structure)
# from .inputs import Inputs

terminal_event = workflow.run(
    inputs=Inputs(
        document_id="b9442ad1-ee4c-4582-8690-b6375d9b8611"
    )
)
## Output:
print(terminal_event.outputs.extracted_data)

"""
{
    "Example Table": "Accessibility Testing Results Summary",
    "Disability Category": {
        "blind": {
            "participants": 25,
            "Ballots Completed": 20,
            "Ballots Incomplete/Terminated": 5,
            "accuracy": "95% (n=20)",
            "Time to Complete": "15-20 minutes"
        },
        "Low Vision": {
            "participants": 30,
            "Ballots Completed": 28,
            "Ballots Incomplete/Terminated": 2,
            "accuracy": "92% (n=28)",
            "Time to Complete": "12-18 minutes"
        },
        "dexterity": {
            "participants": 22,
            "Ballots Completed": 19,
            "Ballots Incomplete/Terminated": 3,
            "accuracy": "89% (n=19)",
            "Time to Complete": "18-25 minutes"
        },
        "mobility": {
            "participants": 28,
            "Ballots Completed": 25,
            "Ballots Incomplete/Terminated": 3,
            "accuracy": "91% (n=25)",
            "Time to Complete": "15-22 minutes"
        }
    }
}
"""
```

# Conclusion

In this tutorial, we've built a document processing workflow that can:

* Retrieve documents from Vellum's API
* Extract structured data using LLMs
* Validate output against a predefined schema

Looking forward, we can:

* Add validation nodes to verify extracted data
* Implement retry logic for failed extractions
* Add post-processing nodes for data cleanup
* [Deploy to Vellum](/developers/workflows-sdk/api-reference/cli#push) for production use
* Version control the workflow with the rest of our project
* Continue building the graph in the Vellum UI