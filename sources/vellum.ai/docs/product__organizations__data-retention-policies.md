> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

## Data Retention Policies

Enterprise customers can configure how long Vellum retains monitoring data for their organization. This feature helps organizations comply with their internal data governance policies and regulatory requirements.

### Overview

Data retention policies allow you to:

* Control how long monitoring data is stored in Vellum
* Choose between indefinite retention or time-limited retention
* Set specific retention periods based on your organization's needs

### Configuring Data Retention

To configure data retention policies:

1. Navigate to the Organization Settings page
2. Go to the "Advanced Settings" section
3. Find the "Monitoring Data Retention" setting
4. Click "Set Up" to configure your retention policy

![Data Retention Settings in Advanced Settings](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/44323b60-e474-4bc1-a2e5-abe070181f58-data-retention-settings.png)

### Available Options

When configuring data retention, you can choose from the following options:

![Data Retention Options](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/44323b60-e474-4bc1-a2e5-abe070181f58-data-retention-options.png)

#### Forever (Default)

Monitoring data will be persisted and retained indefinitely unless specified otherwise later on. This is the default setting if you do not configure a data retention policy.

#### Time-Limited Retention

You can specify that monitoring data should be automatically deleted after a specific period. Available time periods include:

* 30 days
* 60 days
* 90 days
* 365 days

When you select time-limited retention, monitoring data will be persisted but automatically deleted after the specified number of days. Once monitoring data has been deleted, there is no way to recover it.

### Enterprise Feature

Data retention policies are available exclusively to customers on the Enterprise tier. If you're interested in this feature, please contact your account representative for more information about upgrading to the Enterprise tier.

### Best Practices

* Align your Vellum data retention policy with your organization's broader data governance policies
* Consider regulatory requirements that may apply to your industry or use case
* For sensitive applications, choose the shortest retention period that meets your operational needs
* Regularly review your data retention settings to ensure they remain appropriate as your usage evolves