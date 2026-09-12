> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Final Output Node

> Exposes values you can use in your application, you may have more than one!

The Final Output Node represents the end of your workflow. Your workflow may have multiple Final Output Nodes if the execution has been branched off from an upstream node.

A name for the output and an output type must be configured here because the response streamed back from the endpoint (when the workflow is taken to production) has this information included.

## Expression Inputs

Final Output Nodes support Expression inputs, allowing you to do more with the values you reference. Instead of simply passing through a value from another node, you can write expressions to transform or extract specific data.

For example, you can:

* Access specific attributes from JSON outputs using the accessor syntax
* Perform simple transformations on values
* Combine multiple values into a single output

This is particularly useful when working with structured outputs from Prompt Nodes where you need to extract specific fields from a JSON response.

### Using Fallbacks with Multiple Execution Paths

When your workflow has multiple execution paths that need to converge at a single Final Output Node, you can use the fallback operator (`??`) to select the appropriate value based on which path was executed.

For example, in a workflow that classifies input and then routes to different Prompt Nodes based on the classification, you can use the fallback operator to select the output from whichever path was executed:

```
Haiku about Dogs ?? Haiku about Cats
```

This expression will return the value from "Haiku about Dogs" if it exists, otherwise it will return the value from "Haiku about Cats".

Here's an example workflow that randomly classifies input as either "dog" or "cat", then routes to the appropriate Prompt Node to generate a haiku about that animal:

![Example workflow with classification and routing](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/a46e00b6-67ca-4c52-aeab-646fc87f802e-final-output-node-example.png)

The Final Output Node uses the fallback operator to select the output from whichever path was executed:

![Final Output Node with fallback operator](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/a46e00b6-67ca-4c52-aeab-646fc87f802e-final-output-node-fallback-example.png)

The routing is controlled by Ports on the Prompt Node, which direct the flow based on the classification output:

![Prompt Node with conditional ports](https://promptless-customer-doc-assets.s3.amazonaws.com/docs-images/org_2q2HPCBfINPu2XGmdXdc8rjpkpW/a46e00b6-67ca-4c52-aeab-646fc87f802e-final-output-node-ports-example.png)

This pattern is especially useful when:

* You have conditional execution paths that produce similar outputs
* You want to simplify your workflow by using a single Final Output Node
* You need to handle cases where only one of several possible nodes will execute