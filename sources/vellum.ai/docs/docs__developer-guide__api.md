# API & Communication

The runtime exposes a real-time SSE event stream for streaming assistant responses, and supports remote access via SSH port forwarding.

## SSE Event Stream

```
GET /v1/events?conversationKey=<key>
```

JWT bearer auth with `chat.read` scope. Streams real-time assistant events. When `conversationKey` is omitted, subscribes to events from all conversations. Heartbeat comments are emitted every 30 seconds to prevent proxy timeouts.

### Event Types

| Event                      | Description                                   |
| -------------------------- | --------------------------------------------- |
| `assistant_text_delta`     | Incremental text token from the model         |
| `assistant_thinking_delta` | Reasoning token                               |
| `tool_use_start`           | Tool invocation starting                      |
| `tool_input_delta`         | Streaming tool input chunk                    |
| `tool_output_chunk`        | Streaming tool output chunk                   |
| `tool_result`              | Tool execution result                         |
| `message_complete`         | Turn complete with full message + attachments |
| `confirmation_request`     | User approval needed before action executes   |
| `generation_handoff`       | Sub-agent handoff                             |
| `generation_cancelled`     | Run cancelled                                 |

### Connection Management

- **Capacity** — up to 100 concurrent SSE connections; oldest evicted when cap is reached
- **Slow consumers** — connections closed when receive buffer hits 16 queued events
- **Disconnect cleanup** — closing the tab, cancelling the reader, or aborting the request all dispose the subscription deterministically

### JavaScript Example

The standard `EventSource` API doesn't support custom headers, so use `fetch()` with manual SSE parsing:

```
const TOKEN = '<jwt>';
const res = await fetch(
  'http://localhost:3001/v1/events?conversationKey=my-conversation',
  { headers: { Authorization: `Bearer ${TOKEN}` } },
);

const reader = res.body.getReader();
const decoder = new TextDecoder();
let buf = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buf += decoder.decode(value, { stream: true });
  const frames = buf.split('\n\n');
  buf = frames.pop() ?? '';

  for (const frame of frames) {
    const dataLine = frame.split('\n').find((l) => l.startsWith('data: '));
    if (!dataLine) continue;
    const event = JSON.parse(dataLine.slice(6));
    console.log(event.message.type, event.message);
  }
}
```

## Remote Access

Access a remote assistant from your local machine via SSH port forwarding.

```
# CLI
ssh -L 8741:localhost:8741 user@remote-host -N &
VELLUM_DAEMON_URL=http://localhost:8741 vellum

# macOS app
ssh -L 8741:localhost:8741 user@remote-host -N &
VELLUM_DAEMON_URL=http://localhost:8741 open -a Vellum
```

Autostart is disabled by default for remote connections. Set `VELLUM_DAEMON_AUTOSTART=1` to override.

### Troubleshooting

| Symptom                                          | Check                                                  |
| ------------------------------------------------ | ------------------------------------------------------ |
| “could not connect to assistant”                 | Is the SSH tunnel active? Check `VELLUM_DAEMON_URL`    |
| Assistant starts locally despite remote override | Check that `VELLUM_DAEMON_AUTOSTART` is not set to `1` |
| macOS app not connecting                         | Verify the assistant URL is reachable                  |
| “connection refused”                             | Is the remote assistant running? (`vellum ps`)         |

Run `vellum doctor` for a full diagnostic check.
