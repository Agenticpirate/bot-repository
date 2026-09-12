> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# External Workflow Server

> Running Vellum Workflows on your own company's infrastructure

*Note: This capability is under active development and considered to be in Beta. If you're interested in deploying your organization's Workflow, please reach out to Support.*

In this tutorial, we show you how to deploy your Workflow to your own infrastructure. For the purposes of this tutorial, we will
use AWS as the example cloud provider, but these steps should apply to any cloud provider that supports VM instances that can run
Docker Images.

## 1. Stand up the VM Instance

First, create an EC2 Instance in your AWS account. Be sure to:

* create a Key Pair so that you could SSH in, or have some way to run setup commands inside of the instance
* ensure the instance belongs to a security group with sufficient inbound rules to allow HTTP requests on port 8000.

![](https://storage.googleapis.com/vellum-public/help-docs/external-workflow-server/aws-instance.png)

## 2. Setup Docker

Install Docker on the instance. Run the following commands to do so for an Amazon Linux Image:

```bash
sudo yum update -y
sudo yum install docker -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user
```

After performing the last command, you will need to leave and return to the instance for the credentials to refresh.

## 3. Pull Vellum's Workflow Server

Now, we will pull the latest Docker Image from Vellum's Workflow Server. You can pull the `latest` tag, or
a specific server version. Server versions match 1:1 with ones that get posted on the SDK [releases](https://github.com/vellum-ai/vellum-python-sdks/releases).

```bash
docker pull vellumai/python-workflow-runtime:1.10.4
```

## 4. Run the server

Now that the image is in the EC2 instance, you can run the server with:

```bash
docker run -p 8000:8000 vellumai/python-workflow-runtime:1.10.4
```

Two logs that you'll want to see are one specifying `Running with SDK version: 1.10.4` and one alerting that the server is `Listening at: http://0.0.0.0:8000` to confirm
that the server is running properly

## 5. Deploy the Workflow to Vellum

By deploying the Workflow to Vellum, you create an deployment entry for which monitoring data could be sent to:

```bash
vellum workflows push demo --deploy
```

## 6. Execute the Workflow!

There are some notable differences when invoking Workflows against the Vellum Workflow Server vs the traditional Vellum API. While we work to consolidate the two, you can use
the following script to invoke it:

```python
import json
from uuid import uuid4
import requests
import os
from pydantic import TypeAdapter
from vellum.client.types import WorkflowEvent

workflow_event_type: TypeAdapter[WorkflowEvent] = TypeAdapter(
    WorkflowEvent
)


def main():
    """
    This script is assumed to be in the same directory as 
    the `workflow.py` file.
    """
    
    parent_dir = os.path.dirname(os.path.abspath(__file__))
    files = {}
    current_file = os.path.basename(__file__)

    for filename in os.listdir(parent_dir):
        filepath = os.path.join(parent_dir, filename)
        if not os.path.isfile(filepath):
            continue
        if not filename.endswith(".py"):
            continue
        if filename == current_file:
            continue

        with open(filepath, "r") as f:
            files[filename] = f.read()

    # grab this from the EC2 dashboard
    # Should be `http://{public_ip_address}:8000`
    base_url = os.environ["VELLUM_API_URL"] 
    execution_id = str(uuid4())

    deployment_context = {
        "type": "WORKFLOW_RELEASE_TAG",
        "span_id": execution_id,
        "release_tag_id": str(uuid4()),
        "release_tag_name": "LATEST",
        "external_id": None,
        "metadata": None,
        # Replace these with the actual values from the workflow deployment
        "deployment_name": "demo",
        "deployment_id": "85f9cfa9-8580-4b0d-bbf6-ba09185267da",
        "deployment_history_item_id": "f2a57a88-5a3f-422b-9fe6-85dee0207c7b",
        "workflow_version_id": '0c08e431-2f77-4f4e-bd67-706a590e8964',
    }

    response = requests.post(
        f"{base_url}/workflow/stream",
        json={
            "files": files,
            "environment_api_key": os.getenv("VELLUM_API_KEY"),
            "module": __name__,
            "execution_context": {
                "trace_id": str(uuid4()),
                "parent_context": deployment_context,
            },
            # Don't worry about the value of these fields.
            # They are currently required but considered legacy and 
            # will be removed in the future.
            "execution_id": execution_id,
        },
        timeout=10,
    )
    
    final_output = None
    error = None
    for line in response.iter_lines():
        if not line:
            continue
        if b"vembda.execution" in line: 
            continue
        if b"END" == line:
            continue

        event = workflow_event_type.validate_json(line)
        if event.name == "workflow.execution.rejected":
            error = event.body.error
            continue

        if event.name != "workflow.execution.fulfilled":
            continue

        final_output = event.body.outputs['final']

    if error:
        raise Exception(f"[{error.code}] {error.message}")
    
    print(f"Success! Final output: {final_output}")
    return final_output


if __name__ == "__main__":
    main()
```