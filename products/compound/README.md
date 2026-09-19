# Compound

**Memory OS for a one-person Grok Bot company.**

Compound is a product kit plus a web front door (`apps/explorer`). It does not invent a new model. It installs an operating system on the bots you already run: shared vs private memory, a Who-I-Am profile, named skills, a decisions log, corrections-as-rules, draft-first learning, a weekly prune, and a standing cleanliness goal.

Same bots. Same budget. The difference is whether memory compounds.

## Thesis (ours)

A one-person company can look fully staffed and still leak. Chat transcripts are not skills. A correction in one thread is not a company rule. Two bots that “know” different versions of you will spend your week reconciling fiction.

Compound’s job is to make the memory layer explicit and boring:

| Layer | Lives in | Rule of thumb |
| --- | --- | --- |
| Who I am | Shared | Every bot reads it first |
| Decisions | Shared `DECISIONS` log | Never reopen without a flag |
| Standing rules | Shared `always X, never Y` | A correction anywhere updates everyone |
| Role job + never | That bot’s memory | One sentence each |
| Task scratch | Private | Dies with the job unless promoted |
| Reusable how-to | Named skill | Not a chat scrap |
| Outbound / spend | Draft | Edit → why → rule |

## How to use this kit

1. Open the app (`cd apps/explorer && npm run dev`) — landing at `/`, wizard at `/setup`, archive at `/explore`.
2. Paste the 12 prompts from [`prompts.json`](prompts.json) into Grok Bot (wizard has copy buttons).
3. Create a **Memory Steward** from [`starter/memory-steward.md`](starter/memory-steward.md).
4. Fill [`starter/who-i-am.md`](starter/who-i-am.md) and [`starter/DECISIONS.md`](starter/DECISIONS.md).
5. Install [`starter/shared-vs-private.md`](starter/shared-vs-private.md) as a team rule and [`starter/weekly-prune.md`](starter/weekly-prune.md) as the weekly ritual.
6. When you need a role or a reusable skill, pick a **real** listing from the public archive explorer. Canonical pages stay on the source sites.

The explorer does not require checking out the ~2TB `sources/` tree. It uses the slim seed index in `apps/explorer/public/index/`.

## Files

```
products/compound/
  README.md                 this brief
  ATTRIBUTION.md            credit for the inspiring article
  prompts.json              the 12 user prompts + original step copy
  starter/
    memory-steward.md       bot description to paste into Grok
    who-i-am.md             shared profile template
    DECISIONS.md            shared decisions log
    shared-vs-private.md    filing rules
    weekly-prune.md         weekly review script
```

The Next app mirrors `prompts.json` at `apps/explorer/content/compound/prompts.json` so `/setup` can load it without the 2TB archive.

## What Compound is not

- Not a reprint of someone else’s essay.
- Not a crypto protocol, token, or “agent marketplace.”
- Not a replacement for Grok Bot, xAI, or the source catalogs in this repo.
- Not permission to invent serials or strip attribution from archived listings.

## Attribution

Inspired by KingWilliam’s article
[How to build a one-person $1M company with Grok Bot](https://x.com/kingwilliam_/status/2096273503901122746)
(`@kingwilliam_`). See [ATTRIBUTION.md](ATTRIBUTION.md).
