# claude-skills-latest errors

Skillselion `updatedAt` is a catalog reindex stamp. Filtering on createdAt **or** updatedAt ≥ 2026-07-14 therefore returns the entire 60,442-skill dump. Content downloads prioritize `createdAt` ≥ 2026-07-14 plus hot/trending/SOTD plus maintained repos. The skills.sh download API is capped at 60/hour; remaining priority misses are noted below.

GitHub clone failures (18):

- getpaperclipai/paperclip: fatal: repository 'https://github.com/getpaperclipai/paperclip.git/' not found
- feishu/cn: fatal: repository 'https://github.com/feishu/cn.git/' not found
- 404kidwiz/claude-supercode-skills: fatal: repository 'https://github.com/404kidwiz/claude-supercode-skills.git/' not found
- api/git: fatal: repository 'https://github.com/api/git.git/' not found
- gitlab-org/ai: fatal: repository 'https://github.com/gitlab-org/ai.git/' not found
- cognitedata/dune-skills: fatal: repository 'https://github.com/cognitedata/dune-skills.git/' not found
- continuedev/skills: fatal: repository 'https://github.com/continuedev/skills.git/' not found
- awesomeaicode/ai: fatal: repository 'https://github.com/awesomeaicode/ai.git/' not found
- camacho/ai-skills: fatal: repository 'https://github.com/camacho/ai-skills.git/' not found
- adaptationio/skrillz: fatal: repository 'https://github.com/adaptationio/skrillz.git/' not found
- 6551team/openskills: fatal: repository 'https://github.com/6551team/openskills.git/' not found
- ontoledgy/ol_ai_context_library: fatal: repository 'https://github.com/ontoledgy/ol_ai_context_library.git/' not found
- tw93/human: fatal: repository 'https://github.com/tw93/human.git/' not found
- site/clawhub.ai: fatal: repository 'https://github.com/site/clawhub.ai.git/' not found
- site/open.feishu.cn: fatal: repository 'https://github.com/site/open.feishu.cn.git/' not found
- .netlify/scripts: fatal: repository 'https://github.com/.netlify/scripts.git/' not found
- README/ARCHITECTURE: fatal: repository 'https://github.com/README/ARCHITECTURE.git/' not found
- email/SMS: fatal: repository 'https://github.com/email/SMS.git/' not found

skills.sh API issues (874):

- flutter/agent-plugins/flutter-building-layouts: fail
- api/git/vip-test-plan: fail
- api/git/vip-test-executor: fail
- api/git/mws-shared: fail
- api/git/fireworks-tech-graph: fail
- joeseesun/qiaomu-opencli-skills/opencli: fail
- api/git/drawio: fail
- api/git/vip-knowledge-inject: fail
- jsmastery-pro/skills/review: fail
- jsmastery-pro/skills/remember: fail
- jsmastery-pro/skills/recover: fail
- jsmastery-pro/skills/imprint: fail
- sickn33/agentic-awesome-skills/security-review: fail
- getpaperclipai/paperclip/company-creator: fail
- getpaperclipai/paperclip/create-agent-adapter: fail
- getpaperclipai/paperclip/create-issue-interaction-ui: fail
- getpaperclipai/paperclip/deal-with-security-advisory: fail
- getpaperclipai/paperclip/diagnose-why-work-stopped: fail
- getpaperclipai/paperclip/paperclip-create-plugin: fail
- getpaperclipai/paperclip/paperclip-dev-workspace-run-verify-fix: fail
- getpaperclipai/paperclip/paperclip-page: fail
- getpaperclipai/paperclip/prcheckloop: fail
- getpaperclipai/paperclip/pr-report: fail
- getpaperclipai/paperclip/release: fail
- getpaperclipai/paperclip/release-changelog: fail
- getpaperclipai/paperclip/release-changelog-discord-message: fail
- getpaperclipai/paperclip/terminal-bench-loop: fail
- agentchengfeng/chengfeng-videocut-skills/videocut: fail
- recoupable/artist-workspace/setup-artist: fail
- api/git/agent-memory: fail
- flutter/agent-plugins/flutter-animation: fail
- microsoft/azure-skills/markdown-token-optimizer: fail
- nashsu/autocli-skill/opencli-rs: fail
- microsoft/azure-skills/sensei: fail
- microsoft/azure-skills/skill-authoring: fail
- microsoft/azure-skills/file-test-bug: fail
- microsoft/azure-skills/analyze-test-run: fail
- api/git/cs-api-skill-generator: fail
- gitlab-org/ai/gitlab-babysit-mr: fail
- gitlab-org/ai/mr-review: fail
- gitlab-org/ai/gitlab-pipeline-watch: fail
- riba2534/feishu-cli/feishu-cli-slides: rate
- 404kidwiz/claude-supercode-skills/flutter-expert: budget
- 404kidwiz/claude-supercode-skills/iot-engineer: budget
- 404kidwiz/claude-supercode-skills/penetration-tester: budget
- 404kidwiz/claude-supercode-skills/competitive-analyst: budget
- gitlab-org/ai/glab-glql: budget
- syncfusion/react-ui-components-skills/syncfusion-react-datepicker: budget
- 404kidwiz/claude-supercode-skills/embedded-systems: budget
- everyinc/compound-engineering-plugin/feature-video: budget
- boshu2/agentops/knowledge: budget
- syncfusion/react-ui-components-skills/syncfusion-react-daterangepicker: budget
- syncfusion/react-ui-components-skills/syncfusion-react-datetimepicker: budget
- syncfusion/react-ui-components-skills/syncfusion-react-timepicker: budget
- riba2534/feishu-cli/feishu-cli-attendance: budget
- teachingai/full-stack-skills/vant-vue3: budget
- 404kidwiz/claude-supercode-skills/context-manager: budget
- 404kidwiz/claude-supercode-skills/performance-engineer: budget
- 404kidwiz/claude-supercode-skills/blockchain-developer: budget
- dfinity/icskills/motoko: budget
- 404kidwiz/claude-supercode-skills/ux-researcher: budget
- subframeapp/subframe/bulk-import: budget
- 404kidwiz/claude-supercode-skills/macos-developer: budget
- gitlab-org/ai/opencode-refine: budget
- vasilyu1983/ai-agents-public/marketing-leads-generation: budget
- 404kidwiz/claude-supercode-skills/business-analyst: budget
- pedronauck/skills/frontend-design: budget
- 404kidwiz/claude-supercode-skills/api-designer: budget
- boshu2/agentops/extract: budget
- boshu2/agentops/grafana-platform-dashboard: budget
- boshu2/agentops/inbox: budget
- haowjy/creative-writing-skills/cw-brainstorming: budget
- akillness/oh-my-skills/agent-browser: budget
- awesomeaicode/ai/coco-commit: budget
- 404kidwiz/claude-supercode-skills/backend-developer: budget
- 404kidwiz/claude-supercode-skills/event-driven-architect: budget
- kevmoo/dash_skills/dart-checks-migration: budget
- 404kidwiz/claude-supercode-skills/qa-expert: budget
- nousresearch/hermes-agent/kanban-worker: budget
- 404kidwiz/claude-supercode-skills/compliance-auditor: budget
- 404kidwiz/claude-supercode-skills/legal-advisor: budget
- 404kidwiz/claude-supercode-skills/fintech-engineer: budget
- 404kidwiz/claude-supercode-skills/java-architect: budget
- cognitedata/dune-skills/graph-viewer: budget
- awesomeaicode/ai/coco-commit-push-mr: budget
- yonatangross/orchestkit/checkpoint-resume: budget
- awesomeaicode/ai/coco-cnb: budget
- 404kidwiz/claude-supercode-skills/ml-engineer: budget
- awesomeaicode/ai/coco-tapd: budget
- mblode/agent-skills/agent-native: budget
- awesomeaicode/ai/coco-weekly-report: budget
- 404kidwiz/claude-supercode-skills/data-analyst: budget
- 404kidwiz/claude-supercode-skills/data-scientist: budget
- everyinc/compound-engineering-plugin/ce-session-inventory: budget
- gitlab-org/ai/gitlab-psql: budget
- camacho/ai-skills/plan: budget
- 404kidwiz/claude-supercode-skills/windows-app-developer: budget
- 404kidwiz/claude-supercode-skills/risk-manager: budget
- gitlab-org/ai/run-in-tmux-pane: budget
- 404kidwiz/claude-supercode-skills/accessibility-tester: budget


Git LFS pointer assets (gif/png/mp4/mp3 copied from upstream `.gitattributes` trees) were dropped; blobs were not present. SKILL.md files kept.

Dropped unbrowse-ai linux-x64 `obscura` vendor binaries (>50 MiB each, not SKILL.md).
