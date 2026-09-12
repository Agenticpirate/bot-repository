> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

`vellum workflows pull`

Used to pull Vellum resources from the Vellum application into the local SDK.

### Arguments

**`[module]`** `str`

The module to pull the workflow into. If not provided, a module will be generated based on the Workflow Sandbox ID.

---

**`--workflow-sandbox-id`** `str`

Pull the Workflow from a specific Sandbox ID. If not provided, the Workflow Sandbox ID defined in the `pyproject.toml`
associated with `[module]` will be used. Must be provided if `[module]` is not provided.

---

**`--workflow-deployment`** `str`

Pull the Workflow from a specific Deployment. Can use the name or the ID of the Deployment.

---

**`--include-json`** `bool`

Include the JSON representation of the Workflow in the pull response. Should only be used for debugging purposes.

---

**`--exclude-code`** `bool`

Exclude the code definition of the Workflow from the pull response. Should only be used for debugging purposes.

---

**`--strict`** `bool`

Fail immediately when encountering an error. By default, errors are collected and printed at the end of the pull.

---

**`--include-sandbox`** `bool`

Include a `sandbox.py` file in the pull response. This file will contain a `SandboxRunner` class that can be used to run the Workflow locally.

---

**`Example Usage`**

```bash title="Example Usage"
vellum workflows pull my.example
```