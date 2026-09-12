> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

## Authentication

To authenticate the Vellum CLI, you'll need a Vellum API Key. If you don't already have one, you can create a new API key in [Workspace Settings](https://app.vellum.ai/organization?tab=workspaces\&workspace-settings-tab=environments). Remember that API keys are Environment-scoped, so make sure to use the appropriate key for your target Environment.

Next, ensure that your project contains a `.env` file in its root directory with the following environment variable:

```sh
VELLUM_API_KEY=<vellum-api-key>
```

If you're using a self-hosted VPC instance of Vellum, you'll also need to set `VELLUM_API_URL` to point to your instance:

```sh
VELLUM_API_URL=<your-vpc-instance-url>
```

You can verify that you're all set up correctly by running `vellum ping`.

## Configuring Your Project

All Vellum configuration is done via the `pyproject.toml` file. The Vellum CLI will automatically read any
`[tool.vellum]` table sections in the file when a command is run.

### Workflows

To explicitly define Workflows in your project and map them to resources in Vellum, you can add a
`[[tool.vellum.workflows]]` table to your `pyproject.toml` file:

```toml
[[tool.vellum.workflows]]
module = "examples.my_workflow"
workflow_sandbox_id = "<workflow-sandbox-id>"
```

Now, when you run `vellum workflows push examples.my_workflow`, Vellum will know exactly which local Workflow to
source from and which Workflow Sandbox in Vellum to update.

The push feature has different levels of support for different components and workflow types. See the [Push Feature Status](/developers/workflows-sdk/api-reference/push-feature-status) page for more details on current limitations and capabilities.

#### Multiple Workflows

You may want to define multiple Workflows in your project and configure them within the same `pyproject.toml` file.
You can use the double bracket syntax in `pyproject.toml` for this:

```toml
[[tool.vellum.workflows]]
module = "examples.my_workflow"
workflow_sandbox_id = "<workflow-sandbox-id-1>"

[[tool.vellum.workflows]]
module = "examples.my_other_workflow"
workflow_sandbox_id = "<workflow-sandbox-id-2>"
```

#### Pulling Workflows

The configuration above works not only for pushing Workflows from local to Vellum, but also for pulling them from
Vellum to a local code representation. If you have a Vellum Workflow that is already defined in Vellum, you can
specify which module to pull the Workflow into using the same configuration above.

Once configured, you can run `vellum workflows pull examples.my_workflow` to pull a specific Workflow into your
local project.

### Multiple Workspaces

In some cases, you may want to pull a Workflow from one Workspace and then push it to another.
For example, you might want to use Workspaces to separate development, staging, and production environments, define
your Workflows as code, and then manage when changes make it to each environment.

Each Workspace uses its own Vellum API key when authenticating requests. This means that with some configuration,
you can set up multiple Workspaces, each with a reference to a different API key. To do this, add a
`[[tool.vellum.workspaces]]` table to your `pyproject.toml` file. Here's an example showing the setup for
`staging` and `production` Workspaces:

```toml
[[tool.vellum.workspaces]]
name = "staging"
api_key = "STAGING_VELLUM_API_KEY"

[[tool.vellum.workspaces]]
name = "production"
api_key = "PRODUCTION_VELLUM_API_KEY"
```

This configuration will allow you to use the `staging`/`production` identifiers with any CLI command where the
`--workspace` argument is supported. For example:

```bash
vellum workflows pull --workspace staging
vellum workflows push --workspace production
```

The CLI will look up the value of the environment variable specified by `api_key` then use
that to authenticate with Vellum. Note that `api_key` is *not* the value of the API key itself, but rather the name
of the environment variable that contains the API key.

### Ignoring Files

The `pull` command will do a full directory replace, meaning it will overwrite and delete any files in the local
directory that are not part of the Vellum Workflow's code generation.

To protect specific files or directories from being overwritten, you can add them to the `ignore` list in your
`pyproject.toml` file:

```toml
[[tool.vellum.workflows]]
module = "examples.my_other_workflow"
workflow_sandbox_id = "<workflow-sandbox-id>"
ignore = "tests/*"
```

This `ignore` command accepts either a single glob pattern or a list of glob patterns. As shown above, this can be
useful in situations where you want to colocate related files with the Workflow, such as tests.

### State Lock File

The `pyproject.toml` file is used for user-defined configuration. However, Vellum also uses a `vellum.lock.json` file to
track the state of your project. This file is automatically generated and maintained when you run `vellum workflows
push` or `vellum workflows pull`. You should **not** modify this file manually.

The lock file is updated automatically as part of running various commands in the Vellum CLI (for example, when
running `vellum workflows pull --workflow-sandbox-id <id>`). Once a Workflow has been added to a `vellum.lock.json`
file, it can be referenced by module name in `push` and `pull` commands as if it were defined in the
`[[tool.vellum.workflows]]` table, even if it wasn't yet explicitly defined in the `pyproject.toml` file.

### Integration w/ mypy

The SDK supports extensive static type checking support via [mypy](https://mypy.readthedocs.io/en/stable/). To use the mypy plugin for the SDK, you can add the following to your `pyproject.toml` file:

```toml
[tool.mypy]
plugins = ["vellum.plugins.vellum_mypy"]
```