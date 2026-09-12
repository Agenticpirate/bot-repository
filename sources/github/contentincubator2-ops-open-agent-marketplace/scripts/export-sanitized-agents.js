// Placeholder exporter: adapt this to your private source, then map into public fields only.
// Never export private prompts, customer names, credentials, internal URLs, workspace names, or raw performance metrics.
const fs = require('fs');
const agents = JSON.parse(fs.readFileSync('data/agents.sample.json', 'utf8'));
const sanitized = agents.map(({ slug, name, title, layer, category, primarySkill, industries, summary, exampleTasks, pricingTier, source, updatedAt }) => ({ slug, name, title, layer, category, primarySkill, industries, summary, exampleTasks, pricingTier, source, updatedAt }));
fs.writeFileSync('data/agents.sanitized.json', JSON.stringify(sanitized, null, 2));
console.log(`Exported ${sanitized.length} sanitized agents.`);
