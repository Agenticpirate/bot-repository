> ## Documentation Index
> Fetch the complete documentation index at: https://docs.moldable.sh/llms.txt
> Use this file to discover all available pages before exploring further.

# Logging

> Where to find the gateway activity log, trace log, session transcripts, and team logs.

Moldable Gateway can write a few different kinds of logs. Some contain message content (your conversations). Others are operational or security logs.

If you are concerned about sensitive data, the most important thing to understand is:

* **Session transcripts (conversation history) are not written to disk by default.**
* You can opt into transcript persistence later.

## What Gets Written To Disk (And What It Means)

These categories are separate on purpose:

* **Session transcripts (conversation history)**: the message text you and the assistant exchanged. This is the highest-sensitivity data.
* **Gateway activity/trace logs**: operational logs used for debugging (high level by design, but still may include details like URLs, error messages, or tool names).
* **Vault audit logs**: security audit events about secret handling (create/use/rotate/revoke/lock/unlock). These do **not** include secret plaintext.
* **Team journals/logs** (if you use Teams): durable handoff data to help teammates resume work. Depending on your workflow, this may include summaries of actions and outputs.

## Recommended Privacy Settings

Pick a posture that matches your risk tolerance.

### Default (Recommended)

Keep conversation transcripts off-disk, keep operational logs and Vault audit logs on.

* `sessions.transcripts.enabled=false`
* `gateway.logs.enabled=true`
* `gateway.logs.disable_disk_logs=false`

### "Private" Mode

Keep transcripts off-disk and also stop writing gateway activity/trace logs to disk (stdout still shows what's happening while you run it).

* `sessions.transcripts.enabled=false`
* `gateway.logs.enabled=false`

Vault audit logs still work in this mode.

### "Kill Switch" (Maximum Privacy)

Disable **all** log/transcript writes to disk, including Vault audit logs and team journals/logs.

* `gateway.logs.disable_disk_logs=true`

Note: this does not delete existing files. It only prevents new ones from being created.

## Keeping Logs Secure (If You Keep Any)

If you enable any disk logging (or if you enable transcript persistence), treat those files like sensitive data:

* Use full-disk encryption (FileVault on macOS, BitLocker on Windows).
* Be careful with backups and cloud sync (they will copy logs too).
* Consider running the gateway under a separate OS user account if your main account handles sensitive work.
* Avoid pasting secrets into chat messages. Use the Vault instead.

## Background Service Note

If you install the gateway as a background service, your OS may capture stdout/stderr to a file.
On macOS this is typically `/tmp/moldable-gateway.log` unless you enable the kill switch and reinstall the service (so it redirects service output to `/dev/null`).

## Where Logs Live

By default, the gateway stores logs under its state directory:
`~/.moldable/gateway/`

If you set `gateway.logs.dir`, the `logs/` directory moves there.

## Gateway activity log (human-readable)

This is the same visual stream you see in the CLI (the colored `● ...` lines).

* CLI output: stdout/stderr
* File: `~/.moldable/gateway/logs/gateway.log`

This file is intentionally high level: tool names, lifecycle events, and short details (not full transcripts).

You can tail it via the CLI:

```bash theme={null}
moldable gateway logs --follow
```

## Gateway trace log (developer/debug)

This is a more detailed debug log. It is separate from the activity log.

* File: `~/.moldable/gateway/logs/trace.log`

## Rotation and retention

`gateway.log` and `trace.log` use the `gateway.logs` settings:

* `gateway.logs.dir`
* `gateway.logs.max_files`
* `gateway.logs.max_size_mb`

If you are using advanced runtime features, those may maintain their own logs under the gateway state directory as well.
