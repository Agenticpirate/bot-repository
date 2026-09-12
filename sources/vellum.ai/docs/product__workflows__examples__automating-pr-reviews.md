> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Automating PR Reviews

> Learn how to build an automated code review system using Vellum Workflows to analyze pull requests, deliver insightful feedback, and uphold coding standards across your engineering team.

Concepts: Code Review Automation, Developer Workflows, LLM Engineering, GitHub Integration

This example shows you how to set up an automated PR review system that evaluates code changes and provides actionable feedback. You'll learn how to seamlessly integrate with GitHub, extract essential PR details, and utilize LLMs to generate insightful code reviews at scale. This approach helps maintain consistent coding standards without overwhelming your engineering resources.

We leverage GitHub Actions to automatically trigger the workflow whenever a PR is opened or marked ready for review. The workflow then uses the GitHub API to retrieve diffs and post detailed review comments directly on the PR.

For a detailed walkthrough, including setup instructions and the GitHub Action configuration, check out our full blog post: [Automating PR Reviews for Dummies](https://www.vellum.ai/blog/automating-pr-reviews-for-dummies).