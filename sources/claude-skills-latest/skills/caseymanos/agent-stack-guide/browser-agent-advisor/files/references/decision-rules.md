# Decision rules

These are routing heuristics, not performance rankings. Recheck current official sources before recommending.

## Hard constraints

- No data leaves the machine: no verified complete turnkey fit. Local browser execution does not imply local inference, telemetry or tools. Literal no-egress conflicts with online purchasing; clarify scope.
- Native desktop: browser-only infrastructure cannot satisfy this. Use a desktop assistant or a computer-use model plus a desktop runtime.
- Contractual ZDR: verify models, runtime, files, logs and tools. Browserbase managed Agents was explicitly outside browser ZDR/BYOS at the snapshot date. Consumer settings are not contracts.
- Purchases: distinguish native wallets, connection fields, developer examples and checkout UI control. Verify authorization and merchant state; a completed run is not proof of an order.
- Protected sites: persistence, MFA, proxies, CAPTCHA and bot recognition differ. No universal access guarantee; hCaptcha needs separate evidence.
- Budget/scale: compare equivalent billing units and actual workload. Included runs are not concurrency or all-in cost per completed task.

## Starting candidates

| Need | Candidate | Qualification |
|---|---|---|
| Personal desktop/building | ChatGPT Work/Codex | Verify OS, permissions and access; separate from API. |
| Hosted web tasks | Browser Use Cloud or Browserbase Agents | Tie-break on packaged execution versus platform breadth. No measured winner. |
| Own browser harness | Stagehand v4 | Browser Use OSS may fit existing Python code better. v4 removes agent(). |
| Browser infrastructure | Browserbase browsers or Kernel | Select on required controls/integrations and measured workload. |
| Custom payments | Kernel + own agent | Adapter coverage and reconciliation apply. |
| Managed payments | Browser Use Cloud conditionally | Wallet fields require account/merchant verification. Browserbase's Stripe example is not a native Agent wallet. |
| Persistent personal assistant | Muse trial; Instinct comparator | Check current access, integrations and privacy. Evidence gaps are not measured failures. |

## Dependencies

- Browser Use Cloud V4's September 12 documentation names OpenCode, Browser Use CLI and Cloud Browser.
- Browserbase Agents documents Stagehand tools on Browserbase sessions.
- Browser Use OSS integrates with Kernel and Browserbase; that does not establish Browser Use Cloud depends on either.
- Kernel's dedicated Stagehand guide covered v3; verify v4 extension compatibility.
- Using OpenAI API models is not using the ChatGPT application.
- Muse discloses its own harness and VM; Instinct's exact browser/model suppliers were not established.

Sources: [Browser Use](https://docs.browser-use.com/cloud/which-product), [Browserbase Agents](https://docs.browserbase.com/platform/agents/overview), [Stagehand](https://docs.stagehand.dev/v4/migrations/v3), [Kernel](https://www.kernel.sh/docs/integrations/overview), [payments](https://kernel.sh/docs/integrations/payments/overview.md), [OpenAI](https://developers.openai.com/api/docs/guides/tools-computer-use), [Muse](https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse).
