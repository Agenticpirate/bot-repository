# Self-improving Skills

Your assistant can preserve a useful procedure after it has actually carried it out, then reuse that procedure when a similar task comes up. The result is a managed skill that remains visible and under your control.

This capability connects what your assistant remembers with what it knows how to do. For the broader concepts, see [Memory & Context](/docs/key-concepts/memory-and-context) and [Tools & Skills](/docs/key-concepts/skills-and-tools).

## What are skills?

Skills are reusable sets of instructions, tools, and supporting files that teach your assistant how to handle a particular kind of task. A skill can describe when to use it, the steps to follow, checks to make along the way, and what a finished result looks like.

Vellum includes skills for common tasks, and you can add or create more. When a request matches a skill, your assistant loads its instructions and follows the procedure instead of starting from scratch.

## What self-improving means

Self-improving does not mean that Vellum retrains the model or changes its underlying intelligence. After eligible work is complete, memory can preserve procedures your assistant actually used as reusable instructions.

The distinction is practical: facts, preferences, decisions, and other things worth recalling remain memories, while repeatable procedures can become skills. This lets your assistant retain both what happened and how to perform useful work again without confusing the two.

## How a skill is learned

Learning starts with completed work. Memory reviews what the assistant actually did, including the sequence it followed, the tools it used, and the outcome it reached. It does not turn an untested suggestion or a procedure the assistant merely described into a skill.

When the work contains a reusable procedure, Vellum can express that procedure as a managed skill with instructions and supporting files. Future conversations can then load the skill when a request calls for the same kind of work.

## What qualifies

A procedure qualifies when it represents useful, repeatable work that the assistant actually carried out and that is not already covered by an existing skill. A one-time fact, a preference, or a project update remains memory because recalling it is more useful than turning it into instructions.

For example, learning that a project uses a particular hosting provider is a fact. Learning the concrete steps the assistant used to deploy that project can be a procedure. Only the second belongs in a skill.

## Create vs. refine

Before creating anything, Vellum checks the skills already available to your assistant. It creates a new skill only when the procedure is distinct. If an assistant-authored skill already covers the work, Vellum may refine that skill with what the assistant verified in the new conversation.

Vellum does not overwrite skills you authored or other skills you installed. Those remain unchanged, so automatic learning cannot replace instructions that came from you or another source.

## When you see it

A learned skill is created after the work is complete, then announced for review. You do not need to approve it before it is created.

When Vellum learns a genuinely new skill, the source conversation shows an “I just learned how to do...” card. Opening the card takes you to the learned skill so you can inspect what was preserved. Routine memory updates and refinements that do not create a distinct new skill do not produce this card.

## Review, edit, or remove

Learned skills are managed skills, not hidden changes to the model. From Skills, you can view a skill’s files, edit its text files when you want to adjust the procedure, and inspect its source conversation when that lineage was recorded.

You can also remove a learned skill from Skills. Removing it stops the procedure from being available as that managed skill while leaving the original conversation intact.

## Boundaries

Learning a skill does not make it active in every conversation. Like other skills, it loads only when the current request is relevant, which keeps unrelated instructions out of the way.

A learned skill also does not gain broader access than the tools it uses. Those tools keep their normal permission boundaries, and the assistant must still operate within the access available in the current context. To understand how skills package instructions and tools, return to [Tools & Skills](/docs/key-concepts/skills-and-tools). To learn how facts and prior conversations are recalled, return to [Memory & Context](/docs/key-concepts/memory-and-context).
