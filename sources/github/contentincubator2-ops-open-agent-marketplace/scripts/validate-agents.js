const fs = require('fs');
const path = require('path');

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const sampleAgents = readJson('data/agents.sample.json');
const publicAgents = fs.existsSync(path.join(__dirname, '..', 'data/agents.public-curated-500.json'))
  ? readJson('data/agents.public-curated-500.json')
  : [];
const agents = [...sampleAgents, ...publicAgents];
const squads = readJson('data/squads.sample.json');
const skills = readJson('data/skills.sample.json');

const agentSlugs = new Set();
for (const agent of agents) {
  for (const field of ['slug', 'name', 'title', 'layer', 'category', 'primarySkill', 'summary']) {
    assert(agent[field], `Agent missing ${field}: ${JSON.stringify(agent)}`);
  }
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(agent.slug), `Bad slug: ${agent.slug}`);
  assert(!agentSlugs.has(agent.slug), `Duplicate agent slug: ${agent.slug}`);
  assert(Array.isArray(agent.exampleTasks) && agent.exampleTasks.length > 0, `Agent missing exampleTasks: ${agent.slug}`);
  agentSlugs.add(agent.slug);
}

for (const squad of squads) {
  assert(squad.slug && squad.name && squad.summary && squad.useCase, `Squad missing required field: ${JSON.stringify(squad)}`);
  for (const slug of squad.agents || []) {
    assert(agentSlugs.has(slug), `Squad ${squad.slug} references missing agent ${slug}`);
  }
}

for (const skill of skills) {
  assert(skill.slug && skill.name && skill.description, `Skill missing required field: ${JSON.stringify(skill)}`);
}

console.log(`Validated ${agents.length} agents, ${squads.length} squads, ${skills.length} skills.`);
