# Prompt Library

18 copy-paste prompts for common jobs. Each one is outcome-first — you describe the finished deliverable, Co-work produces it.

The trick with all of these: fill in the bracketed parts with your specifics, then don't over-edit. The structure is doing work. Add detail where it matters, cut where it doesn't.

**Curated, not exhaustive.** Other starter packs ship 70 prompts nobody reads. These are the ones I reach for repeatedly.

---

## Communication

### 1. Draft an email you've been putting off

> Draft an email from me to [recipient] about [topic]. Context: [why you're writing, what happened, what you want]. Constraints: under 150 words, match my voice from `voice.md`, end with a specific ask. Don't send — show me the draft first.

### 2. Turn a Slack rant into a diplomatic email

> I just wrote this in Slack [paste Slack message]. I need to send the same information as an email to [recipient], but professionally. Keep the substance. Lose the tone. Match my voice from `voice.md`. Under 200 words.

### 3. Write a hard "no"

> Draft a reply declining [request] from [person]. Tone: warm but firm. I don't want to leave room for negotiation, but I don't want to burn the relationship either. Under 100 words. Show me before sending.

### 4. Draft an awkward follow-up

> Draft a follow-up to [person] about [topic] — I haven't heard back in [X days] and I'm worried I seem pushy. Help me send a short, light follow-up that doesn't read as anxious. Under 80 words.

---

## Research & analysis

### 5. Brief me on someone before a call

> I have a call at [time] with [name] from [company]. Pull everything relevant: their role, their company's current state, our prior email threads with them, and anything notable from the last 90 days. Give me a one-page brief using the `research-brief` format. Tell me one thing you think I'd miss.

### 6. Compare three options side-by-side

> I'm deciding between [option A], [option B], and [option C] for [use case]. Research each. Produce a comparison table: [3–5 criteria that matter]. Then give me your recommendation and a one-sentence reason. Flag anything you're uncertain about.

### 7. Steel-man the opposite view

> I'm leaning toward [decision]. Steel-man the opposite. What's the strongest version of the argument against what I'm about to do? Don't hedge. If there's a real risk I'm missing, say so.

### 8. What changed since last time

> Last time I researched [topic / company / market], I wrote the brief in `/output/[prior-file]`. What's changed since then? Only tell me what's new or different. Don't re-state what I already know.

---

## Writing & content

### 9. Outline a document from a messy brain-dump

> Here's my rough thinking on [topic] [paste brain-dump]. Turn this into an outline I can write from. Identify the core argument, the supporting points, and the order they should go in. Flag anything that doesn't belong.

### 10. Draft in my voice, not AI voice

> Draft [document type] about [topic]. Use my voice from `voice.md`. Before you start, tell me in one line what you're going to do to match the voice. Then write it. If it comes out sounding generic, we'll iterate.

### 11. Tighten this writing

> Cut this by 40% without losing the substance: [paste text]. Kill filler. Remove hedging. Keep every concrete detail. If you can't cut 40% without losing something important, cut what you can and tell me why.

### 12. Rewrite for a different audience

> This was written for [original audience]: [paste text]. Rewrite for [new audience]. Change the framing, the level of detail, and the tone — but keep the facts. Show me both versions side by side so I can see the delta.

---

## Operations & meetings

### 13. Give me the week I just had

> Give me a weekly report for the week of [start date] using the `weekly-report` skill. Be honest in the "stalled" section — don't smooth things over.

### 14. What did I commit to this week?

> Scan my calendar, email, and messages from the last 7 days. Extract every commitment I made — deliverables, deadlines, intros, reviews. Organize by who I owe, what I owe them, by when. Flag anything I've already missed.

### 15. Meeting prep in under 2 minutes

> I have [meeting] at [time]. Prep me using the `meeting-prep` skill. Focus on: [anything specific the user wants emphasized].

### 16. Debrief a meeting I just finished

> I just finished [meeting]. Here are my rough notes: [paste]. Use the `meeting-debrief` skill. Draft the follow-up email — under 150 words, in my voice. Don't send, just show me the draft.

---

## Thinking & decisions

### 17. Help me make a decision I've been stalling on

> I've been stalling on [decision]. Here's what I know: [context]. Here's what's been keeping me stuck: [obstacle]. Don't tell me what to do. Ask me three questions that'll force me to clarify what I actually think.

### 18. Capture this decision for future-me

> I just decided [decision]. The context: [what prompted it]. The reasoning: [why this over alternatives]. What I expect to happen: [prediction]. Save this as a decision-log entry to `/output/decisions/{YYYY-MM-DD}-[short-name].md` so I can look at it in 90 days.

---

## How to use this library

- **Copy, don't type from scratch.** These prompts are calibrated. Typing "kinda like the one I saw but with some changes" loses the calibration.
- **Fill the brackets, keep the structure.** The non-bracketed parts are doing work even when they feel redundant.
- **If a prompt isn't working for your situation, tell Co-work what went wrong.** It'll adjust. Save the correction to `memory.md` so the next run is better.
- **Add your own.** The best prompts are the ones you write for your exact recurring jobs. Steal the structure: outcome, constraints, format, permission to ask for more context.
