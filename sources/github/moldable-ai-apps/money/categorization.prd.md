# Moldable Money — Categorization & Review PRD

How transactions get categorized with **as little user work as possible**. Replaces
the current "Review / Categorize — N left" firehose (up to 30 merchant cards, each a
manual 4-way `budget.need` call) with an **auto-categorize-by-default, supervise-the-few**
system.

This doc is split into two work streams so the backend and frontend agents can each
own their half:

- **§B — Backend** (`src/server/**`, contracts, `moldable.json`): make the data arrive
  already-categorized (batched LLM, auto-accepted), let taught rules feed the LLM, and
  expose a curated review surface for corrections.
- **§F — Frontend / UX** (`src/client/**`): the auto-accept toggle, a short optional
  "sharpen" review, rules management, and correct-in-context.

> **Built end to end in one go — no phased rollout.** The ordering below is a
> _dependency_ map (what a task needs from the other stream), not a schedule.

Legend: `[x]` done & verified · `[~]` partial / exists but not wired · `[ ]` not built.

> **2026-06-18 — implemented end to end.** Backend (§B) shipped: `autoAcceptCategorization`
> setting, on-sync batched classify with auto-accept, `reason=low_confidence` review feed
> with inline `suggested`/`confidence`/`impact`, classification status (`classifying` +
> `processed`/`total`), and `DELETE /api/labels/rules/:id`. Frontend (§F) built against
> those exact contracts: curated impact-ranked Review queue with pre-filled suggestions,
> Accept-all, classification loader, layout-stable resolves (collapse + settle-lock) and
> staged-not-injected new results; auto-accept toggle + removable rules in Settings;
> correct-in-context with "apply to all {merchant}". Types/lint/build green; demo-mode
> shell + copy verified in-browser (the populated-queue + rules-list paths need live
> low-confidence data, not reachable in demo, but are wired to the shipped contracts).
> Note: "Accept all" applies each visible group's suggestion via `labelApply` + teachRule
> (reuses existing infra) rather than the `applySuggestions` batch RPC — same effect,
> simpler, and reversible from Settings → Rules.

---

## 1. Problem & intent

**Job-to-be-done:** _"Show me where my money goes and whether I'm okay — with ~zero
work."_ Categorization is a **means**, and it should be the system's job, not the
user's. The user's role shrinks to **supervising the few high-leverage calls** and
**teaching rules that make the backlog vanish** (and make the LLM smarter).

**What's wrong today**

- Review opens as a mandatory chore: "Categorize / N left" + a long list.
- Per-merchant, one-at-a-time, manual 4-way `Required/Useful/Optional/Waste` decision
  for up to 30 groups — high cognitive load, subjective.
- The agent pass is opt-in and only _pre-highlights_; it doesn't auto-apply anything or
  shrink the pile.
- No prioritization, no bulk accept, no finite _done_ state.
- Dashboard value feels gated on grinding through the list.

**The pattern category leaders use** (Copilot, Monarch, Mint, Rocket Money, Lunch
Money): auto-categorize on import → correction teaches a forward rule → only _uncertain_
items reach a short review inbox → dashboards never wait on labeling.

Most of the backend machinery already exists (classify w/ confidence + auto-apply,
impact-ranked merchant groups, batch apply-suggestions, `teachRule`, label rules,
recurring detection); the work is to **wire it into a low-effort, auto-accept-first flow.**

## 2. Target experience

- **Auto-categorize on sync (zero-touch, default).** Everything lands labeled: Plaid
  `personal_finance_category` → spending category, taught rules (mechanical), then a
  **batched LLM pass that is auto-accepted by default**. Dashboards render complete
  immediately, no review required.
- **Auto-accept toggle (Settings).** Default **on**. Turned **off** → LLM output is
  saved as _proposals_ the user confirms in Review instead of being applied. For
  cautious users / demos.
- **Rules are both mechanical and instructional.** A taught rule (`merchant → need /
category`) (a) deterministically forward-applies to exact matches, and (b) is **fed
  to the LLM as a signal/example** so it grades similar/ambiguous merchants the way the
  user would — especially on the subjective `need` axis.
- **Review = optional "worth a look," not homework.** When something is genuinely
  uncertain (or auto-accept is off), a short, impact-ranked queue (5–7) shows the
  agent's pick pre-filled → one tap confirm/correct, plus **"Accept all,"** with a
  reachable _done_ state. Framed as upside ("Sharpen your dashboards — covers ~$1.9k/mo").
- **Correct in context.** Recategorize from the transaction sheet or a dashboard
  drilldown row, with "always do this." No dedicated chore.
- **Always show when the agent is working.** While a classification batch is running,
  Review shows an in-progress activity indicator at the top of the page — people should
  never wonder whether something is happening or see items appear with no explanation.
- **Never shift content out from under an active control.** Approving must be safe under
  rapid taps: resolving an item must not slide the next one up into the button the user
  just pressed, and streaming results must not inject above what they're looking at.
  Nobody should approve something they never saw.

**Axis note:** `Required/Useful/Optional/Waste` is a subjective value judgment — lead
dashboards with **spending categories** (Plaid gives these free, zero effort) and make
the `need` axis an _agent-proposed, auto-accepted_ enrichment the user only overrides
when they disagree.

---

## §B — Backend work (`src/server/**`, contracts)

Owner: backend agent. Goal: data arrives already-categorized via a batched,
auto-accepted LLM pass that learns from taught rules; the review surface is curated and
confidence-aware for the cases that still need a human.

### B1. Batched auto-categorize on sync — auto-accept by default

- [x] After each import/sync, run a categorization pass automatically:
      **provider category → taught rules (mechanical) → batched LLM `classify`** for
      whatever remains.
- [x] The LLM pass is **batched** (chunk unlabeled rows; bounded batch size; reuse the
      registry-backed strict-JSON schema) and **auto-accepted by default**
      (`apply: true`) — labels become formula-visible immediately.
- [x] Gate auto-accept on the **`autoAcceptCategorization` setting** (B7): when **off**,
      run the same batched pass but `apply: false` (save proposals only) so they surface
      in Review instead.
- [x] Keep **confidence** on every label as a _ranking/guardrail_ signal (used by the
      review feed B3 and the nudge B6) — not as the accept gate; the toggle is the gate.
- [x] Idempotent + bounded per sync: don't re-classify already-labeled rows; respect
      existing per-namespace eligibility.
- [x] `classify` exists (`/api/classify/transactions`, RPC `money.transactions.classify`,
      already supports `apply` + batching params) — needs the **on-sync orchestration,
      batching loop, and toggle wiring**, not a new classifier.

### B2. Rules feed the LLM (instructional, not just mechanical)

- [x] Pass the user's **taught rules + recent confirmed labels** into the classify
      request as **context / few-shot examples**, so the model grades unseen or
      ambiguous merchants consistently with the user's demonstrated preferences
      (critical for the subjective `need` axis).
- [x] Mechanical exact-match rules still apply **first and deterministically** (the LLM
      never overrides an exact rule); rules-as-signal only steer the LLM for rows no
      rule matches.
- [x] Bound the example set (most-recent / highest-signal N) to keep prompts small;
      prefer corrections (where the user overrode the model) as the highest-value examples.
- [x] Rule store + `teachRule` exist; this adds **reading rules into the classify
      prompt** as a new input to the LLM step.

### B3. Curated, confidence-aware review feed (corrections + auto-accept-off)

- [x] A **"worth a look"** feed: merchant groups that are **high-$ impact AND
      low-confidence / ambiguous** only — not every row. New `reason=low_confidence`
      (or confidence-ceiling param) on `/api/transactions/review/groups`.
- [x] Return per-group **agent suggestion + confidence + $ impact** inline so the client
      renders a pre-filled card without a second proposals fetch + client-side
      majority-vote join (today done client-side in `useBudgetProposals` /
      `suggestedNeedForGroup` — push it server-side).
- [x] Impact ranking (`sort=impact`, annualized-$ `impact`) and `suggestedLabelAction`
      w/ `teachRule`.
- [x] Batch **"Accept all":** `money.transactions.reviewGroups.applySuggestions`
      (dry-run → apply, `maxGroups`, `minConfidence`).

### B4. Rules CRUD

- [x] List: `GET /api/labels/rules` (consumed by `useLabelRules`).
- [x] **Delete:** `DELETE /api/labels/rules/:id` (+ RPC) for the management surface.
- [x] (Optional) **Edit / disable** a rule.

### B5. Spending-category-first dashboards (zero-effort value)

- [x] Plaid categories normalized on import; category-breakdown formulas work.
- [x] Confirm curated default dashboards lead with **provider-category** spending
      breakdowns needing **zero labels**, so a freshly-connected account shows a complete
      picture before any review; enrichment-dependent cards degrade to empty, not error.

### B6. Counts / nudge data

- [x] A cheap **summary** the home nudge + tab badge read: count of _high-leverage_
      review items (not total unlabeled) + aggregate $ impact. Extend `data-health` /
      review-groups counts rather than a new endpoint.

### B7. Auto-accept setting

- [x] Persist **`autoAcceptCategorization: boolean`** (default **true**) — extend sync
      settings (`GET`/`PATCH /api/sync/settings`) or data settings, exposed for the
      Settings toggle (F3). Drives B1's `apply` flag.

### B8. Classification progress status

- [x] Expose a **classification in-progress signal** the UI polls to drive the Review
      loader (F1): at minimum `classifying: boolean`; ideally `{ processed, total }` for
      a determinate bar. Extend the existing `warehouse/status` / `sync/status` rather
      than adding a new endpoint. Must flip true at the start of the batched pass and
      clear when it settles, so the loader matches reality.

---

## §F — Frontend / UX work (`src/client/**`)

Owner: frontend agent. With auto-accept on by default, Review is mostly empty — it's
for the genuinely-uncertain few, corrections, and the auto-accept-off case.

### F1. Review = optional "worth a look" queue (`screens/ReviewScreen.tsx`)

- [x] Consume B3's curated feed: cap to the top **5–7** impact-ranked items (replaces
      `groups.slice(0, 30)`), each opening with the agent's pick **pre-filled** → one-tap
      confirm (teach-rule) or correct.
- [x] **"Accept all"** → `applySuggestions` (dry-run preview → apply) with undo (reuse
      the delayed-commit + UndoToast pattern).
- [x] **Finite end state**: "You're set — we'll flag anything new worth a look." Remove
      the "N left" homework framing; reframe as optional upside ("Sharpen your dashboards
      — covers ~$X/mo").
- [x] Drop the opt-in "Auto-categorize" banner as the primary path (auto-accept handles
      it on sync); keep an explicit "re-run" affordance for power users.
- [x] **In-progress loader pinned to the top of the page** while a classification batch
      runs (driven by B8): a slim activity bar / "Categorizing your transactions…" row
      that stays put as the user scrolls, so they always know the agent is working and
      why items may still be arriving. Determinate (`processed/total`) if B8 provides it,
      else an indeterminate bar. Clears to the normal header when done.
- [x] **Layout stability — no content shift under an active control:** - Results from an in-flight batch are **staged, not injected**: don't splice new
      items into the visible/active list mid-interaction. Append below the fold or
      behind a "N new — show" affordance the user taps deliberately. - On approve/correct, the resolved card **animates out in place without pulling
      the next card up into the button position** — collapse-then-advance, with the
      next card's actions **disabled during the transition** (and for a short settle
      window after) so a queued double-tap can't land on an item the user never saw. - Prefer a **stable, deterministic order** (don't re-rank the visible queue while
      the user is working through it); re-rank only on explicit refresh or next entry. - Reserve the queue's vertical space (skeleton/placeholder height) so the loader
      finishing doesn't jump the list upward.

### F2. De-emphasize the firehose entry points

- [x] Review tab badge fires **only for high-leverage** items (B6 count), never "800."
- [x] Small, **dismissible dashboard nudge** ("5 merchants worth confirming — $X/mo →")
      reusing the existing dashboard review CTA slot in `DashboardsView`.

### F3. Auto-accept toggle (`screens/SettingsScreen.tsx`)

- [x] A toggle in the **Data** section — "Auto-categorize new transactions" (default
      **on**) — wired to B7. Hint copy: "We label new transactions automatically. Turn
      off to review the agent's suggestions before they're applied."

### F4. Rules management surface (`screens/SettingsScreen.tsx`)

- [x] A "Rules you've taught" section: list (`useLabelRules`) + **remove** (B4 `DELETE`).
      Shows "Starbucks → Optional" etc. — makes the learning transparent and correctable.

### F5. Correct-in-context

- [x] In `TransactionDetailSheet` and drilldown rows: recategorize + **"always do this
      for {merchant}"** (teach-rule), so corrections — which also become LLM examples
      (B2) — happen where the user already is, not in a batch review.

### F6. Spending-category-first emphasis

- [x] Default dashboards surface **provider-category** spending breakdowns prominently
      (zero-effort value); present `need` as the auto-accepted enrichment layer, not a
      headline chore.

---

## 3. Success criteria / outcomes

- Dashboards are trustworthy **within seconds** of connecting — **zero** required manual
  labeling (auto-accept on).
- Any optional work is **bounded** (≤ ~5 confirmations), **ranked by leverage** (impact ×
  uncertainty), and **shrinks over time** — every confirm/correction teaches a rule
  _and_ sharpens the LLM.
- A reachable **done** state; the system flags only genuinely new/uncertain items.
- Cautious users have one clear switch (auto-accept off) to put the agent in
  propose-only mode.
- The word "categorize" never reads as a chore the user owes the app.

## 4. Guardrails

- Auto-accepted labels are **corrigible everywhere** (Review, transaction sheet,
  drilldown) and every correction re-teaches a rule + feeds the LLM — a wrong auto-label
  is cheap to fix and self-correcting, not sticky.
- The auto-accept **toggle** is the user's escape hatch to propose-only; confidence is
  retained to rank what's worth surfacing, not to silently drop labels.
- Mechanical exact-match rules always win over the LLM; rules-as-signal only steer
  unmatched rows.
- Never block dashboard render on classification; degrade enrichment-dependent cards to
  empty, not error.
- **No approval is ever a surprise.** The Review queue must be layout-stable under rapid
  taps — a confirm/correct never reflows the next item into the pressed control, and
  in-flight results never shift the list the user is reading (B8 + F1). When the agent is
  working, the loader says so; when it's done, the queue settles without a jump.
