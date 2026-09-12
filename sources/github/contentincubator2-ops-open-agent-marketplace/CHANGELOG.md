# Changelog

All notable changes to Open Agent Marketplace will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] — 2026-05-29 — Initial Public Release

### Added
- **528 agent profiles** — 28 fictional starter agents + 500 public-safe curated profiles derived from a private 16,113-agent library
- `agents/public-curated-500/` — 500 structured JSON profiles with slug, layer, category, primarySkill, channelExpertise, funnelStage, deliverables, tools, and qualityRubrics fields
- **8 marketing squad recipes** in `recipes/marketing-squads/`:
  - `saas-launch-squad.json`
  - `ecommerce-growth-squad.json`
  - `b2b-abm-squad.json`
  - `b2b-sales-squad.json`
  - `local-service-lead-gen-squad.json`
  - `creator-growth-squad.json`
  - `content-engine-squad.json`
  - `marketplace-growth-squad.json`
- **6 workflow templates** in `workflows/`: positioning-to-campaign, content-engine, paid-ads, SEO, email-lifecycle, social-listening
- **5 fictional marketing case packs** in `examples/`: B2B SaaS launch, DTC skincare, local dental lead gen, online course funnel, ecommerce marketplace listing
- Public JSON schemas in `schema/` for agents, squads, and skill bindings
- Agent quality rubric and sample eval cases in `evals/`
- Lightweight browser demo UI in `app/web/`
- Validation scripts (`npm run validate`, `npm run sweep`) in `scripts/`
- Launch copy assets in `launch/` (Hacker News, X thread, LinkedIn, Product Hunt)
- `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE` (MIT)
- Architecture diagram (Mermaid) in README
- Competitor comparison table (vs CrewAI, LangGraph, AutoGPT) in README

### Notes
- All agent profiles are public-safe: internal prompts, customer records, credentials, and operational fields have been excluded
- The 500 curated profiles were selected from 1,689 public-safe candidates in a 16,113-agent private library

---

## [Unreleased]

### Planned
- Live demo deployment (GitHub Pages / Vercel)
- npm package: `open-agent-marketplace` schema validator
- GitHub Discussions (Show & Tell category)
- Additional squad recipes and workflow templates
- Social preview image (1200×630)
