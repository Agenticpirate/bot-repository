> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Authentication

> Learn how to authenticate with the Vellum API using API tokens.

## Generating API Keys

The Vellum API uses API keys to authenticate requests. You can view and manage your API keys from the "Environments"
tab in your [Workspace settings](https://app.vellum.ai/organization?tab=workspaces\&workspace-settings-tab=environments).

**Environment-Scoped API Keys**: API keys are scoped to specific Environments (i.e. Development, Staging, Production). When you make an API call, it performs actions within the context of the Environment from which the API key was created. Make sure to use the appropriate API key for each Environment.

## Rotating API Keys

API Keys can be created from the [Workspace Settings](https://app.vellum.ai/organization?tab=workspaces\&workspace-settings-tab=environments) page.

To rotate your API key:

1. Select the appropriate Environment using the Environment picker
2. Create a new API key in the [Workspace Settings](https://app.vellum.ai/organization?tab=workspaces\&workspace-settings-tab=environments)
3. Update your applications to use the new API key
4. Delete the old API key

Each Environment maintains its own set of API keys. You'll need separate API keys for each of your environments (e.g. Development, Staging, and Production) to ensure proper isolation.

## Authentication

Authentication is performed using headers. You should include your API key as the value associated with the `X_API_KEY` header in your requests.

Note that all API requests must be made over HTTPS. Calls made over plain HTTP will fail. API requests without authentication will also fail.

## API Key Best Practices

The API keys you generate should be treated like passwords. Do not share your API keys in publicly accessible areas such as GitHub, client-side code, etc.