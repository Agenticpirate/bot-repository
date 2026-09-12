> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Escalation to a Human

> Automatically route sensitive or complex messages to human operators

If you're building an agent that answers questions coming from users (e.g., a support chatbot), you may want to set up rules such that anytime the incoming message from a user is sensitive (e.g., the user is angry or in a dangerous situation) then the LLM automatically escalates it to a human. With Workflows you'd be able to build that out real quick.

## Implementation Steps

### Add a classification prompt

Use a Prompt Node to filter out incoming messages

### Add a downstream prompt

Use another prompt node for the LLM to respond to messages that don't need to be escalated

### Add and connect two Final Output Nodes

Connect the classification prompt outputs to two separate Final Output Nodes

### Set up variables and hit Run!