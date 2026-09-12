# Sanitization Policy

Before publishing agent data, remove or transform anything private.

## Remove

- Customer names
- Workspace names
- Internal URLs, IPs, SSH hosts, and database names
- API keys, cookies, passwords, tokens, and environment variables
- Private system prompts
- Unpublished commercial metrics
- Internal operational procedures

## Transform

- Real people -> fictional names
- Internal prompts -> public capability summaries
- Exact revenue data -> broad public tier
- Internal workspace taxonomy -> public categories
- Private examples -> fictional examples

## Verify

Run the sensitivity sweep before publishing:

```bash
npm run sweep
```
