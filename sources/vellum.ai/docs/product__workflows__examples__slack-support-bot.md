> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Slack Support Bot, Cites Sources using Multiple Indexes

> Learn how to build a Slack support bot that cites sources using multiple indexes.

Concepts: Document Indexes, Metadata, Zapier, Slack, Citing Sources, Combining Sources

#### Tip: Zapier API Calls

Passing JSON Arrays in Zapier can be tricky. Instead, you can use Code Blocks to make it easier.

You can use the follow code snippet as inspiration for your own API calls with Zapier Code Blocks and Python.

```python
  import requests

  # Replace with your actual Vellum API key
  VELLUM_API_KEY = "..."

  url = "https://predict.vellum.ai/v1/execute-workflow"

  headers = {
      "Content-Type": "application/json",
      "X_API_KEY": VELLUM_API_KEY
  }

  data = {
      "workflow_deployment_name": "vellum-customer-support-q-a-demos",
      "release_tag": "LATEST",
      "inputs": [
          {
              "type": "STRING",
              "name": "question",
              "value": input_data["user_question"] # whatever Zapier values you want to use here
          }
      ]
  }

  response = requests.post(url, headers=headers, json=data)

  # Print the response from the server
  print(response.status_code)
  print(response.json())

  return response.json()
```