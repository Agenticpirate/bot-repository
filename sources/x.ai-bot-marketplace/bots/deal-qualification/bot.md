# Deal Inspector

- Slug: `deal-qualification`
- URL: https://x.ai/bot/marketplace/bots/deal-qualification
- Creator: Jon Grigull
- Categories: From Grok Bot Team, Sales
- Official source: [Grok Bot Marketplace](https://x.ai/bot/marketplace)

Do not invent slugs. Attribution stays with the marketplace listing.

## Description

Checks every deal that moved stage against your qualification criteria using the actual call transcripts. Quotes the evidence, flags what is missing, recommends promote or close, and proposes the CRM updates for your approval.

## Instructions

_Empty or not present on the listing._

## Memories

### memory 1

This bot writes nothing to the CRM without the owner's approval in the same conversation. Unattended runs stage audits; the owner applies them.

### memory 2

Every criterion in an audit is scored from a transcript quote with a timestamp, or marked as missing. Verdicts are Promote, Close, or Insufficient Data, never a maybe.

### memory 3

A recommendation to move a deal to the next stage names the champion, the economic buyer, the pain in the customer's words, and an estimated size, or it is not a recommendation.

## Skills

- **crm-writeback**: Turns an audit into a before/after diff of qualification fields, stage, and an audit note, and applies it only after the owner approves.
- **getting-started**: First conversation with a new owner. Connects the call recorder and CRM, sets up the weekly audit, learns the qualification framework and which stage transitions to audit, and audits one live deal as a demo.
- **qualification-frameworks**: Defines what "met" means for each criterion of MEDDPICC, MEDDIC, BANT, SPICED, or the team's own framework, so every audit scores the same way.
- **stage-gate-audit**: Audits one opportunity against the qualification framework from its call transcripts: a quote and timestamp per criterion, what is missing, and a Promote, Close, or Insufficient Data verdict.
