# Pricing

## Our pricing philosophy

We believe your AI costs should be transparent and predictable. Vellum passes through model provider costs at cost. We don't charge any margin or markup on token usage. When you spend $1 worth of credits on LLM tokens, that full dollar goes to the model provider. Our goal is to keep Vellum affordable and aligned with your actual usage, not to profit from the AI calls your assistant makes.

## Plans

Vellum has two plans: **Base** (free) and **Pro** (paid). Pro comes in three preset packages (Mighty, Super, Ultra) that bundle machine size, storage, and monthly usage, or you can build a **Custom** configuration by selecting each component individually.

### Base

Free, forever. Includes everything you need to run an assistant:

- Small machine size (1 vCPU, 2 GiB RAM)
- 6 GiB of persistent storage
- Pay-as-you-go credits (no monthly minimum)
- Managed LLM credentials (Vellum covers the API keys)

### Pro packages

Three preset packages that bundle a machine size, storage tier, and monthly usage allowance into a single monthly price. Each package is a starting point: you can adjust individual tiers afterward, which converts your plan to a Custom configuration.

|                   | Mighty                | Super                    | Ultra                 |
| ----------------- | --------------------- | ------------------------ | --------------------- |
| Price             | $30/mo                | $100/mo                  | $200/mo               |
| Machine           | Small (1 vCPU, 2 GiB) | Medium (2.5 vCPU, 5 GiB) | Large (4 vCPU, 8 GiB) |
| Storage           | 10 GiB                | 30 GiB                   | 60 GiB                |
| Monthly usage     | Mighty Usage          | Super Usage              | Ultra Usage           |
| Platform fee      | Not included          | Included                 | Included              |
| Email & subdomain | —                     | Included                 | Included              |

**Mighty** is the entry-level Pro package. You get 10 GiB of storage and monthly Mighty Usage on the standard Small machine. The $10/mo platform fee is not included, so there is no custom subdomain, static IP, or priority support.

**Super** steps up to a Medium machine with 30 GiB of storage and monthly Super Usage. The platform fee is included, so you get a custom subdomain, static IP, and priority support.

**Ultra** is the most powerful package: a Large machine, 60 GiB of storage, and monthly Ultra Usage, with the platform fee included.

### Custom

Prefer to pick your own components? The Custom plan lets you select a machine size, storage tier, and optional usage bundle individually. Your monthly total is the sum of:

- **Platform fee** ($10/mo): custom subdomain, static IP, priority support
- **Machine tier**: $35, $60, or $125/mo (Medium, Large, or XL)
- **Storage tier**: $5 to $30/mo (10 to 120 GiB)
- **Usage bundle** (optional): Mighty, Super, or Ultra Usage at $25, $45, or $115/mo

The minimum Custom configuration is $50/mo (Medium machine + 10 GiB storage, no usage bundle). Credits are still pay-as-you-go on top of any bundle you choose. If you start on a package and later change any individual tier, your plan automatically becomes Custom.

### Machine sizes

Sets the maximum compute for assistants in your org. The Small machine is included with Base and the Mighty package. Medium, Large, and XL are available on the Custom plan and the Super and Ultra packages. Resizable anytime from the assistant's settings page.

| Tier   | CPU      | RAM    | Price                   |
| ------ | -------- | ------ | ----------------------- |
| Small  | 1 vCPU   | 2 GiB  | Included (Base, Mighty) |
| Medium | 2.5 vCPU | 5 GiB  | +$35/mo                 |
| Large  | 4 vCPU   | 8 GiB  | +$60/mo                 |
| XL     | 4 vCPU   | 16 GiB | +$125/mo                |

### Storage

Persistent disk for files, notes, and conversation history. Storage grows online, no assistant restart needed. Base includes 6 GiB. Pro packages and the Custom plan offer the following tiers:

| Size    | Price   |
| ------- | ------- |
| 10 GiB  | +$5/mo  |
| 30 GiB  | +$10/mo |
| 60 GiB  | +$15/mo |
| 120 GiB | +$30/mo |

250 GiB and 500 GiB tiers are available only to existing subscribers who already have them. New subscriptions and tier changes are limited to the tiers listed above.

### Usage bundles

Each Pro package includes a monthly usage allowance named for the package (Mighty Usage, Super Usage, Ultra Usage). On the Custom plan, you can add one of the same usage bundles to your subscription as an optional recurring line item:

| Usage bundle | Price    |
| ------------ | -------- |
| Mighty Usage | +$25/mo  |
| Super Usage  | +$45/mo  |
| Ultra Usage  | +$115/mo |

Usage bundles are charged as a recurring subscription line item and appear on your invoice under the bundle name. They are separate from pay-as-you-go credit top-ups: a bundle covers a set amount of usage each month, while pay-as-you-go credits let you add more anytime. Bundles previously offered at other amounts remain in place for subscribers who already have them.

Included usage resets each billing cycle: whatever is left when the period ends expires and does not roll over. Purchased pay-as-you-go credits last much longer: they expire twelve months after purchase. Your assistant always spends included usage before touching credits; credits are only drawn once the month's usage is fully consumed.

### Changing your plan

All plan changes are in Settings → Billing.

- **Upgrade to Pro.** Pick a package (Mighty, Super, or Ultra) or start with a Custom configuration. Complete Stripe Checkout. Active immediately.
- **Upgrade a tier.** Switch to a bigger machine, storage, or usage tier anytime, or to a bigger package. Upgrades bill immediately: the price difference is charged right away, and a bigger usage bundle unlocks its extra monthly usage as soon as that charge succeeds. New machine or storage capacity then finishes provisioning in the background shortly after checkout. When the difference cannot be charged right away (for example, on a discounted subscription), the bundle change waits for your next renewal instead. Modifying any individual tier on a package converts your plan to Custom.
- **Downgrade a tier.** A smaller machine applies immediately, and the price difference is credited toward your next invoice. A smaller usage bundle starts at your next renewal; the usage included for this cycle stays yours. There are no mid-cycle cash refunds.
- **Cancel.** Choose Downgrade to Base from the plans page. Takes effect at period end; Pro features stay active until then.

## How pricing works

Paid work draws on two pools, in order. If your plan includes monthly usage, that allowance is always consumed first. Only after the included usage is fully consumed does spending move to your prepaid credit balance. You can add credits anytime from the Billing page via Stripe Checkout. Applicable taxes may be added during checkout.

In the app, your Billing screen shows your current **Credit Balance**, alongside the controls for adding credits, Auto-Reload, your daily credit limit, and low-balance alerts. The Usage tab breaks down where credits went by day, model, and action.

## Vellum Credits

The purchase and use of Vellum Credits is governed by Section 6 of our [Terms of Service](/docs/vellum-terms-of-use).

Vellum makes available certain features and functionalities within the Services, as designated by Vellum from time to time, that are accessible exclusively through the use of prepaid credits (“Vellum Credits”). These designated features and functionalities are referred to as “Credit-Eligible Features.” Credit-Eligible Features currently include inference, web search, image creation, and paid third-party APIs accessed through Vellum's managed OAuth (for example, Twitter). No alternative direct-payment method is available for Credit-Eligible Features.

If your plan includes monthly usage, that usage is consumed first. Vellum Credits are only spent after your included usage is fully consumed.

### What happens when credits run out

When credits are exhausted, the app will show a “You've run out of credits” message with an **Add Credits** action that links you to Billing. Assistant actions that require paid usage will pause until credits are added. Enabling Auto-Reload is the easiest way to avoid hitting this state.

## Purchasing Credits

You may fund your Vellum Credit balance (“Vellum Balance”) by purchasing Vellum Credits in ten-dollar ($10.00 USD) increments, up to one hundred dollars ($100.00 USD) per top-up, through the payment methods made available in the Services, or at such other amounts as determined by Vellum from time to time.

Purchased credits sit behind your plan's included usage: your assistant only starts spending them once the month's included usage is fully consumed.

### How to add credits

You can add credits from the app's Billing settings:

1. Open Settings and go to the Billing tab.
2. Select **Add Credits**. The amount picker offers $10 to $100 in $10 increments.
3. Complete checkout in your browser via Stripe.
4. Return to the app; your Credit Balance updates automatically.

One Vellum Credit equals one US dollar. So $10 in checkout adds 10 credits to your balance.

### Auto-Reload

If you'd rather not think about manual top-ups, **Auto-Reload** purchases more credits automatically whenever your balance drops below a threshold you set. Configure it from Settings → Billing.

You set three values:

- **Auto-Reload when balance below** ($1 to $100). When your credit balance dips under this amount, an automatic top-up is triggered. Default is $100.
- **Add amount when auto reloading** ($10 to $500). How much is charged each time the threshold trips. Default is $10.
- **Monthly spending cap** (optional, $25 to $10,000). A safety net that pauses auto top-ups for the rest of the calendar month once total credit purchases reach this amount. Manual purchases count toward the cap too. Must be at least the top-up amount. Leave empty for no limit.

Auto-Reload requires a saved payment method, which you can add in the Payment Methods section right below the toggle. If you're close to the monthly cap when the threshold trips, Auto-Reload only adds the amount remaining before the cap.

You can disable Auto-Reload anytime; your saved card stays on file so you can re-enable it later without re-entering details.

### Spending controls

- **Daily credit limit.** An optional cap on how many credits your assistant can spend per day (UTC). When the limit is reached, paid usage pauses until the next day and the account owner gets an email. From Billing you can raise or remove the limit, or skip it just for today.
- **Low-balance alert.** An email when your balance drops below a threshold you set, so you can top up before your assistant runs dry.

## How credits are spent

Four categories of work consume credits today: **LLM inference** (the biggest line item by far), **web search**, **image generation**, and **paid third-party APIs** you reach through Vellum's managed OAuth (for example, Twitter). On plans with monthly included usage, this work draws on that usage first; credits are only spent after the included usage is fully consumed.

Inference is itself broken into a set of **Actions** you'll see attributed in your usage dashboard. Here's what each one does:

**Conversation with your assistant**

- **Main agent.** Your assistant's response when you chat with them. The biggest chunk for most people when actively using the app.
- **Inference.** One-off model calls from skills or utilities that don't fit a more specific category.

**Memory subsystem** (mostly background)

- **Memory consolidation.** Promoting short-term observations into long-term memory pages.
- **Memory extraction.** Pulling concrete facts, preferences, and entities out of a conversation so they can be remembered.
- **Memory retrieval.** Looking up relevant memories when you ask a question or start a task.
- **Recall.** Targeted, deeper memory lookups across notes, knowledge base, and past conversations.

**Conversation polish** (background)

- **Conversation summarization.** Summarizing finished or long conversations so your assistant can refer back to them efficiently.
- **Conversation title.** Auto-generating a short title for each new conversation.
- **Conversation starters.** Suggested prompts the app surfaces when idle.
- **Empty-state greeting.** The hello your assistant shows when you open the app with no active conversation.
- **Context compactor.** Shrinking a long conversation's context so it still fits in the model's window without dropping anything important.

**Autonomy** (background)

- **Heartbeat agent.** Periodic check-ins where your assistant reflects, plans, and decides whether anything needs your attention.
- **Filing agent.** Filing notes, decisions, and learnings into your personal knowledge base.
- **Notification decision.** Deciding whether to push you a notification or stay quiet.

**Other**

- **Unknown Task.** LLM calls that haven't been tagged with a specific subsystem yet. We're cleaning up the remaining attribution gaps.

A lot of background work is configurable. You can ask your assistant to disable or reduce the frequency of “heartbeats” and “memory compaction,” or to use a less expensive model for these actions. We're actively working on making background spend more visible and easier to control.

**Need help with billing?** Join our [Discord](https://www.vellum.ai/community).
