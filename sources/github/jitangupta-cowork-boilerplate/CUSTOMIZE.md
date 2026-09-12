# Customize This Boilerplate

## How to Use This

Copy the `template/` folder to your computer. Open Cowork, select the folder, and paste the prompt below. Cowork will ask you about your workflow and fill in all the files.

---

## The Customization Prompt

Copy everything below the line and paste it into Cowork:

---

```
I want to set up a Cowork workflow using this boilerplate. The template/ folder contains a skeleton structure with placeholder files.

Here's what I need you to do:

1. Read all the files in this folder to understand the structure:
   - CLAUDE.md (master instructions)
   - config/profile.md, config/rules.md, config/resources.md
   - jobs/instructions/_template.md, jobs/prompts/_template.md
   - projects/_template/ (input.md, STATUS.md)
   - scheduled/prompts/_template.md

2. Then interview me about my workflow. Ask me these things (one or two questions at a time, not all at once):

   ABOUT ME:
   - What do I do? What's my role?
   - Who is my audience or client?
   - What's my voice / tone? (formal, casual, technical, friendly?)
   - What makes my perspective unique?
   - Any hard rules or ethics boundaries?

   ABOUT MY WORKFLOW:
   - What kind of work do I repeat? (content, research, reports, client deliverables, etc.)
   - What does one "unit of work" look like? (a blog post, a report, a client project?)
   - What are the steps from start to finish?
   - Which steps need my approval before moving on?
   - Are there external review steps? (other AI tools, human reviewers, validation?)
   - Do I need any automated/scheduled tasks?
   - What tools or platforms do I use?

3. Based on my answers, fill in ALL the placeholder files:
   - config/profile.md — my identity and voice
   - config/rules.md — my quality standards and guardrails
   - config/resources.md — my tools and references
   - CLAUDE.md — master instructions with my specific jobs and triggers
   - Create job instruction files in jobs/instructions/ for each step in my pipeline
   - Create matching prompt files in jobs/prompts/ for each job
   - Customize projects/_template/ with the right folder structure for my work units
   - If I need scheduled tasks, create prompts in scheduled/prompts/

4. After filling everything in, show me a summary of what you created and how to use it.

Take your time with the interview — better to ask good questions upfront than to guess wrong.
```

---

## Manual Customization

If you prefer to fill things in yourself instead of using the prompt above:

1. **Start with `config/profile.md`** — this is who you are. Everything else references it.
2. **Then `config/rules.md`** — your quality standards and guardrails.
3. **Then `CLAUDE.md`** — replace all `[PLACEHOLDER]` and `[YOUR NAME]` markers.
4. **Create your jobs** — copy `_template.md` in both `jobs/instructions/` and `jobs/prompts/` for each step in your workflow.
5. **Customize `projects/_template/`** — add/remove/rename folders and files to match your work unit structure.
6. **Optional: scheduled tasks** — if you have automated workflows, create prompts in `scheduled/prompts/`.

## Tips

- **Start small.** Define one job first, test it, then add more.
- **Config is king.** The more context you put in `config/`, the better your prompts work.
- **Approval gates matter.** Mark steps as `[APPROVAL REQUIRED]` wherever you want to stay in control.
- **Status tracking prevents chaos.** Use `STATUS.md` to ensure jobs run in order.
- **Look at the examples.** The `examples/` folder shows two real implementations — one manual pipeline and one scheduled task.
- **Read ADVANCED.md when ready.** It covers Skills packaging, Hooks, MCP integration, and CLAUDE.md best practices from Anthropic's official docs.
