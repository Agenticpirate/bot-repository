# Subagent

## What it does

Spawns autonomous background agents (subagents) that work independently while your main conversation keeps going. Your assistant can fan a single request out into several workers at once: research one thing while it drafts another, investigate a problem off to the side, or pull in a second opinion before committing to an approach.

Each subagent runs in its own context with its own task, so heavy work like deep research, multi-file exploration, and long-running monitoring happens without crowding out your chat. Your assistant decides when delegating is worth it and reports back when a subagent finishes.

## Setup required

None. Works immediately.

## Permissions

- Subagents inherit the same permission rules as your main assistant.
- Each subagent gets a **role** that scopes which tools it can use, so a worker only has the access its task needs.
- Only the conversation that started a subagent can check on it, message it, or stop it.

## Common prompts

| You say...                                              | What happens                                          |
| ------------------------------------------------------- | ----------------------------------------------------- |
| “Spawn an agent to research AI startups in healthcare”  | Launches a background researcher                      |
| “Research the options while you start on the migration” | Runs two subagents in parallel                        |
| “Dig into why this build keeps failing”                 | Delegates to a researcher for root-cause analysis     |
| “Get a second opinion on this plan before we build it”  | Consults the advisor, which reports its guidance back |
| “Check on my research agent”                            | Gets the status of a running subagent                 |
| “Cancel the background agent”                           | Aborts a running subagent                             |

## Spawn modes

There are three ways a subagent can start. Your assistant picks the right one for the task, and you can also ask for a specific one.

| Mode        | How it runs                                           | What it knows                                                                               |
| ----------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Regular** | In the background, in parallel with your conversation | Only the objective and context it's given                                                   |
| **Fork**    | In the background, in parallel with your conversation | Inherits your full conversation (messages, context, and memory)                             |
| **Advisor** | In the background, in parallel with your conversation | A written brief from your assistant; runs on a more capable model and reports back guidance |

- **Regular.** For self-contained work with a clear objective. The subagent doesn't need to know what you've been discussing.
- **Fork.** For work that builds on the conversation so far (“dig deeper on what we just found”). A fork shares your context instead of having it re-explained.
- **Advisor.** A one-shot, read-only second opinion, and the one kind your assistant reaches for on its own judgment: to pressure-test a plan on a consequential or ambiguous task, or when it's stuck. Routine work skips the consult, so you're not paying for sign-off on the obvious. It reasons from a brief your assistant writes it (the task, the plan, the evidence gathered so far, and the question) and can read and search the files in your workspace to check a fact, then reports back focused guidance. Your assistant keeps working while the advisor thinks and weighs the guidance in when it arrives, so a consult never stalls your conversation. It never changes anything, and it cannot see your conversations. Because it runs on a more capable model, it also runs to a fixed budget of a few lookups and a few minutes, so a consult cannot quietly become an expensive open-ended job, and it answers once rather than being sent follow-ups: a further question is a fresh consult.

## Roles

Every subagent runs with a role that determines which tools it can touch. There are three, and your assistant picks between them with two questions: does the task need to change anything, and what does it want back, findings, work done, or guidance? All three run in the background and report back, so the choice is about the result rather than about waiting. Your assistant picks the most restrictive role that can still do the job, which keeps each worker's blast radius small.

| Role           | Tools                                                                                                   | Best for                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Researcher** | Read-only: web search, reading and searching files, and recall                                          | Web and document research, codebase exploration, planning, root-cause analysis and debugging            |
| **Builder**    | Everything your assistant can reach, including writing files, running commands, and your connected apps | Writing and editing files, running commands, build and test work, anything that has to change something |
| **Advisor**    | Read-only fact checking: reading and searching the files in your workspace                              | A one-shot strategic review, reported back while your assistant keeps working                           |

- **Older names still work.** Planner and investigator run as a researcher; coder and general run as a builder. The result names the role that actually ran.
- **Anything else becomes a persona.** Ask for a role that isn't one of the three (“a staff security engineer”) and the subagent runs read-only as a researcher with that description shaping how it approaches the task. An invented role never quietly gains the ability to change things.
- **No role named.** A subagent spawned without a role runs as a builder, with the same tools your assistant has.
- **Checking work is a researcher job.** Ask whether something is really done (“verify every item on that list”) and your assistant sends a read-only researcher that answers pass or fail per item with the evidence behind each call, and says so plainly when the evidence isn't there. Checking is mechanical, so it runs on a cheaper model than an open-ended investigation would.

## Working with a subagent

A subagent follows a simple lifecycle: it starts pending, then runs, and ends completed, failed, or aborted. You don't have to watch for the finish. Your assistant is notified automatically when a subagent ends and follows up with the result.

While one is running, you can stay in the loop:

- **Check status.** Ask how a worker is doing, or what all of them are up to.
- **Read its output.** Pull back what a subagent produced once it finishes.
- **Send a follow-up.** Hand a running subagent new instructions or a course correction.
- **Cancel it.** Stop a subagent you no longer need.
- **Name it.** Give a subagent a memorable label (“the auth research”) so it's easy to refer back to.

Subagents can also reach back on their own. They can surface an interim finding, flag an important result, or signal that they're blocked and need a decision, so you can act on partial progress instead of waiting for the whole task to finish.

## Configuration

- **Silent mode.** A subagent's result can be handled internally by your assistant instead of shown to you, for work that's a means to an end. Forks are silent by default.
- **Model selection.** A subagent can run under a specific model profile. By default it uses its own, not the one your conversation is set to, so switching models mid-chat does not change what your delegated work costs. Checking work runs on a cheaper model.
- **Status tracking.** Pending, running, completed, failed, aborted.
- **Results.** Delivered back through your assistant as a follow-up once a subagent finishes.

## Tips & gotchas

- **Genuinely parallel.** Regular subagents and forks run in the background while you keep chatting, and you can have several going at once.
- **Context is a choice.** A regular subagent starts fresh and only knows what it's given. Use a fork when the task needs to know what you've been discussing.
- **Delegation scales with the task.** Quick lookups happen inline in your conversation; a subagent is for extensive work, like a deep research sweep or an investigation that would otherwise flood the chat. Most tasks need zero or one.
- **No need to poll.** Your assistant is notified automatically when a subagent completes, so you don't have to keep asking.
- **One level deep.** Subagents can't spawn their own subagents, which keeps delegation predictable.
- **Great for long tasks.** Deep research, monitoring, and batch processing are ideal use cases.
