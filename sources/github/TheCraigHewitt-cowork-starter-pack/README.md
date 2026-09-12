# Claude Co-work Starter Pack

Claude Co-work is powerful out of the box — and almost useless until it knows who you are and how you work. This pack is the 30-minute setup that fixes that.

Inside:
- **3 context files** that tell Co-work who you are, how you write, and how you work. Write once. Never re-explain yourself again.
- **Global instructions** with safety rails and sensible defaults. Paste once, applies everywhere.
- **7 universal skills** for the workflows every knowledge worker runs weekly:
  - `morning-brief`, `weekly-report`, `meeting-prep`, `meeting-debrief`, `inbox-triage`, `research-brief`, `doc-summarize`
- **A prompt library** of 18 outcome-first prompts you can copy-paste for common jobs
- **Scheduled task recipes** — ready-to-paste automations for your morning, Monday, and Friday
- **Anti-patterns** — 10 setup mistakes that make Co-work useless, and how to avoid them

Built for anyone who runs their week through a calendar and an inbox: executive assistants, marketers, operators, founders, analysts. Not role-specific. Not developer-specific.

---

## 5-minute setup

1. **Download this repo** — click the green `Code` button at the top of this page → `Download ZIP`. Unzip. Or clone it if you know git.
2. **Pick or create your Co-work workspace folder.** Somewhere simple, like `~/Documents/cowork-workspace`.
3. **Copy three things into your workspace folder:**
   - The whole `context/` folder
   - The `global-instructions.md` file
   - The `skills/` folder
4. **Paste `global-instructions.md` into Co-work's global settings.** Open Claude desktop → Settings → Co-work → Global Instructions. Paste the whole file in. Save.
5. **Fill in the three context files.** Open each one. There's a filled example at the top so you can see what good looks like, and a blank template below. Delete the example, fill the template, save. Ten minutes per file max.

That's the baseline. Now Co-work knows who you are.

---

## 30-minute setup (recommended)

The skills and prompts are where this pack earns its keep.

6. **Verify the skills are active.** Open Co-work, point it at your workspace folder, and type `/morning-brief`. If the skill runs, you're wired up.
7. **Skim `prompts/prompt-library.md`.** Bookmark the three or four prompts that match your most common jobs.
8. **Pick one scheduled task recipe** from `scheduled-tasks/recipes.md`. Start with `morning-brief` — set it to run every weekday at 7am. Come back to your desk tomorrow and see if you like the output. Iterate.
9. **Read `anti-patterns.md` once.** It's the "what not to do" list. Takes five minutes and saves you hours.

---

## Role-specific notes

Same pack, different emphasis.

- **Executive assistant.** Your `about-me.md` should name the principal you support, their calendar conventions, and who they prioritize. Your `preferences.md` should be specific about tone and sign-offs. Lean hard on `meeting-prep` and `inbox-triage`.
- **Marketer.** Your `voice.md` is doing the heavy lifting — fill it with your *brand* voice, not yours personally. Lean on `research-brief` for competitor scans and `doc-summarize` for long reports.
- **Operations / COO type.** Your `preferences.md` is where the value is: report formats, decision thresholds, escalation rules. Lean on `weekly-report` and `meeting-debrief`.
- **Founder / CEO.** All three context files matter. Lean on `meeting-debrief` for your recurring 1-1s and `research-brief` for anything you'd normally Google.
- **Analyst / researcher.** Lean hard on `doc-summarize` and `research-brief`. Your `preferences.md` should specify source-citation and confidence-level requirements.

---

## Power user: install as a plugin

If you'd rather install via Co-work's plugin system instead of copying files:

```
/plugin marketplace add thecraighewitt/cowork-starter-pack
/plugin install cowork-starter-pack
```

The skills will auto-discover. You'll still want to copy `context/` and `global-instructions.md` manually — those are content you edit, not code you install.

---

## A note on what's *not* in here

I deliberately kept this tight. You will not find:

- 25 role-specific skills that nobody will ever use
- A 70-prompt library that nobody will ever read
- Anything for browser use or computer use — those features aren't ready
- Developer-focused skills for code review, git, etc. — different pack, different audience

Seven skills, each covering a weekly-recurring workflow that works for any job. That's the bet.

---

## About

Made by [Craig Hewitt](https://craighewitt.com). I build AI systems for founders, CEOs, and the people who run their companies.

- YouTube: [@thecraighewitt](https://youtube.com/@thecraighewitt)
- X: [@thecraighewitt](https://x.com/thecraighewitt)
- Site: [craighewitt.com](https://craighewitt.com)

If this was useful, the companion video — *10 Claude Co-work Tips Nobody Is Showing You* — walks through the thinking behind every piece of this pack.

MIT License.
