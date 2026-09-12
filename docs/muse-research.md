# Muse research (disambiguation)

**Meta Muse has no public store.** There is no Muse-branded plugin marketplace, bot gallery, or skills registry comparable to x.ai/bot/marketplace, grokbot.dev, skills.sh, or claude.com/plugins.

What exists instead:

1. **Muse Spark cookbooks** on Meta Model API — recipes for Muse Spark, Muse Code, Muse Image, Muse Voice, and Muse Glimmer. Archived under `sources/dev.meta.ai-cookbook/`.
2. **edheltzel/Muse** — a single third-party agent skill (HTML/slide decks). Archived under `sources/github/edheltzel-Muse/`.
3. **Other Muse-branded packs** — one-off listings only (`sources/muse-thirdparty/`).

## Name collisions

| “Muse” | What it actually is | Public store? |
| --- | --- | --- |
| **Meta Muse Spark / Muse Code / Muse Image / Muse Voice / Muse Glimmer** | Model family + coding CLI + cookbooks on [dev.meta.ai/docs](https://dev.meta.ai/docs/cookbook) | **No.** Docs and recipes only. |
| **edheltzel/Muse** | GitHub agent skill for diagrams / slide decks | One pack, not a store |
| **AgentForge “Muse — Content Machine”** | Single content-agent template | One listing |
| **ClaudeMarket “Muse — AI Content Creator”** | Single Claude listing (HTTP 429 this host) | One listing |
| **Cursor Muse Spark** (`muse-spark-*`) | Cursor coding-agent model id | No |
| **muse.ai** | Video hosting product | Unrelated |
| **musetemplates.com** | Timed out this host | Unknown |
| Unofficial `muse-spark` GitHub wrappers | Telegram/API shims for a “Muse Spark” LLM | Not a gallery |

## What was archived

| Path | Source | Notes |
| --- | --- | --- |
| `sources/dev.meta.ai-cookbook/` | https://dev.meta.ai/docs/cookbook + linked Muse Code / agent recipe `.md` | Official cookbooks; `llms.txt` |
| `sources/github/edheltzel-Muse/` | https://github.com/edheltzel/Muse | Shallow clone, `.git` stripped |
| `sources/muse-thirdparty/` | AgentForge + ClaudeMarket Muse listings | ClaudeMarket 429 |
| `sources/muse-research/` | Earlier hunt snapshots (muse.ai, AgentForge, ClaudeMarket) | Negative evidence |

## Conclusion

Do not expect a Muse plugin marketplace. Cite Meta cookbooks for Muse Spark/Code, and treat `edheltzel/Muse` plus AgentForge/ClaudeMarket as isolated third-party packs. Hunt notes for Batch 3: [source-candidates-batch3-claude-muse-workflows.md](source-candidates-batch3-claude-muse-workflows.md).
