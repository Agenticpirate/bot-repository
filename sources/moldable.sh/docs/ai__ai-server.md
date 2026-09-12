> ## Documentation Index
> Fetch the complete documentation index at: https://docs.moldable.sh/llms.txt
> Use this file to discover all available pages before exploring further.

# ai-server adapter

> Stream responses from a Moldable ai-server instance.

Use this adapter if you are running a Moldable ai-server instance.

## Example

Set `base_url` to your local ai-server and the gateway will use it to generate responses.

## Configuration

```json theme={null}
{
  "ai": {
    "default_adapter": "ai-server",
    "adapters": [
      {
        "type": "ai-server",
        "name": "ai-server",
        "base_url": "http://127.0.0.1:39200",
        "model": null,
        "reasoning_effort": "medium",
        "workspace_id": null
      }
    ]
  }
}
```
