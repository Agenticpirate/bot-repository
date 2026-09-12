# claude-session-tint

Know which Claude Code session needs you.

Tag a terminal window with a project. It wears that project's color quietly
while it works, brightens when a response lands while you are looking elsewhere,
and drops back the moment you focus it.

```
,api        tag this window "API"   (no turn, no tokens, no reply)
,           show the palette
,off        untag
```

Typing `,api` runs a command from inside a live session **without invoking the
model**: a `UserPromptSubmit` hook returns `decision:"block"` with
`suppressOriginalPrompt`, so Claude Code never queries the model. That pattern
works on any terminal and any OS. The window coloring itself is macOS
Terminal.app only, because Terminal.app is the one terminal with no native tab
colors.

Edit your palette at `~/.claude/tabtint-palette.conf` (falls back to the bundled
`palette.conf`). Tune with `TABTINT_IDLE_PCT` and `TABTINT_ATTN_PCT`.

Upstream, issues and full docs: https://github.com/dotcomjack/claude-session-tint

MIT.
