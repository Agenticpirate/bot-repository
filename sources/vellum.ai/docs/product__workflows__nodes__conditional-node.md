> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Conditional Node

> Branch your workflow based on a condition, also useful for error handling.

Conditional Nodes are extremely powerful because they can help you diverge the execution path of your Workflow based on the results of an upstream node. The Conditional Node supports as many if-else-if conditions as you'd like and the rules can be grouped / nested within each other.

The number of exit options from a conditional node equal the number of if-else-if conditions created on the node

![Conditional Node](https://storage.googleapis.com/vellum-public/help-docs/conditional_node.png)

#### Tip - Equality Checking Templating Nodes

See our [tips about invisible whitespace in Jinja](/product/workflows/node-types#tips---using-jinja)

![Wrong Way To Check Equality From Templating Nodes](https://storage.googleapis.com/vellum-public/help-docs/conditionals_jinja_gotchas_wrong_way.png)

The issue in the above check is that we're not using the Jinja2 syntax to remove unintentional whitespace: `{%-` and `{{-` rather than `{%` or `{{`

![Right Way To Check Equality From Templating Nodes](https://storage.googleapis.com/vellum-public/help-docs/conditionals_jinja_gotchas_right_way.png)

You can see here that adding the `-` character fixes the issue and gets the correct branch to execute after the conditional.