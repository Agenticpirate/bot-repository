#!/usr/bin/env node
/*
  Public agent exporter template.

  This script maps a private agent source into the public profile schema used by
  Open Agent Marketplace. Configure it with environment variables in your own
  environment; do not commit private connection strings or credentials.

  Required env vars when using a SQL source:
    PUBLIC_AGENT_DB_HOST
    PUBLIC_AGENT_DB_USER
    PUBLIC_AGENT_DB_PASS
    PUBLIC_AGENT_DB_NAME

  Usage:
    node scripts/export-public-agents.js --limit 500 --out data/agents.public-curated-500.json
*/
const fs = require('fs');
const path = require('path');

const args = new Map(process.argv.slice(2).map((arg, i, arr) => {
  if (!arg.startsWith('--')) return [null, null];
  const key = arg.slice(2);
  const next = arr[i + 1];
  return [key, next && !next.startsWith('--') ? next : 'true'];
}).filter(([k]) => k));

const limit = Number(args.get('limit') || 500);
const out = args.get('out') || 'data/agents.public-curated-500.json';

const firstNames = ['Ava','Maya','Noah','Leo','Iris','Nora','Ethan','Sofia','Milo','Lena','Kai','Olivia'];
const lastNames = ['Chen','Rivera','Park','Morgan','Lin','Brooks','Kim','Grant','Ellis','Patel','Nguyen','Reed'];

function slugify(value) {
  return String(value || 'agent')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-') || 'agent';
}

function categoryFor(row) {
  const text = `${row.title || ''} ${row.primarySkill || ''}`;
  const rules = [
    ['SEO', /seo|search|keyword|serp|schema/i],
    ['Paid Media', /ads|paid|ppc|sem|roas|media/i],
    ['Content', /content|copy|writer|newsletter|blog|script|social/i],
    ['Analytics', /analytics|data|dashboard|attribution|measurement|insight/i],
    ['Sales', /sales|sdr|outbound|cold|enablement|crm|revops/i],
    ['Lifecycle', /email|lifecycle|retention|churn|loyalty|onboarding/i],
    ['Product', /product|ux|ui|cro|conversion|website|frontend|landing/i],
    ['Community', /community|creator|influencer|affiliate|partnership/i],
    ['Strategy', /strategy|strategist|cmo|position|brand|market|launch|pricing/i]
  ];
  return (rules.find(([, rx]) => rx.test(text)) || ['Operations'])[0];
}

function sanitizeRow(row, index, usedSlugs) {
  const category = categoryFor(row);
  const primarySkill = slugify(row.primarySkill || category);
  let slug = slugify(`${primarySkill}-${row.layer || 'execution'}-agent`);
  let suffix = 2;
  while (usedSlugs.has(slug)) slug = slugify(`${primarySkill}-${row.layer || 'execution'}-agent-${suffix++}`);
  usedSlugs.add(slug);
  const name = `${firstNames[index % firstNames.length]} ${lastNames[Math.floor(index / firstNames.length) % lastNames.length]}`;
  const title = String(row.title || `${category} Specialist`).replace(/\s+/g, ' ').trim();
  return {
    slug,
    name,
    title,
    layer: row.layer || 'execution',
    category,
    primarySkill,
    industries: [row.industry || 'Business'],
    summary: `Helps teams handle ${title.toLowerCase()} work with reusable briefs, workflows, QA criteria, and handoff-ready deliverables.`,
    exampleTasks: [
      `Create a ${category.toLowerCase()} brief`,
      'Prepare handoff-ready deliverables',
      'Review output against public quality rubrics'
    ],
    pricingTier: row.layer === 'strategy' ? 'team' : 'starter',
    source: 'sowork/open-agent-marketplace-public-curated',
    updatedAt: new Date().toISOString().slice(0, 10),
    channelExpertise: [category],
    funnelStage: ['consideration', 'conversion'],
    deliverables: ['brief', 'workflow checklist', 'quality review'],
    tools: ['public workflow templates', 'quality rubric', 'handoff checklist'],
    qualityRubrics: ['audience specificity', 'channel fit', 'actionability', 'public-safe output'],
    riskFlags: []
  };
}

async function loadRows() {
  const input = args.get('input');
  if (input) return JSON.parse(fs.readFileSync(input, 'utf8'));
  throw new Error('Provide --input private-export.json, or adapt loadRows() to your private source. Do not commit private connection details.');
}

(async () => {
  const rows = (await loadRows()).slice(0, limit);
  const usedSlugs = new Set();
  const agents = rows.map((row, index) => sanitizeRow(row, index, usedSlugs));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(agents, null, 2) + '\n');
  console.log(`Exported ${agents.length} public-safe agents to ${out}`);
})();
