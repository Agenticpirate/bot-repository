# skills.sh errors

Updated: 2026-09-12T19:00:45Z

## Rate limit

Live `GET /api/download/{owner}/{repo}/{slug}` returns HTTP 429 `{"error":"rate_limit_exceeded","message":"Rate limit exceeded. Maximum 60 requests per hour."}` with `Retry-After: 60`.

Target is all 19998 sitemap ids. 17702 have full `files/` + hash. 2296 remain.
Prefer `scripts/fill_skills_sh_from_github.py` for bulk fill. This API client is only for leftovers and stays under the 60/hour cap.

## Permanent misses

30 ids returned HTTP 404 from the download API; page HTML was saved once.

Recent failures / fallbacks:

- `iamzhihuix/happy-claude-skills` raw+clone-fail:GraphQL: Could not resolve to a Repository with the name 'iamzhihuix/happy-claude-skills'. (repository): missed 3
- `ihlamury/design-skills` raw+github-clone: missed 3
- `pablostanley/efecto-plugin` raw+github-clone: missed 3
- `meission/eastmoney` raw+github-clone: missed 3
- `signerlabs/shipswift-skills` raw+github-clone: missed 3
- `cloudflare/skills` raw+github-clone: missed 2
- `cinience/alicloud-skills` raw+github-clone: missed 2
- `juliusbrussee/caveman` raw+github-clone: missed 2
- `kv0906/cc-skills` raw+github-clone: missed 2
- `lotosbin/claude-skills` raw+github-clone: missed 2
- `scientiacapital/skills` raw+github-clone: missed 2
- `supermemoryai/claude-supermemory` raw+github-clone: missed 2
- `tavily-ai/skills` raw+github-clone: missed 2
- `adaptationio/skrillz` raw+clone-fail:GraphQL: Could not resolve to a Repository with the name 'adaptationio/skrillz'. (repository): missed 1
- `vuejs-ai/skills` raw+github-clone: missed 2
- `ahmedasmar/devops-claude-skills` raw+clone-fail:check your internet connection or https://githubstatus.com: missed 1
- `aidotnet/moyucode` raw+clone-fail:check your internet connection or https://githubstatus.com: missed 1
- `agricidaniel/claude-youtube` raw+github-clone: missed 1
- `axwelbrand-byte/arbibot` raw+clone-fail:GraphQL: Could not resolve to a Repository with the name 'axwelbrand-byte/arbibot'. (repository): missed 1
- `anomalyco/opentui` raw+github-clone: missed 1
- `arpitg1304/robotics-agent-skills` raw+github-clone: missed 1
- `ast-grep/agent-skill` raw+github-clone: missed 1
- `alvinunreal/oh-my-opencode-slim` raw+github-clone: missed 1
- `bartundmett/skills` raw+github-clone: missed 1
- `better-auth/better-icons` raw+github-clone: missed 1
- `aws-samples/sample-well-architected-skills-and-steering` raw+github-clone: missed 1
- `boraoztunc/skills` raw+github-clone: missed 1
- `blitzreels/agent-skills` raw+github-clone: missed 1
- `binjuhor/shadcn-lar` raw+github-clone: missed 1
- `boise-state-development/agentcore-public-stack` raw+github-clone: missed 1
- `bruce-shi/ticker-cli` raw+github-clone: missed 1
- `awslabs/mcp` raw+github-clone: missed 1
- `cobosteven/cobo-agent-wallet-manual` raw+clone-fail:check your internet connection or https://githubstatus.com: missed 1
- `casper-studios/casper-marketplace` raw+github-clone: missed 1
- `callstackincubator/rozenite` raw+github-clone: missed 1
- `claude-dev-suite/claude-dev-suite` raw+clone-fail:check your internet connection or https://githubstatus.com: missed 1
- `bergside/typeui` raw+github-clone: missed 1
- `cameronfreer/lean4-skills` raw+github-clone: missed 1
- `cloudsen/eliteforge-skills` raw+clone-fail:check your internet connection or https://githubstatus.com: missed 1
- `coplaydev/unity-mcp` raw+clone-fail:check your internet connection or https://githubstatus.com: missed 1
- `countbot-ai/countbot` raw+clone-fail:check your internet connection or https://githubstatus.com: missed 1
- `continuedev/skills` raw+clone-fail:GraphQL: Could not resolve to a Repository with the name 'continuedev/skills'. (repository): missed 1
- `cygnusfear/agent-skills` raw+clone-fail:GraphQL: Could not resolve to a Repository with the name 'cygnusfear/agent-skills'. (repository): missed 1
- `d4vinci/scrapling` raw+clone-fail:check your internet connection or https://githubstatus.com: missed 1
- `dengineproblem/agents-monorepo` raw+clone-fail:GraphQL: Could not resolve to a Repository with the name 'dengineproblem/agents-monorepo'. (repository): missed 1
- `dchuk/claude-code-tauri-skills` raw+github-clone: missed 1
- `deckardger/tanstack-agent-skills` raw+github-clone: missed 1
- `detaildotdesign/skill` raw+github-clone: missed 1
- `danielmiessler/lifeos` raw+github-clone: missed 1
- `dnvriend/pdf-to-pptx-tool` raw+github-clone: missed 1
- `connorads/dotfiles` raw+clone-fail:check your internet connection or https://githubstatus.com: missed 1
- `contentful/skills` raw+clone-fail:check your internet connection or https://githubstatus.com: missed 1
- `ctsstc/get-shit-done-skills` raw+clone-fail:check your internet connection or https://githubstatus.com: missed 1
- `cyberkaida/reverse-engineering-assistant` raw+clone-fail:check your internet connection or https://githubstatus.com: missed 1
- `dingtalk-real-ai/dingtalk-workspace-cli` raw+github-clone: missed 1
- `fearovex-labs/agent-config` raw+clone-fail:GraphQL: Could not resolve to a Repository with the name 'fearovex-labs/agent-config'. (repository): missed 1
- `fastapi-practices/skills` raw+github-clone: missed 1
- `fleurytian/awesome-claude-skills` raw+github-clone: missed 1
- `four-meme-community/four-meme-ai` raw+github-clone: missed 1
- `gitlab-org/ai` raw+clone-fail:GraphQL: Could not resolve to a Repository with the name 'gitlab-org/ai'. (repository): missed 1
- `heeyo-life/skillboss-skills` raw+clone-fail:GraphQL: Could not resolve to a Repository with the name 'heeyo-life/skillboss-skills'. (repository): missed 1
- `gitbutlerapp/gitbutler` raw+github-clone: missed 1
- `greedychipmunk/agent-skills` raw+github-clone: missed 1
- `jackwener/wx-cli` raw+clone-fail:GraphQL: Could not resolve to a Repository with the name 'jackwener/wx-cli'. (repository): missed 1
- `gmh5225/awesome-game-security` raw+github-clone: missed 1
- `insforge/insforge-skills` raw+github-clone: missed 1
- `home-assistant/core` raw+github-clone: missed 1
- `htmlstreamofficial/preline` raw+github-clone: missed 1
- `isala404/forge` raw+github-clone: missed 1
- `jsolly/agent-skills` raw+clone-fail:GraphQL: Could not resolve to a Repository with the name 'jsolly/agent-skills'. (repository): missed 1
- `jssfy/k-skills` raw+clone-fail:GraphQL: Could not resolve to a Repository with the name 'jssfy/k-skills'. (repository): missed 1
- `jin-doh/traceknot` raw+github-clone: missed 1
- `kimny1143/claude-code-template` raw+clone-fail:GraphQL: Could not resolve to a Repository with the name 'kimny1143/claude-code-template'. (repository): missed 1
- `jiatastic/open-python-skills` raw+github-clone: missed 1
- `jthack/ffuf_claude_skill` raw+github-clone: missed 1
- `kimyx0207/findskill` raw+github-clone: missed 1
- `kirkluokun/awesome-a-stock-openclawskills` raw+github-clone: missed 1
- `learnwy/skills` raw+github-clone: missed 1
- `leonxlnx/taste-skill` raw+github-clone: missed 1
- `longbridge/developers` raw+github-clone: missed 1
- `lllllllama/rigorpilot-skills` raw+github-clone: missed 1
- `lovartai/lovart-skill` raw+github-clone: missed 1
- `mhagrelius/dotfiles` raw+clone-fail:GraphQL: Could not resolve to a Repository with the name 'mhagrelius/dotfiles'. (repository): missed 1
- `mann1988/awesome-claude-skills` raw+github-clone: missed 1
- `mkshahzad77/claude-skill-strapi-expert` raw+clone-fail:GraphQL: Could not resolve to a Repository with the name 'mkshahzad77/claude-skill-strapi-expert'. (repository): missed 1
- `moxa/sw` raw+clone-fail:GraphQL: Could not resolve to a Repository with the name 'moxa/sw'. (repository): missed 1
- `meo9rhsan3492-cell/cn-stock-sim` raw+github-clone: missed 1
- `makenotion/claude-code-notion-plugin` raw+github-clone: missed 1
- `mineru98/skills-store` raw+github-clone: missed 1
- `mwguerra/claude-code-plugins` raw+github-clone: missed 1
- `module-federation/core` raw+github-clone: missed 1
- `muranustb/skills-create_skills` raw+github-clone: missed 1
- `nathansteelqoder/openclaw-config-qoder-integration` raw+github-clone: missed 1
- `napoleond/instaclaw` raw+github-clone: missed 1
- `neondatabase/agent-skills` raw+github-clone: missed 1
- `nymbo/skills` raw+clone-fail:GraphQL: Could not resolve to a Repository with the name 'nymbo/skills'. (repository): missed 1
- `nshipster/sosumi.ai` raw+github-clone: missed 1
- `narumiruna/skills` raw+github-clone: missed 1
- `narcooo/inkos` raw+github-clone: missed 1
- `nuxt/ui` raw+github-clone: missed 1
- `october-academy/agent-plugins` raw+github-clone: missed 1
- `parags/deep-research-pro` raw+clone-fail:GraphQL: Could not resolve to a Repository with the name 'parags/deep-research-pro'. (repository): missed 1
- `pixverseai/skills` raw+github-clone: missed 1
- `qwencloud/qwencloud-deploy` raw+github-clone: missed 1
- `qianwen-ai/qianwenai-deploy` raw+github-clone: missed 1
- `raphaelsalaja/userinterface-wiki` raw+github-clone: missed 1
- `robdtaylor/personal-ai-infrastructure` raw+clone-fail:GraphQL: Could not resolve to a Repository with the name 'robdtaylor/personal-ai-infrastructure'. (repository): missed 1
- `runablehq/mini-browser` raw+github-clone: missed 1
- `runablehq/memory` raw+github-clone: missed 1
- `robin-liquidium/agent-skills` raw+github-clone: missed 1
- `resend/resend-skills` raw+github-clone: missed 1
- `revenuecat/revenuecat-skill` raw+github-clone: missed 1
- `seabbs/claude` raw+github-clone: missed 1
- `sivaprasadreddy/sivalabs-agent-skills` raw+clone-fail:check your internet connection or https://githubstatus.com: missed 1
- `redwoodjs/local-ci` raw+github-clone: missed 1
- `seabbs/skills` raw+github-clone: missed 1
- `skills-directory/skill-codex` raw+clone-fail:check your internet connection or https://githubstatus.com: missed 1
- `simonwong/skills` raw+clone-fail:check your internet connection or https://githubstatus.com: missed 1
- `shoootyou/get-shit-done-multi` raw+clone-fail:failed to run git: exit status 128: missed 1
- `sketch-hq/agents` raw+clone-fail:check your internet connection or https://githubstatus.com: missed 1
- `sophieguanongit/openclaw-browser-automation` raw+clone-fail:GraphQL: Could not resolve to a Repository with the name 'sophieguanongit/openclaw-browser-automation'. (repository): missed 1
- `smerchek/claude-epub-skill` raw+github-clone: missed 1
- `steel-dev/cli` raw+github-clone: missed 1
- `supabase/agent-skills` raw+github-clone: missed 1
- `tamagui/tamagui` raw+github-clone: missed 1
- `tradingview/lightweight-charts` raw+clone-fail:check your internet connection or https://githubstatus.com: missed 1
- `thepexcel/agent-skills` raw+clone-fail:GraphQL: Could not resolve to a Repository with the name 'thepexcel/agent-skills'. (repository): missed 1
- `thesysdev/openui` raw+clone-fail:check your internet connection or https://githubstatus.com: missed 1
- `theodo-group/debug-that` raw+clone-fail:check your internet connection or https://githubstatus.com: missed 1
- `upstash/redis-js` raw+clone-fail:check your internet connection or https://githubstatus.com: missed 1
- `trpc/trpc` raw+clone-fail:check your internet connection or https://githubstatus.com: missed 1
- `vercel-labs/before-and-after` raw+clone-fail:check your internet connection or https://githubstatus.com: missed 1
- `trading212-labs/agent-skills` raw+clone-fail:failed to run git: exit status 128: missed 1
- `video-db/skills` raw+github-clone: missed 1
- `vercel-labs/ai` raw+clone-fail:check your internet connection or https://githubstatus.com: missed 1
- `vercel-labs/agent-skills` raw+clone-fail:failed to run git: exit status 128: missed 1
- `whinc/super-skills` raw+clone-fail:check your internet connection or https://githubstatus.com: missed 1
- `xberg-io/xberg` raw+clone-fail:check your internet connection or https://githubstatus.com: missed 1
- `vibiumdev/vibium` raw+github-clone: missed 1
- `vladm3105/aidoc-flow-framework` raw+github-clone: missed 1
- `wot-ui/wot-starter` raw+clone-fail:check your internet connection or https://githubstatus.com: missed 1
- `wentorai/research-plugins` raw+clone-fail:check your internet connection or https://githubstatus.com: missed 1
- `xixu-me/xget` raw+clone-fail:check your internet connection or https://githubstatus.com: missed 1
- `xixu-me/xdrop` raw+clone-fail:check your internet connection or https://githubstatus.com: missed 1
- `vkehfdl1/marshroom` raw+github-clone: missed 1
- `xiaoxuerenww/follow-builders` raw+clone-fail:GraphQL: Could not resolve to a Repository with the name 'xiaoxuerenww/follow-builders'. (repository): missed 1
- `xbklairith/kisune` raw+clone-fail:failed to run git: exit status 128: missed 1
- `yetone/kill-ai-slop` raw+github-clone: missed 1
- `zereight/gitlab-mcp` raw+github-clone: missed 1

Resume: `python3 scripts/download_skills_sh.py --concurrency 1 --hourly-budget 50 --max-new 50 --update-catalog`
