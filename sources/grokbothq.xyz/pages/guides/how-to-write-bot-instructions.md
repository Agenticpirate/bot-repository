# How to Write Grok Bot Instructions That Actually Work

> Write instructions like a spec, not a vibe: a defined role, one job, numbered and testable rules, an explicit workflow, and a failure mode. Rules beat personality - 'end every review with Ship it / Needs another pass' outperforms 'be helpful and thorough' every time.

Updated 2026-08-24 - 7 min read - tagged: builder, writing

Most Grok bots fail the same way: the instructions read like a horoscope - warm, vague, and unenforceable. The bots that become daily habits are written like small programs in plain English. This guide gives you the pattern, with real before/after rewrites from the directory's review queue.

## Rule 1: one job, stated cruelly

'You are a helpful assistant that can help with anything' is the bot-killer. Compare: 'Your only job is reviewing pasted diffs. You do not write features, you do not refactor, you review.' Scope isn't a limitation - it's the product. Every rule you add outside the job is a way for the bot to disappoint someone.

## Rule 2: rules must be testable

A rule is testable if two people could read the transcript and agree whether it was followed. 'Be concise' fails. 'Replies under 120 words' passes. 'Be friendly' fails. 'One sentence of warmth maximum before the first bullet' passes. Go through your instructions and replace every adjective with a number or a structure.

- 'Be concise' → 'Under 90 words, always.'
- 'Use a friendly tone' → 'First line: one warm sentence. Then bullets.'
- 'Give good advice' → 'Always commit to a call, then give the reasoning. Never say it depends without picking anyway.'

## Rule 3: give it a default workflow

The best bots know what to do when you paste something in without a request. 'When given text: (1) extract every checkable claim, (2) verdict each with a source, (3) end with an overall grade.' Users don't want to manage your bot; they want to paste and receive. Encode the paste-to-output loop directly in the instructions.

## Rule 4: write the failure mode

Every bot eventually gets input it can't handle. What it does next is the difference between trust and garbage. Add an explicit out: 'If the paste isn't a receipt, ask for the receipt text instead of guessing. If a claim can't be verified, say UNVERIFIABLE - never fill the gap.' This one paragraph is the cheapest quality upgrade in bot building.

## Before / after: a real rewrite

Before: 'You are a helpful email assistant. You love helping people manage their inboxes and stay productive. Always be positive and thorough.'
After: 'You are Dewey, an inbox triage librarian. Job: sort pasted email into NEEDS YOU / FYI / ARCHIVE - nothing else. FYI items get one bullet each. Deadlines are surfaced loudly with dates bolded. If the paste isn't email text, ask what you're looking at. End with: the single email that matters most today.'
Same idea, but the after version can be tested, and tested bots get opened twice a day.


---

Part of [GrokBot HQ](https://grokbothq.xyz), the independent, hand-reviewed directory of Grok bots. Canonical page: [https://grokbothq.xyz/guides/how-to-write-bot-instructions](https://grokbothq.xyz/guides/how-to-write-bot-instructions).
GrokBot HQ is an independent directory maintained by fans of the Grok bot ecosystem. It is not affiliated with, endorsed by, or sponsored by xAI. Grok is a trademark of xAI; references are for identification only.
