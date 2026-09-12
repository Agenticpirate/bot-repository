# Anti-Patterns

Ten mistakes that make Claude Co-work feel useless. All of them are common. Most of them are things the official tutorials tell you to do.

Read this once. Five minutes. Saves you weeks.

---

## 1. Prompting Co-work like it's ChatGPT

**The mistake:** Task-first prompts. "Write an email to Sarah." "Summarize this article." Step-by-step instructions as if you're talking to a chatbot.

**Why it's wrong:** Co-work is designed to complete work, not to answer questions. When you prompt it like Chat, you get Chat outputs — text in a window — from a tool that's capable of dropping finished files in your folder.

**Do this instead:** Outcome-first prompts. Describe the finished deliverable, the format, where it should be saved, and the quality bar. Then get out of the way.

---

## 2. Pointing Co-work at your whole Documents folder

**The mistake:** "Give Co-work access to ~/Documents so it has access to everything."

**Why it's wrong:** Blast radius. The more Co-work can see, the more ways it can make a mistake you won't notice for weeks. Also: performance gets worse as the accessible surface grows — more files to search, more context to hold, slower outputs.

**Do this instead:** One folder per type of work. A dedicated Co-work workspace with `/context`, `/projects`, `/output` subfolders. Scoped permissions per project when you can set them.

---

## 3. Skipping the context files and going straight to prompts

**The mistake:** "I'll just write good prompts every time." No `about-me.md`, no `voice.md`, no `preferences.md`.

**Why it's wrong:** Every session you'll re-explain who you are, what you care about, and how you want the work done. You won't do this. So instead Co-work will make assumptions, and the outputs will feel generic because Co-work doesn't know you.

**Do this instead:** Thirty minutes, once. Three files. Done. Every future session inherits the context.

---

## 4. Treating projects as file storage

**The mistake:** "Projects are folders. I'll put my client files in one project and my content files in another."

**Why it's wrong:** You're using 10% of what projects do. Projects accumulate instructions, feedback, past outputs, and adjustments you've made. Each run builds on the last. Without this, every run is starting from zero.

**Do this instead:** One project per *recurring workflow*, not per topic. Weekly reporting gets a project. Client deliverables gets a project. Content production gets a project. Let each one compound.

---

## 5. Designing skills before doing the work

**The mistake:** "I want a weekly report skill. Let me design it." Open a blank file, write detailed step-by-step instructions, save, never look at the output.

**Why it's wrong:** Your first version of anything is a guess. A skill designed before you've done the work captures your guesses, not what actually works.

**Do this instead:** Run the workflow manually. Iterate with Co-work until the output is what you want. *Then* say "turn this conversation into a skill." The skill it writes is calibrated against real work.

---

## 6. Scheduling a task before running it manually

**The mistake:** "I'll schedule this to run every morning." You set it and forget it. A week later you realize it's been producing garbage for five days.

**Why it's wrong:** Scheduled tasks amplify whatever quality of prompt you gave. A bad prompt becomes a bad prompt that runs 20 times a month.

**Do this instead:** Run the prompt manually at least three times. Get the output you want. Then schedule it. And read the first week's output every morning — calibration doesn't end at the first run.

---

## 7. Using browser use and computer use because they're impressive

**The mistake:** "Co-work can control my browser. Watch this." You spend 20 minutes watching Co-work click through a workflow that would've taken you 90 seconds.

**Why it's wrong:** Browser use and computer use are slow (every step takes a screenshot), unreliable (stops halfway often), and expensive (burns usage fast). They look great in tutorial videos and fail in real work.

**Do this instead:** Native connectors for anything where a connector exists. Direct file operations for anything local. If you absolutely need web access and no connector fits, fine — but revisit this in six months, not today.

---

## 8. Saying "remember this" without saving anywhere

**The mistake:** You give Co-work a correction. "Actually, I prefer tables here, not bullets." Co-work says "got it." You assume it'll remember.

**Why it's wrong:** Co-work's memory at the task level is not persistent unless you explicitly save it to a file. Next session, it forgot.

**Do this instead:** When you give a correction worth keeping, say: "Save that to `memory.md` so next session this is baseline behavior." Now it's durable.

---

## 9. Treating Co-work like a chatbot during long tasks

**The mistake:** You ask Co-work to do something multi-step. You sit and watch every step. You intervene constantly.

**Why it's wrong:** You're using one of the few tools that can actually complete work while you do something else — and you're babysitting it like a chatbot. The whole point is: kick off the task, go do something else, come back to finished work.

**Do this instead:** Set up the task with clear outcomes, approve the plan, and leave. Use the time you save. Come back and review the output. That's the shift.

---

## 10. Building 47 skills when you haven't mastered 3

**The mistake:** "I'll build a skill for every workflow in my job." You have 40 half-finished skills after two weeks and use none of them.

**Why it's wrong:** Skills compound through use, not through design. A skill you've run 30 times has been tuned 30 times and is excellent. A skill you built and never ran is a placeholder.

**Do this instead:** Build a skill only for workflows you're running at least twice a week. Three well-tuned skills beat thirty half-built ones. Quantity is the enemy of quality here.

---

## A final note

These anti-patterns are common because they feel productive. Adding more folders feels productive. Building more skills feels productive. Scheduling more tasks feels productive. Clicking through a browser-use demo feels productive.

None of it is productive unless it ends with work you didn't have to do. That's the measure. Everything else is theater.
