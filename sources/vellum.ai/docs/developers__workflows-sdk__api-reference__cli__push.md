> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

`vellum workflows push`

Used to push Vellum resources defined with the SDK to the Vellum application.

The push feature has different levels of support for different components. See the [Push Feature Status](/developers/workflows-sdk/api-reference/push-feature-status) page for more details.

### Arguments

**`[module]`** `str`

The module to push from local. If not provided, the first module defined in the `pyproject.toml` file will be used.

---

**`--workflow-sandbox-id`** `str`

The specific Workflow Sandbox ID to use when pushing. Must either be already associated with the provided module or be available for use. The Workflow Sandbox must also exist in Vellum.

---

**`--workspace`** `str`

The specific Workspace config to use when pushing. If not provided, the default Workspace config uses the `VELLUM_API_KEY` environment variable.

---

**`--deploy`** `bool`

If provided, the Workflow will be automatically deployed once pushed to Vellum.

---

**`--deployment-label`** `str`

The label to use for the deployment. Can only be provided if `--deploy` is also provided.

---

**`--deployment-name`** `str`

The name to use for the deployment. Can only be provided if `--deploy` is also provided.

---

**`--deployment-description`** `str`

The description to use for the deployment. Can only be provided if `--deploy` is also provided.

---

**`--release-tag`** `List[str]`

The release tags to use for the deployment. Can only be provided if `--deploy` is also provided.

---

**`--dry-run`** `bool`

Validates the workflow without actually pushing it to Vellum. Useful for checking if your workflow can be pushed successfully. Also returns an expected diff.

---

**`--strict`** `bool`

Fail immediately when encountering an error. By default, errors are collected and printed at the end of the push.

---

**`Example Usage`**

```bash title="Example Usage"
vellum workflows push my.example --deploy --deployment-label "My Deployment" --release-tag "v1.0.0"
```