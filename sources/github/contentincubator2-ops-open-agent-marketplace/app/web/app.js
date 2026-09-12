async function loadJson(path){ const res = await fetch(path); return res.json(); }
function tags(items){ return (items || []).map(x => `<span class="tag">${x}</span>`).join(''); }
function agentCard(a){
  return `<article class="card"><h3>${a.slug}.md</h3><p><b>${a.title}</b> · ${a.name}</p><p>${a.summary}</p>${tags([a.layer,a.category,a.primarySkill])}${tags(a.channelExpertise)}${tags(a.funnelStage)}</article>`;
}
function squadCard(s){ return `<article class="card"><h3>${s.slug}.json</h3><p><b>${s.name}</b></p><p>${s.summary}</p>${tags(s.agents)}<p class="outputs">Outputs: ${(s.outputs || []).join(', ')}</p></article>`; }
function matchesAgent(a, q){ return JSON.stringify(a).toLowerCase().includes(q.toLowerCase()); }
async function main(){
  const sampleAgents = await loadJson('/data/agents.sample.json');
  const publicAgents = await loadJson('/data/agents.public-curated-500.json').catch(() => []);
  const agents = [...sampleAgents, ...publicAgents];
  const squads = await loadJson('/data/squads.sample.json');
  const grid = document.getElementById('agentGrid');
  const count = document.getElementById('agentCount');
  const render = q => {
    const filtered = agents.filter(a => matchesAgent(a, q));
    count.textContent = `${filtered.length} agents`;
    grid.innerHTML = filtered.map(agentCard).join('');
  };
  render('');
  document.getElementById('q').addEventListener('input', e => render(e.target.value));
  document.querySelectorAll('[data-filter]').forEach(btn => btn.addEventListener('click', () => { document.getElementById('q').value = btn.dataset.filter; render(btn.dataset.filter); }));
  document.getElementById('squadCount').textContent = `${squads.length} squads`;
  document.getElementById('squadGrid').innerHTML = squads.map(squadCard).join('');
}
main();
