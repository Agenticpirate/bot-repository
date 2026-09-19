# Compound motion & icon language

Original Compound drawing. The site stays dark ink / paper / brass. Dialects are
accents on one system — not four vendor skins.

This note credits **publicly described UX patterns** only. Do not add scraped
screenshots, extracted SVGs, or trademarked mascots.

## What we ship

| Piece | Role |
| --- | --- |
| `BotGlyph` / `AgentAvatar` | Soft pebble + eyes + hashed accessory. States: idle, thinking, working, waiting, blocked, done. |
| `ThinkingMark` | Original asterisk-family frames for in-flight work. |
| `StatusPulse` | Activity ring (violet/brass) when a face is thinking or working. |
| `TypeGlyph` | Lucide marks for skill / soul / workflow and the rest of the type set. |
| Tokens | `--motion-fast/base/slow`, `--ease-out`, `prefers-reduced-motion`. |

Live gallery: [`/motion`](../src/app/motion/page.tsx).

## Hard rules

- Do **not** copy xAI Grok wordmarks, Grok Bot mascot assets, or sidebar faces from the product.
- Do **not** use Anthropic’s asterisk trademark as a logo. Unicode-inspired geometry here is Compound’s own frames.
- Do **not** use the OpenAI / ChatGPT mark.
- Do **not** use Meta Muse branding, generated Muse avatars, or wordmarks.
- Prefer `lucide-react` and SVGs authored in this repo.

## Patterns we encoded (inspiration, not clones)

### Pebble — Grok-like

Public writeup: [Designing Grok Bot for a world of persistent agents](https://x.ai/news/designing-grok-bot).

Patterns used:

- Persistent identity: one construction (simple shape + expressive eyes + controlled accessories).
- The avatar carries lifecycle: idle, thinking, working, waiting, blocked, done.
- Hover reveals the current action instead of a permanent status badge.
- A purple/brass pulse stands in for “computer active” — Compound colors, not a copied chrome.

Lucide send / mic / paperclip on `/motion` follow the same public “utility icon” habit seen in Grok-style composers. Those icons are Lucide’s, not xAI’s.

### Soft — Muse-like

Public writeup: [How We Designed Muse](https://introducing.muse.ai/). Product announcement: [Introducing Muse](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/).

Patterns used:

- A face that feels personal, not a corporate logo.
- Activity snippet under the avatar.
- Transparency: the snippet (and hover, in other dialects) is the start of an activity log feel.
- Approval-card aesthetic for consequential steps (icon, copy, two actions).
- Softer, messaging-native motion (longer breathe, less bounce).

### Mark — Claude-like

Public description of the Claude Code thinking cycle (asterisk-family glyphs, warm “still working” verbs): [claude-code#76424](https://github.com/anthropics/claude-code/issues/76424).

Patterns used:

- A small cycling **thinking glyph** built from original Compound frames (diamond, rays, burst) — not Anthropic artwork.
- Optional 2×3 **working pulse** (a dot lattice, not a copied braille font).
- Warm status verbs: “Still working”, “Thinking this through”.

### Outline — GPT-like

Public guidelines: [Apps SDK UI guidelines](https://developers.openai.com/apps-sdk/concepts/ui-guidelines).

Patterns used:

- Monochrome outlined iconography.
- System colors (Compound paper / mute / line) instead of a second palette.
- Card widgets as icon + label rows.
- Subtle scale / opacity on composer-like controls (`cmp-cta`).

## Reduced motion

`src/app/motion.css` honors `prefers-reduced-motion: reduce`: page/list enters stop, glyph cycles freeze on the first frame, CTAs do not scale. `html` scroll-behavior becomes `auto`.

## Files

```
src/lib/motion.ts
src/lib/avatar.ts
src/app/motion.css
src/components/motion/BotGlyph.tsx
src/components/motion/AgentAvatar.tsx
src/components/motion/ThinkingMark.tsx
src/components/motion/StatusPulse.tsx
src/components/motion/TypeGlyph.tsx
src/components/motion/ApprovalCard.tsx
src/components/icons.tsx
src/app/motion/page.tsx
```
