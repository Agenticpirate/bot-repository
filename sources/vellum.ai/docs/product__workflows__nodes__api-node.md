> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# API Node

> Make an HTTP request to an API endpoint.

The API Node invokes an API endpoint and returns back the status code, raw output, and JSON output if applicable. These APIs can be either publicly accessible or privately defined within your backend through the help of Authorization headers and Secrets.

## API Node Interface

The API Node provides a simple interface for configuring your API requests:

![API Node](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/c96366ea-6ab5-4593-b08e-01a9f64c1fd5-api_node_1.png)

When you open the API Node, you'll see a detailed configuration interface where you can define your request:

![API Node Configuration](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/c96366ea-6ab5-4593-b08e-01a9f64c1fd5-api_node_2.png)

## Key Features

* **HTTP Methods**: Support for standard methods (GET, POST, PUT, DELETE, etc.)
* **Request Body**: Configure JSON or form data payloads
* **Authorization**: Multiple auth types including None, Bearer Token, and API Key
* **Headers**: Add custom headers to your requests
* **Dynamic URLs**: Create flexible API calls using variables
* **Timeout Configuration**: Set maximum request duration to prevent workflows from hanging on slow or unresponsive external services

#### Tip: Creating Dynamic URLs

You can use a Templating Node and the "Dynamic" field of an API Node to quickly and flexibly make API calls in your Workflows. See the example below for more details. Notice how we do string concatenation in the Templating Node using Jinja2's `~` syntax.