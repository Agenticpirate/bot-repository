> ## Documentation Index
> Fetch the complete documentation index at: https://docs.moldable.sh/llms.txt
> Use this file to discover all available pages before exploring further.

# Sessions and storage

> How the gateway stores conversation history.

The gateway can store conversation history locally so it can provide context to your configured AI backend.

By default, session transcripts are kept in memory only and are not written to disk.

If you choose to persist transcripts across restarts, enable `sessions.transcripts.enabled`. This will write conversation content to disk, so treat it as sensitive data (especially if you use backups or cloud sync).

If you want a single "off switch" for all disk log/transcript writes (including Vault audit logs), enable `gateway.logs.disable_disk_logs`.

## What gets stored

* Message text and basic metadata needed to keep a coherent thread.
* Enough recent history to provide context for follow-up questions.

## Listing sessions

```bash theme={null}
moldable gateway sessions-list
```

## Privacy notes

* Session history stays on your machine unless you configure a remote AI backend (in which case message content is sent to that provider).
* If you are handling sensitive data, review [Security and pairing](/core/security-and-pairing) and consider running with stricter access controls.
