# Your First Skill

Skills are how your agent learns to do new things. Not prompts you type once and forget, but durable capabilities you teach your agent once, and it keeps doing them for you.

The model matters, but it was never the thing holding you back. A raw agent does not know your work, your voice, your tools, or the way you like things done. Skills close that gap. Your agent comes with 40+ built-in skills, and you can teach it new ones just by talking to it.

## Why skills matter

Most people use AI as a chat. Ask something, get an answer, move on. The next day they ask the same thing and the agent starts from zero. That is not a problem with the model. It is a problem with the architecture.

A skill is the opposite of a one-off chat. It is a workflow you teach your agent once, and it runs the same way every time, with your format, your voice, your tools, and your edge cases locked in.

## What's a skill?

A skill gives your agent a new ability. It is a folder with a recipe, reference files, and tool declarations that teach your agent how to do one specific job well.

- The **Weather** skill checks forecasts for any location
- The **Gmail** skill reads, writes, and manages your email
- The **DoorDash** skill orders food, delivered to your door
- The **Schedule** skill sets up recurring tasks and reminders

You do not have to think about skills at all. Your agent picks the right one when you ask it to do something. But knowing they exist, and that you can build your own, changes what is possible.

## Built-in skills

Your agent ships with 40+ skills across communication, productivity, automation, development, and media. Most work instantly. A few, like Gmail, Slack, and Phone Calls, need a one-time setup, and your agent walks you through it on first use.

For the full list, see the [Skills Reference](https://www.vellum.ai/skills).

## Installing community skills

Want something that is not built in? There is a growing library of community skills at [skills.sh](https://skills.sh). Just ask:

> "Search for a Notion skill."

Your agent finds it, shows you what it does, and installs it with your permission. From there it works just like a built-in skill.

## Building a custom skill

This is where it gets powerful. You can create new skills by describing what you want in the chat. Do not treat it as a feature request. Treat it as teaching. You are writing a recipe your agent will follow every time.

### Step 1: Pick one task

Pick something you do every week and find tedious. Specific, not generic. Not "write blog posts." Something like:

> "Check our competitor pricing every Monday and give me a table with price, change, and verdict."

> "Read our overnight support tickets, group them by category, and post a summary to Slack at 9 AM."

The narrower the better. A skill that does one thing well beats a skill that tries to do everything.

### Step 2: Draft the recipe

Your agent drafts the skill from what you described. It writes the instructions, bundles any reference notes and scripts the workflow needs, and sets the format. It does this with its built-in **Skill Management** skill, the skill that builds skills. You do not invoke it directly. Just describe what you want and your agent reaches for it automatically.

A good skill has four ingredients:

1. **Clear purpose.** One task, one output.
2. **Workflow steps.** The exact sequence your agent follows every time.
3. **Tool access.** What it needs to read, search, or call.
4. **Output format.** What a perfect result looks like. Show an example.

Your agent asks follow-up questions if it needs more detail. Be specific about format, voice, and edge cases. The recipe is only as good as the instructions.

### Step 3: Test and iterate

Once the skill is saved, run it and look at the output. The first run is almost never perfect, and that is expected. Tell your agent what is off and have it fix it: a missing column, the wrong tone, a competitor you forgot to mention.

This is the teaching loop. Run it, judge it, fix it. Three rounds usually gets you to reliable, and the refinement is where the skill becomes yours.

### Step 4: Refine until reliable

Your skill is saved as plain text files in `~/.vellum/workspace/skills/`. You can:

- Edit the files directly in any text editor
- Ask your agent to tweak it ("Make the verdict column bold")
- Add reference docs, like a brand voice guide or a glossary
- Add a schedule so it runs automatically
- Share it with other Vellum users

A reliable skill is one you trust enough to run without checking the output first. That is the payoff: it stops being work you do and becomes work your agent does for you.

***

*For documentation on every built-in skill, see the [Skills Reference](https://www.vellum.ai/skills). Or keep going to [Key Concepts](/docs/key-concepts) to understand how it all fits together.*
