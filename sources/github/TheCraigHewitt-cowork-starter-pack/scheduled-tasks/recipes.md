# Scheduled Task Recipes

Six ready-to-paste scheduled tasks. Each one has been thought through: what it does, when to run it, what it needs, what to check for.

Scheduled tasks are where Co-work stops being an AI you use and becomes infrastructure that works for you. But:

- **Test manually first.** Run the prompt interactively at least three times. Confirm the output is what you want. Only then schedule it.
- **Your computer has to be on and Co-work open** for scheduled tasks to fire. They run locally.
- **Every run costs tokens.** Keep prompts tight.
- **Review the output.** For the first week, actually read the output every morning. Tune the prompt. Save corrections to `memory.md`.

---

## 1. Morning Brief (weekdays, 7am)

**What it does:** Produces a daily briefing of calendar, inbox, and messages. You wake up to it.

**Prompt:**
> Run the `morning-brief` skill for today. Pull from my calendar, Gmail, and Slack connectors. Use the "inbox that matters" filter — not every email, only the ones that meet the criteria in the skill. Save the file to `/output/`. Ping me in Slack DM when it's ready with the one-line TL;DR.

**Schedule:** Monday–Friday, 7:00 AM (your time zone)

**Needs:** Google Calendar connector, Gmail connector, Slack connector (optional)

**What to watch for the first week:** Is the inbox filter too aggressive or too loose? Are the "top 3 priorities" actually your priorities? If not, tell Co-work during the day and save to `memory.md`.

---

## 2. Weekly Report (Fridays, 4pm)

**What it does:** Produces a one-page weekly report — what moved, what stalled, decisions made, next week's focus.

**Prompt:**
> Run the `weekly-report` skill for this week (Monday through today). Compare to last week's report in `/output/weekly-report-*.md` — did last week's priorities actually move? Save to `/output/`. Ping me with the one-line version when done.

**Schedule:** Friday, 4:00 PM

**Needs:** Calendar, Gmail, any messaging connector, `/output/` folder access

**What to watch for:** Is the "What stalled" section honest? If you find yourself editing it to be less blunt, Co-work learned that from you — correct it and save the correction to `memory.md`.

---

## 3. Monday Morning Week-Ahead Planner (Mondays, 7:30am)

**What it does:** After the morning brief, produces a separate plan for the week — what matters, what to protect time for, what to say no to.

**Prompt:**
> It's Monday. Before I start the week: pull this week's calendar, any commitments I made last week that come due this week, and last week's weekly-report `Next week's focus` section. Produce a one-page week plan:
> 1. The 3 things that have to happen this week
> 2. What's at risk if I don't protect time for them
> 3. Anything on my calendar I should consider declining or shortening
> 4. Any commitments I'm behind on
>
> Save to `/output/week-plan-{YYYY-MM-DD}.md`. Ping me when ready.

**Schedule:** Monday, 7:30 AM

**Needs:** Calendar, `/output/` access, last week's weekly report

**What to watch for:** This one's supposed to be uncomfortable. If it keeps telling you everything looks fine and you know it doesn't, your calendar isn't showing Co-work enough. Add more context.

---

## 4. Competitive Scan (Monday, 9am)

**What it does:** Checks public sources for updates on your competitors, your industry, or a named list of topics. Summarizes what changed.

**Prompt:**
> Run a weekly competitive scan. Check for updates from: [list 3–6 competitors, companies, or topics]. Look at: their blog/newsroom, X accounts if I've listed handles, any press coverage in the last 7 days. Produce a short brief:
> - Who had material updates this week (product launches, funding, exec changes, public moves)
> - What I should pay attention to
> - Anything that contradicts our current strategy
>
> Skip anyone with no material news. Save to `/output/competitive-scan-{YYYY-MM-DD}.md`.

**Schedule:** Monday, 9:00 AM

**Needs:** Web search

**What to watch for:** Don't let the list of subjects balloon. Six maximum. More than that and the signal-to-noise ratio crashes.

---

## 5. Inbox Triage (weekdays, 1pm)

**What it does:** Processes the inbox over lunch — archives the noise, drafts the easy replies, flags the decisions.

**Prompt:**
> Run the `inbox-triage` skill for emails received since this morning's brief. Do not send, archive, or label anything — just produce the triage file and hold the drafts for my review. Ping me when it's ready with the count of flagged-for-decision items.

**Schedule:** Monday–Friday, 1:00 PM

**Needs:** Gmail connector

**What to watch for:** The first week's drafts will be rough. Correct them in place. Save "never draft this kind of email automatically" rules to `memory.md`. Within two weeks the drafts will be 80% send-as-is.

---

## 6. End-of-Day Recap (weekdays, 6pm)

**What it does:** Captures what you actually did today — not what was on your calendar, what moved. Future-you will thank you.

**Prompt:**
> Run an end-of-day recap. Pull from today's calendar, any files I created or modified in `/output/` today, any messages I sent or decisions I made. Produce a short file:
> - What I actually got done today
> - What I said I'd do but didn't
> - Anything I committed to today that I need to remember tomorrow
>
> Save to `/output/eod-{YYYY-MM-DD}.md`. Don't ping me — just save it.

**Schedule:** Monday–Friday, 6:00 PM

**Needs:** Calendar, messaging, file system

**What to watch for:** This one's not for reading daily — it's for reading back in two months. Check your recaps on a slow week and see if they tell a story. If they don't, the prompt needs more inputs.

---

## How to wire one up

1. Open Co-work. Left sidebar → Scheduled tasks → New task.
2. Paste the prompt from above. Name the task. Set the schedule.
3. Run it manually once (the "Run now" button). Check the output.
4. Tune the prompt. Run manually again. Check again.
5. When the output is what you want two runs in a row, turn on the schedule.

## Warnings

- **Don't schedule everything on day one.** Pick one (morning brief is the easy win). Live with it for a week. Then add a second.
- **Don't schedule something that sends external messages.** Scheduled tasks shouldn't send emails, Slack to colleagues, or calendar invites on your behalf without showing you first. Have them *draft* and flag, not send.
- **If a scheduled task breaks**, you'll keep getting bad output every morning until you notice. Set a mental reminder the first week to actually read your outputs.
