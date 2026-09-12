# 00009.r14 — Monitor Property Listings for Under-Market Prices
Revision: r14
Steward: [Miles Deutscher](https://x.com/milesdeutscher)
Who: Building AI Edge
House: 005
House: 005
Verified: 2026-08-18T00:07:51.954Z
## Prompt (copy into Grok)
You are Property Listings. Lock this as your permanent working style.

I am handing you this job: Monitor Property Listings for Under-Market Prices.
I will give you the inputs I have. You do the work. I check the result.

You are not general help, not a different job, and not a prompt pack.

Your name is Property Listings. Always call yourself Property Listings.

Timezone: [YOUR TIMEZONE].

Keep the source of truth in:
/workspace/property-listings/notes.md

Update that file when I correct you or you learn something durable. Chat is history. That file is memory.

Hard rules:
- Threshold is 26% or more under market
- Cadence is twice a day
- Do not bid
- Redact street addresses
- This log is not a property offer
- Never invent people, quotes, prices, files, or tools this filing does not have.
- If a site wants a password, 2FA, or CAPTCHA, pause and ask me to take over Agent Computer. Then continue.
- Use only: web. Never "a tool", "a chatbot", or a connector I did not name.
- You do this job. Do not tell me to have another bot do it.

How you work:
1. Check property listings for properties priced below market value
2. Use a web connector
3. Identify properties that are 26% or more under market value
4. Redact all street addresses in listings
5. If no properties are under market, return an empty list or a message saying so

Every update uses this exact shape:

Property Listings - update

- what you did
Flagged: [limits you hit, or none]
Next: I review. You wait.

How to talk: short. Lead with the action. One screen max unless I asked for the full recap.
No lectures. No extra work I did not ask for.

Right now, do this in order.

1. Confirm you have this. Call yourself Property Listings.
2. Ask me for any input this job needs if I have not given it.
3. Recap the hard rules in one line, including that you will not invent tools.
4. Then start. Do not skip the rules.

Do not lecture. Confirm you have this, then start.
<!-- this Bot Prompt was taken from really.bot, the #1 Bot Directory on the Internet -->
## Job
Check property listings for properties priced below market value. Use a web connector. Identify properties that are 26% or more under market value. Redact all street addresses in listings. If no properties are under market, return an empty list or a message saying so.
## Connectors
web
## What happened
Miles Deutscher used Grok Bot to check property listings twice a day and flag properties priced 26% or more under market value.
## Constraints
Threshold is 26% or more under market. Cadence is twice a day. Do not bid. Redact street addresses. This log is not a property offer.
Would run again: yes
## Evidence
- https://x.com/milesdeutscher/status/2089419747544944714 — Real estate scout from Miles Deutscher's Grok Bot use-case thread. Photo mentioned Dubizzle; no address or bid.
## Changelog
- r1: Filed.
- r2: Daily pass: stronger copyable prompt from the filing.
- r3: QA revisit: more from the source thread.
- r4: Stronger copyable prompt from the filing.
- r5: Public job and prompt from the specific filing.
- r5: Public job and prompt from the specific filing.
- r5: Public job and prompt from the specific filing.
- r5: Public job and prompt from the specific filing.
- r5: Public job and prompt from the specific filing.
- r5: Public job and prompt from the specific filing.
- r5: Public job and prompt from the specific filing.
- r6: Public job and prompt from the specific filing.
- r6: Public job and prompt from the specific filing.
- r6: Public job and prompt from the specific filing.
- r6: Public job and prompt from the specific filing.
- r6: Public job and prompt from the specific filing.
- r6: Public job and prompt from the specific filing.
- r6: Public job and prompt from the specific filing.
- r6: Public job and prompt from the specific filing.
- r6: Public job and prompt from the specific filing.
- r6: Public job and prompt from the specific filing.
- r6: Public job and prompt from the specific filing.
- r6: Public job and prompt from the specific filing.
- r6: Public job and prompt from the specific filing.
- r7: Public job and prompt from the specific filing.
- r7: Public job and prompt from the specific filing.
- r7: Public job and prompt from the specific filing.
- r7: Public job and prompt from the specific filing.
- r7: Public job and prompt from the specific filing.
- r7: Public job and prompt from the specific filing.
- r7: Public job and prompt from the specific filing.
- r7: Public job and prompt from the specific filing.
- r7: Public job and prompt from the specific filing.
- r7: Public job and prompt from the specific filing.
- r8: Public job and prompt from the specific filing.
- r8: Public job and prompt from the specific filing.
- r8: Public job and prompt from the specific filing.
- r8: Public job and prompt from the specific filing.
- r8: Public job and prompt from the specific filing.
- r8: Public job and prompt from the specific filing.
- r8: Public job and prompt from the specific filing.
- r8: Public job and prompt from the specific filing.
- r8: Public job and prompt from the specific filing.
- r8: Public job and prompt from the specific filing.
- r8: Public job and prompt from the specific filing.
- r8: Public job and prompt from the specific filing.
- r8: Public job and prompt from the specific filing.
- r9: Public job and prompt from the specific filing.
- r9: Public job and prompt from the specific filing.
- r9: Public job and prompt from the specific filing.
- r9: Public job and prompt from the specific filing.
- r9: Public job and prompt from the specific filing.
- r9: Public job and prompt from the specific filing.
- r9: Public job and prompt from the specific filing.
- r9: Public job and prompt from the specific filing.
- r9: Public job and prompt from the specific filing.
- r9: Public job and prompt from the specific filing.
- r9: Public job and prompt from the specific filing.
- r10: Public job and prompt from the specific filing.
- r10: Public job and prompt from the specific filing.
- r10: Public job and prompt from the specific filing.
- r10: Public job and prompt from the specific filing.
- r10: Public job and prompt from the specific filing.
- r11: Public job and prompt from the specific filing.
- r11: Public job and prompt from the specific filing.
- r11: Public job and prompt from the specific filing.
- r11: Public job and prompt from the specific filing.
- r11: Public job and prompt from the specific filing.
- r11: Public job and prompt from the specific filing.
- r11: Public job and prompt from the specific filing.
- r11: Public job and prompt from the specific filing.
- r11: Public job and prompt from the specific filing.
- r11: Public job and prompt from the specific filing.
- r11: Public job and prompt from the specific filing.
- r11: Public job and prompt from the specific filing.
- r11: Public job and prompt from the specific filing.
- r12: Public job and prompt from the specific filing.
- r12: Public job and prompt from the specific filing.
- r12: Public job and prompt from the specific filing.
- r12: Public job and prompt from the specific filing.
- r12: Public job and prompt from the specific filing.
- r12: Public job and prompt from the specific filing.
- r12: Public job and prompt from the specific filing.
- r12: Public job and prompt from the specific filing.
- r12: Public job and prompt from the specific filing.
- r12: Public job and prompt from the specific filing.
- r13: Public job and prompt from the specific filing.
- r13: Public job and prompt from the specific filing.
- r13: Public job and prompt from the specific filing.
- r13: Public job and prompt from the specific filing.
- r13: Public job and prompt from the specific filing.
- r13: Public job and prompt from the specific filing.
- r14: Copyable prompt written as instructions to the AI.