> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Installation

> Install the Vellum Workflows SDK and set up your development environment.

This guide will walk you through installing the Vellum Workflows SDK and setting up your development environment.

## Prerequisites

The Vellum Workflows SDK requires Python 3.9 or higher. If you don't have Python installed, you can download it from [python.org](https://www.python.org/downloads/).

## Installation

#### Install uv (Recommended)

We recommend using `uv` for package & environment management. If you don't have `uv` installed:

```bash
# On macOS and Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# On Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# Or using pip
pip install uv
```

Learn more about [uv here](https://docs.astral.sh/uv/)

#### Install Python

If you prefer using Python and pip::

1. Visit [python.org/downloads](https://www.python.org/downloads/)
2. Download Python 3.9 or higher for your operating system

### Install the Vellum Workflows SDK

#### Using uv (Recommended)

```bash
uv add vellum-ai
```

#### Using pip

```bash
pip install vellum-ai
```

## Environment Setup

### Set your Vellum API Key

To use most out-of-the-box Nodes and to push/pull to/from the Vellum UI, you'll need a Vellum API key.

1. **Get your API key**: You can find this in [Workspace Settings](https://app.vellum.ai/organization?tab=workspaces\&workspace-settings-tab=environments) in Vellum. Note that API keys are Environment-scoped.
2. **Set the environment variable**:

#### macOS/Linux

```bash
export VELLUM_API_KEY=your-api-key-here
```

To make this permanent, add it to your shell profile:

```bash
echo 'export VELLUM_API_KEY=your-api-key-here' >> ~/.bashrc
# or for zsh users:
echo 'export VELLUM_API_KEY=your-api-key-here' >> ~/.zshrc
```

#### Windows

```cmd
set VELLUM_API_KEY=your-api-key-here
```

To make this permanent, use:

```cmd
setx VELLUM_API_KEY "your-api-key-here"
```

### Create a Virtual Environment (Optional but Recommended)

It's good practice to create a virtual environment for your project:

#### Using uv

```bash
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

#### Using venv

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

## Verify Installation

Test that everything is working correctly:

```python
from vellum.workflows import BaseWorkflow
from vellum.workflows.nodes import BaseNode

print("Vellum Workflows SDK installed successfully!")
```

## Next Steps

Now that you have the SDK installed, you can:

* [Get started with the Quickstart guide](./quickstart)
* [Learn about Core Concepts](./core-concepts)
* [Explore Examples](./examples)

## Need Help?

If you don't have a Vellum account yet, you can [sign up for free here](https://app.vellum.ai/signup?f=wsdk\&utm_source=docs\&utm_medium=installation\&utm_campaign=sdk).

For additional support, visit our [support page](/home/intro/support).