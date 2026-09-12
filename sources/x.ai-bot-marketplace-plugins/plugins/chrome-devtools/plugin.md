# chrome-devtools

- Marketplace: Grok Build Plugin Marketplace (Plugins catalog)
- Source of truth: https://github.com/xai-org/plugin-marketplace
- Catalog revision: `9963e48f7a4a641d4f3a791cec55b089dd4aefa6`
- Category: development
- Homepage: https://github.com/ChromeDevTools/chrome-devtools-mcp
- Keywords: chrome devtools, chrome-devtools, devtools mcp
- Domains: (none)

## Description

Chrome DevTools integration. Control and inspect a live Chrome browser. Record performance traces, analyze network requests, check console messages with source-mapped stack traces, and automate browser actions.

## Source pin

```json
{
  "source": "url",
  "url": "https://github.com/ChromeDevTools/chrome-devtools-mcp.git",
  "sha": "6e53015a16423e3758a14d82c494cfcb4c07c3ea"
}
```

## Components (plugin-index.json)

### mcpServers

- **chrome-devtools**: stdio

### skills

- **a11y-debugging**: Uses Chrome DevTools MCP for accessibility (a11y) debugging and auditing based on web.dev guidelines. Use when testing…
- **chrome-devtools**: Uses Chrome DevTools via MCP for efficient debugging, troubleshooting and browser automation. Use when debugging web pa…
- **chrome-devtools-cli**: Use this skill to write shell scripts or run shell commands to automate tasks in the browser or otherwise use Chrome De…
- **cookie-debugging**: Uses Chrome DevTools MCP for inspecting, debugging, and testing cookies, session state, authentication issues, and cook…
- **debug-optimize-lcp**: Guides debugging and optimizing Largest Contentful Paint (LCP) using Chrome DevTools MCP tools. Use this skill whenever…
- **memory-leak-debugging**: Diagnoses and resolves memory leaks in JavaScript/Node.js applications. Use when a user reports high memory usage, OOM…
- **troubleshooting**: Uses Chrome DevTools MCP and documentation to troubleshoot connection and target issues. Trigger this skill when list_p…
