> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Role-Based Access Control (RBAC)

> Learn about the different user roles and their permissions in Vellum Workspaces.

Vellum uses Role-Based Access Control (RBAC) to manage user permissions within Workspaces. Each user in a Workspace is assigned a specific role that determines what actions they can perform.

## Available Roles

Vellum provides several predefined roles with different permission levels:

### Admin

Administrators have the highest level of permissions and can manage all aspects of a workspace, including:

* Delete workspace
* Update workspace general settings
* Update workspace user roles
* Create, delete, and manage API keys
* Create, update, and delete secrets
* Create, update, and delete provider credentials
* Update ML models

### Deployment Editor

Users with the Deployment Editor role can manage prompt deployments:

* Create prompt versions
* Create deployments
* Update deployments
* Delete deployments

### Document Index Editor

Document Index Editors can manage document indexes and their contents:

* Upsert documents
* Delete documents
* Create document indexes
* Update document indexes
* Delete document indexes

### Test Suite Editor

Test Suite Editors can manage test suites:

* Create test suites
* Update test suites
* Delete test suites

### Playground Editor

Playground Editors can work with sandboxes:

* Create sandboxes
* Update sandboxes
* Delete sandboxes

### Member

The Member role is the most restrictive role and has read-only access to the workspace. Members can view resources but cannot create, update, or delete them.

## Managing User Roles

Workspace administrators can manage user roles through the Workspace settings. To update a user's role:

1. Navigate to your Workspace settings
2. Find the user you want to update
3. Change their role using the dropdown menu
4. Save your changes

Only users with the Admin role can change user roles within a workspace.

## Best Practices

When assigning roles to users, follow the principle of least privilege:

* Assign the most restrictive role that still allows users to perform their required tasks
* Regularly review user roles and remove unnecessary permissions
* Limit the number of users with Admin privileges

By carefully managing user roles, you can ensure that users have access to the resources they need while maintaining the security of your workspace.