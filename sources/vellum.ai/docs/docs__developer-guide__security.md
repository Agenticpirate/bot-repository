# Security & Permissions

Vellum uses OS-level sandboxing, a keychain-backed credential vault, and a scoped trust rule system to keep your data safe while giving the assistant the access it needs.

## Sandbox

The sandbox uses native OS-level sandboxing: `sandbox-exec` with SBPL profiles on macOS, `bwrap` (bubblewrap) on Linux. No extra dependencies on macOS. **Fail-closed** — if the backend is unavailable, commands fail immediately rather than falling back to unsandboxed execution.

- **Workspace tools** (`file_read`, `file_write`, `file_edit`, `bash`) operate within `~/.vellum/workspace`.
- **Host tools** (`host_bash`, `host_file_read`, `host_file_write`, `host_file_edit`) execute directly on the host, subject to trust rules and permission prompts.

### Troubleshooting

| Symptom                              | Cause                            | Fix                                                   |
| ------------------------------------ | -------------------------------- | ----------------------------------------------------- |
| `Docker CLI is not installed`        | Docker not installed             | Install Docker Desktop                                |
| `Docker daemon is not running`       | Docker Desktop not started       | Start Docker Desktop or `sudo systemctl start docker` |
| `Cannot bind-mount the sandbox root` | File sharing not configured      | Add `~/.vellum/workspace` to Docker file sharing      |
| `bwrap cannot create namespaces`     | bubblewrap not installed (Linux) | `apt install bubblewrap`                              |

Run `vellum doctor` for a full diagnostic check.

## Credentials

Secrets are stored in the macOS Keychain (encrypted file fallback on Linux). The LLM never sees raw tokens or keys.

- **Secret prompt** — a floating `SecureField` panel collects credentials; the LLM never sees the value.
- **Ingress blocking** — inbound messages are scanned for secrets (regex + entropy) and rejected if detected.
- **Usage policy** — each credential specifies `allowedTools` and `allowedDomains`, enforced by the `CredentialBroker`.
- **No plaintext read API** — secrets are only consumed by the broker for scoped tool execution.
- **One-time send** — when enabled, a “Send Once” button lets users provide a value for immediate use without persisting it.

### Credential References

Use either format in proxied shell commands:

- **UUID** — the canonical credential ID from `credential_store list`
- **service/field** — human-readable, e.g. `fal/api_key`

Unknown references fail immediately with a clear error before the command executes.

### Wildcard Matching

Patterns like `*.fal.run` match subdomains (`api.fal.run`, `queue.fal.run`) and the bare domain (`fal.run`). Exact patterns take precedence over wildcards.

### Ambiguity Blocking

When multiple credentials match the same host, the request is blocked — the proxy refuses to guess. Per-credential selection picks the most specific template (exact > wildcard). Cross-credential resolution blocks when more than one credential matches.

### Debugging 401 Errors

1. Check the credential reference matches via `credential_store list`
2. Verify the `hostPattern` matches the target host
3. Check for ambiguity — overlapping patterns block injection
4. Verify the injection template has the correct `headerName` and `valuePrefix`
5. Enable `LOG_LEVEL=debug` for decision traces

## Risk Tolerance

The `autoApproveUpTo` threshold controls which risk levels auto-approve without prompting. Configured per execution context via the gateway.

| Threshold | UI Label    | Behavior                                                |
| --------- | ----------- | ------------------------------------------------------- |
| `none`    | Strict      | Prompt for every action. No auto-approve.               |
| `low`     | Default     | Auto-approve Low risk. Prompt for Medium and High.      |
| `medium`  | Relaxed     | Auto-approve Low and Medium risk. Prompt for High only. |
| `high`    | Full access | Auto-approve all risk levels. No prompts.               |

Accepts a scalar string applied to all contexts, or an object with per-context overrides:

```
// Scalar — same threshold everywhere
autoApproveUpTo: "low"

// Per-context — different thresholds per execution context
autoApproveUpTo: {
  conversation: "low",    // interactive chat sessions
  background: "medium",   // scheduled tasks, heartbeats
  headless: "none"        // API/webhook-triggered (strictest)
}
```

## Trust Rules

Trust rules are persisted in a SQLite database managed by the gateway process. Each rule stores a tool name, glob pattern, risk level, decision (allow/deny/ask), and optional directory scope.

- **Pattern matching** — glob patterns for commands, file paths, and URLs
- **Directory scoping** — rules can be scoped to a specific directory, project root, or everywhere. Resolved filesystem paths are matched at evaluation time.
- **Priority resolution** — deny beats ask beats allow at equal priority. More specific patterns win over broader ones.

### Shell Command Allowlists

When you approve a shell command, the prompt offers parser-derived allowlist options based on the command's structure. For example, `cd /repo && gh pr view 5525 --json title` generates:

- `cd /repo && gh pr view 5525 --json title` — exact command
- `gh pr view *` — any `gh pr view` command
- `gh pr *` — any `gh pr` command
- `gh *` — any `gh` command

Compound commands with multiple non-prefix actions only offer an exact-command option to prevent over-generalization.

### Version-bound Skill Approvals

Trust rules record the skill's version hash. If source files change, the hash changes and you're re-prompted — modified skills can't silently inherit previous approvals.

### Skill Mutation Protection

Writes to skill directories are escalated to **high risk**, preventing the agent from modifying its own capabilities without explicit consent.
