> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Client SDK & API Reference

> Dive into Vellum's API docs for endpoint details, parameters, and responses. Use our official Python, Node, or Go clients for stable interaction.

Welcome to Vellum's Client SDK and API documentation! Here you'll find information about the various HTTP endpoints available to you,
as well as the requests and responses that they accept and return.

We'll be exposing more and more of our APIs over time as they stabilize. If there is some action you can perform
via the UI that you wish you could perform via API, please let us know and we can expose the relevant API here.

### API Stability

Some of the APIs documented within are undergoing active development. Use the  and&#x20;
tags to differentiate between those that are stable and those that are not. GA stands for generally available.

### Base URLs

Some endpoints are hosted separately from the main Vellum API and therefore have a different base url. If this is
the case, they will say so in their description.

#### Cloud-hosted Vellum

For customers using Vellum's cloud-hosted offering, unless otherwise specified, all endpoints use `https://api.vellum.ai` as their base URL.

#### Self-hosted/VPC Vellum

For customers who self-host Vellum in a VPC environment, your base URLs will be different from the cloud-hosted version. If your Vellum application URL is `https://app.vellum.company.com`, then your API base URL will typically be `https://api.vellum.company.com`.

When configuring the Vellum client SDKs in a self-hosted environment, you'll need to specify the correct base URLs. For example, in the Python SDK:

```python
from vellum import Vellum, VellumEnvironment

# For self-hosted/VPC deployments
client = Vellum(
    api_key="your-api-key",
    environment=VellumEnvironment(
        default="https://api.vellum.company.com",
        predict="https://api.vellum.company.com",
        documents="https://api.vellum.company.com"
    )
)
```

If you're unsure about the correct base URLs for your self-hosted deployment, please contact your Vellum administrator or reach out to Vellum support.

### Official API Clients

Vellum maintains official API clients for Python, Node/Typescript, and Go. We recommend using these clients to interact
with all stable endpoints. You can find them here:

#### [Python](https://github.com/vellum-ai/vellum-python-sdks/tree/main/src/vellum/client)

#### [Node/Typescript](https://github.com/vellum-ai/vellum-client-node/)

#### [Go](https://github.com/vellum-ai/vellum-client-go/)