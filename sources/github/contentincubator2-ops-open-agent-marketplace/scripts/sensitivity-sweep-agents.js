#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const defaultTargets = [
  'data/agents.public-curated-500.json',
  'agents/public-curated-500'
];

const deny = [
  { name: 'credential-like term', rx: /\b(password|passwd|secret|api[_-]?key|bearer|oauth|cookie|private key|smtp)\b/i },
  { name: 'messaging-app private field', rx: /\b(slackBotToken|slackAppId|bot token|app token)\b/i },
  { name: 'infrastructure term', rx: /\b(localhost|webhook|nginx|redis|s3 bucket|private endpoint)\b/i },
  { name: 'private source table', rx: /\b(mos_db|sowork_db|raw taskSystemPrompt|tool_access|modelStack)\b/i },
  { name: 'direct destructive operation', rx: /\b(drop table|delete from|update database)\b/i },
  { name: 'private project marker', rx: /\b(OpView|KEYPO|Meltwater|WIN2026|TFDA|Disney\+|Liu Caiwei|柳采葳|五感十築|甲山林|復華)\b/i }
];

function filesFor(target) {
  const abs = path.join(root, target);
  if (!fs.existsSync(abs)) return [];
  const stat = fs.statSync(abs);
  if (stat.isFile()) return [abs];
  const out = [];
  for (const name of fs.readdirSync(abs)) {
    const file = path.join(abs, name);
    const st = fs.statSync(file);
    if (st.isDirectory()) out.push(...filesFor(path.relative(root, file)));
    else if (['.json', '.md'].includes(path.extname(file))) out.push(file);
  }
  return out;
}

const targets = process.argv.slice(2).length ? process.argv.slice(2) : defaultTargets;
const hits = [];
for (const target of targets) {
  for (const file of filesFor(target)) {
    const rel = path.relative(root, file);
    const txt = fs.readFileSync(file, 'utf8');
    for (const rule of deny) {
      if (rule.rx.test(txt)) hits.push(`${rel}: ${rule.name}`);
    }
    if (path.extname(file) === '.json') {
      try {
        const parsed = JSON.parse(txt);
        const records = Array.isArray(parsed) ? parsed : [parsed];
        for (const record of records) {
          for (const forbidden of ['rawPrompt', 'taskSystemPrompt', 'tool_access', 'modelStack', 'slackBotToken', 'slackAppId', 'companySlug']) {
            if (Object.prototype.hasOwnProperty.call(record, forbidden)) hits.push(`${rel}: forbidden field ${forbidden}`);
          }
        }
      } catch (err) {
        hits.push(`${rel}: invalid JSON`);
      }
    }
  }
}

if (hits.length) {
  console.error('Public agent sensitivity sweep failed:\n' + [...new Set(hits)].join('\n'));
  process.exit(1);
}
console.log('Public agent sensitivity sweep passed.');
