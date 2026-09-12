# The Permissions Model

Your assistant can read files, run commands, browse the web, and control your screen. The permissions model controls which of those actions happen automatically and which ones need your approval.

Every permission check is deterministic — enforced by traditional software, not judged by the AI. The approval buttons you see are hard-coded responses, not natural language interpreted by the model. This means there's no way to prompt-inject past a permission boundary.

## How it works

Every tool your assistant uses is classified with a risk level:

- **Low** — read-only operations (reading workspace files, web searches, loading skills, recalling memories). These run automatically at the default risk tolerance.
- **Medium** — operations that change state (writing files, making API calls, running shell commands that modify things). Whether these prompt you depends on your risk tolerance setting.
- **High** — destructive or sensitive operations (deleting files, modifying skill source code, running sudo). These always prompt you unless you've set your risk tolerance to Full access.

Risk classification runs in the gateway — a separate, deterministic process outside the AI sandbox. Shell commands are parsed using a tree-sitter parser; other tools are classified based on their registry metadata.

When a tool needs your approval, you see:

- A description of what it wants to do, in plain language
- A color-coded risk badge (🟢 Low / 🟡 Medium / 🔴 High)
- The risk reason — why the classifier assigned that level
- An expandable “Show details” section with the full tool input

## Risk tolerance

Your risk tolerance controls the threshold below which actions auto-approve without prompting. You can configure it in Settings > Permissions & Privacy.

| Setting            | What auto-approves          | What prompts                                                                                                       |
| ------------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **🔒 Strict**      | Nothing                     | Everything — every action requires explicit approval                                                               |
| **🛡️ Default**    | Low-risk actions            | Medium and High-risk actions (reading files and web searches auto-approve; writes, commands, and API calls prompt) |
| **⚠️ Relaxed**     | Low and Medium-risk actions | High-risk actions only (file writes and workspace commands auto-approve; destructive operations still prompt)      |
| **🚫 Full access** | Everything                  | Nothing — your assistant never asks for permission                                                                 |

The default setting is **Default**, which auto-approves low-risk read-only operations and prompts for everything else.

### Per-context thresholds

Under the Advanced section in Settings, you can set different thresholds for different execution contexts:

- **When chatting** — interactive conversation sessions (default: Default)
- **Scheduled tasks** — background tasks like heartbeats and scheduled jobs (default: Relaxed)
- **Automation / API** — externally triggered via API or webhooks (default: Strict)

This lets you give your assistant more autonomy for background tasks it runs on its own, while keeping tighter controls on API-triggered actions where external callers are involved.

## The permission prompt

When an action exceeds your risk tolerance, you see a permission prompt with two options:

- **Allow** — approve this action. If the system has a pattern match for the action (e.g. `git push *`), clicking Allow also creates a trust rule so similar actions auto-approve in the future.
- **Deny** — block this action.

The Allow button has a split menu with an additional option:

- **Allow & Create Rule** — approve the action and open the Rule Editor, where you can customize the trust rule before it's saved. The Rule Editor is pre-populated with an LLM-suggested pattern and scope.

Every completed tool call (including auto-approved ones) shows a risk badge in the expanded view. Clicking the badge opens the Rule Editor, letting you proactively create or adjust rules from any tool call.

## The sandbox boundary

Think of your assistant's workspace as a separate computer inside your computer. It's a self-contained environment where the assistant can run freely — creating files, modifying data, running commands — without needing your approval. Anything that happens inside this inner computer stays contained.

**Inside the workspace** (`~/.vellum/workspace/`):

- Reading, writing, and editing files — no approval needed
- Running shell commands via **bash** — no approval needed (sandboxed execution)
- Building apps, saving memories, searching the web — no approval needed

**Outside the workspace** (your host machine):

- **host\_file\_read** — reading files anywhere on your machine. Prompted.
- **host\_file\_write, host\_file\_edit** — writing or editing files anywhere. Prompted.
- **host\_bash** — running shell commands on your actual machine. Prompted.

When the assistant needs to do something outside its workspace, it doesn't reach out directly. Instead, it tells a separate process — one that lives outside the sandbox — to perform the action and report back. That external process is deterministic, traditional software with no AI involved. The AI stays inside the cage at all times.

The sandbox is enforced at the OS level (sandbox-exec on macOS, bubblewrap on Linux). Path traversal attacks (using `../` to escape the workspace) and symlink escapes are blocked.

## How shell commands are classified

Not all shell commands are equal. Your assistant parses commands using a tree-sitter parser and classifies them based on what programs they invoke:

**Low risk** — read-only programs: `ls`, `cat`, `grep`, `find`, `git status`, `git log`, `git diff`, `node`, `python`, `jq`, `tree`, `du`, `df`, `ping`, `dig`, and similar.

**Medium risk** — programs that modify state: `sed`, `awk`, `chmod`, `chown`, `curl`, `wget`, non-read-only git subcommands (like `git commit`, `git push`), and any program not in the known-safe list.

**High risk** — dangerous programs: `sudo`, `rm`, `dd`, `mkfs`, `reboot`, `shutdown`, `kill`, `iptables`, and other system administration tools.

This parsing also generates “action keys” for pattern matching. When you approve `git push`, the system creates a rule that matches future `git push` commands without also matching `git reset --hard`.

## Trust rules

Trust rules are persistent decisions that tell the system to always allow or always deny specific actions. They accumulate over time as you use your assistant — the more you approve, the fewer prompts you see.

Each rule has:

- **Tool** — which tool it applies to
- **Pattern** — a glob pattern matching specific commands, paths, or URLs
- **Risk level** — the classified risk of the action
- **Scope** — where the rule applies (a specific directory, the project root, or everywhere)
- **Decision** — allow, deny, or ask

Rules are matched using glob patterns. You can have a broad “allow git everywhere” rule and a narrow “deny `git push --force` everywhere” rule, and the deny will win because deny takes precedence over allow at equal priority.

You can view and manage your trust rules in Settings > Permissions & Privacy.

### The Rule Editor

The Rule Editor opens when you click “Allow & Create Rule” on a permission prompt, or when you click the risk badge on any completed tool call. It lets you customize exactly what the rule matches before saving.

The Rule Editor shows:

- **Pattern options** — a ladder of patterns from most specific (exact command) to most general (any command from that program), generated by the command parser
- **Scope options** — where the rule should apply: this specific directory, the project root, or everywhere
- **Risk level** — the classified risk, so you understand what you're allowing

When opened via “Allow & Create Rule,” the fields are pre-populated with an LLM-suggested pattern and scope based on the action you're approving. You can adjust anything before saving.

### Directory-scoped rules

Trust rules can be scoped to specific directories. For example, you might allow `git push` in your work project but not in your personal dotfiles. When a tool operates on files, the system resolves the actual filesystem paths and checks them against directory-scoped rules.

The default scope is “Everywhere,” which means the rule applies regardless of which directory the action targets. You can narrow this in the Rule Editor to scope rules to a specific project.

## Skill tool permissions

Tools provided by third-party skills (ones you've installed, not the ones bundled with Vellum) are always prompted by default, regardless of risk level. This prevents a malicious or buggy skill from executing actions without your knowledge.

Bundled skill tools (Browser, Gmail, Calendar, etc.) follow the normal risk-based rules.

Trust rules for skill tools are version-bound — they record the skill's content hash. If the skill's source files change, the hash changes and you're re-prompted. Modified skills can't silently inherit previous approvals.

## macOS system permissions

On top of the assistant's own permission system, macOS has its own layer:

| Permission           | What it unlocks                | Where to grant it                                       |
| -------------------- | ------------------------------ | ------------------------------------------------------- |
| **Accessibility**    | Controlling mouse and keyboard | System Settings > Privacy & Security > Accessibility    |
| **Screen Recording** | Seeing your screen content     | System Settings > Privacy & Security > Screen Recording |
| **Microphone**       | Voice input                    | System Settings > Privacy & Security > Microphone       |

These are the “can it access this at all” layer. The assistant's Allow/Deny prompts are the “should it access this right now” layer. Both must pass for an action to execute.

## Windows system permissions

Windows does not have macOS Accessibility, Input Monitoring, or Automation permission prompts. Those rows are hidden in Vellum on Windows. Open Settings > Permissions & Privacy in Vellum to check microphone, screen capture, speech, and notification access; the settings links open the corresponding Windows settings pages.

Computer control runs as your Windows user without requesting administrator access. It cannot interact with elevated apps, UAC prompts, or protected windows. An in-app approval does not override that boundary. For tasks in an app you control, use its normal, non-administrator window.

## Cross-channel approvals

When someone messages your assistant through Telegram or Slack and the assistant needs to do something that requires permission, it routes the approval request to you (the guardian) through your active channel.

Approval grants are:

- **One-time use** — a grant is consumed when the action executes and can't be reused
- **Time-limited** — grants expire after 5 minutes if not used
- **Scoped** — bound to the specific tool and input that was requested

Guardian approvals are always downgraded to one-time grants — they never create persistent trust rules. To create a rule that auto-approves future actions, you'd need to do that directly from the desktop app.

## What happens when you say no

When you deny an action:

1. The action is blocked immediately
2. Your assistant acknowledges the denial
3. It does **not** retry automatically
4. It asks if there's an alternative approach
5. It only retries with your explicit consent

If you create a deny rule for a pattern, future attempts to use that tool with a matching pattern are blocked silently — the assistant won't even ask.
