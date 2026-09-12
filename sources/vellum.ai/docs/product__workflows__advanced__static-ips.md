> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Static IPs

When making outbound requests to external services from Vellum Workflows, your requests will originate from a set of static IP addresses. This is important if the external services you're connecting to require IP allowlisting for security purposes.

## Use Cases

Some users may make outbound requests to external services via:

* **Code Execution Nodes**
* **API Nodes**
* **Custom functions included in Docker Containers**

Many external services implement IP-based access controls and require allowlisting of IP addresses. Examples of such services include:

* Google Places API
* OAuth services
* Financial data providers
* Enterprise security systems
* Corporate APIs with IP-based access controls
* Regulated industry APIs (healthcare, finance)
* Internal company services behind firewalls

## Vellum SaaS IP Addresses

For Vellum SaaS / non-VPC customers, Vellum rotates outbound requests across the following 4 IP addresses:

```
35.223.70.187
34.135.20.59
34.71.56.1
35.224.87.203
34.29.64.81
```

If you're using Vellum in a VPC environment, you'll have different IP addresses specific to your VPC configuration. Contact your Vellum representative for details about your VPC setup.

## Configuring External Services

When configuring allowlists on your external services, you should add all four IP addresses to ensure uninterrupted service. Here are some common scenarios:

### API Gateway Configuration

If you're using an API gateway or management platform, add Vellum's IP addresses to your allowlist configuration:

```json
{
  "allowedIPs": [
    "35.223.70.187",
    "34.135.20.59",
    "34.71.56.1",
    "35.224.87.203",
    "34.29.64.81"
  ]
}
```

## Troubleshooting Connection Issues

If you're experiencing connection issues from Workflow nodes to your external services:

1. Verify that all four Vellum IP addresses are properly allowlisted
2. Check that your service is accepting connections on the expected ports
3. Ensure any authentication credentials being used are valid
4. Verify general connectivity to your API endpoint using a tool like Postman or cURL from your own computer

For enterprise customers with specific security requirements, Vellum offers VPC solutions with dedicated IP ranges. Contact your team's VPC / infrastructure administrator for more information.