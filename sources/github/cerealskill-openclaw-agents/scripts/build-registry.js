#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')


const AGENTS_ROOT = path.join(__dirname, '..', 'agents')
const WORKFLOW_ROOT = path.join(__dirname, '..', 'workflow')
const TEAMS_ROOT = path.join(__dirname, '..', 'teams')
const OUT_FILE = path.join(__dirname, '..', 'web', 'public', 'agents.json')
const OUT_WORKFLOW_FILE = path.join(__dirname, '..', 'web', 'public', 'workflows.json')
const OUT_TEAMS_FILE = path.join(__dirname, '..', 'web', 'public', 'teams.json')

const BUNDLE_FILES = ['SOUL.md', 'IDENTITY.md', 'USER.md', 'AGENTS.md', 'HEARTBEAT.md', 'TOOLS.md', 'BOOTSTRAP.md']

function walkLangDirs(root, walkFn) {
  const result = {}
  if (!fs.existsSync(root)) return result
  for (const lang of fs.readdirSync(root)) {
    if (lang.startsWith('_')) continue
    const langPath = path.join(root, lang)
    if (fs.statSync(langPath).isDirectory()) {
      result[lang] = walkFn(langPath, lang)
    }
  }
  return result
}

function walkAgents(dir, lang, base = '') {
  const agents = []
  if (!fs.existsSync(dir)) return agents
  for (const entry of fs.readdirSync(dir)) {
    if (entry.startsWith('_')) continue
    const fullPath = path.join(dir, entry)
    const relPath = base ? `${base}/${entry}` : entry
    if (fs.statSync(fullPath).isDirectory()) {
      const metaFile = path.join(fullPath, 'meta.yaml')
      if (fs.existsSync(metaFile)) {
        const meta = yaml.load(fs.readFileSync(metaFile, 'utf-8'))
        const files = {}
        for (const fname of BUNDLE_FILES) {
          const fpath = path.join(fullPath, fname)
          files[fname] = fs.existsSync(fpath) ? fs.readFileSync(fpath, 'utf-8') : ''
        }
        agents.push({ ...meta, lang, path: relPath, soul: files['SOUL.md'], files })
      } else {
        agents.push(...walkAgents(fullPath, lang, relPath))
      }
    }
  }
  return agents
}

function extractWorkflowMeta(content) {
  const lines = content.split('\n')
  let name = '', objective = ''
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (/^##\s+Workflow/i.test(line) && !name) {
      // next non-empty line is the name
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j].trim()
        if (next && !next.startsWith('#')) { name = next; break }
      }
    }
    if (/^##\s+(Objective|Objetivo)/i.test(line)) {
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j].trim()
        if (next && !next.startsWith('#')) { objective = next; break }
      }
    }
  }
  return { name, objective }
}

function walkWorkflows(dir, lang, base = '') {
  const workflows = []
  if (!fs.existsSync(dir)) return workflows
  for (const entry of fs.readdirSync(dir)) {
    if (entry.startsWith('_')) continue
    const fullPath = path.join(dir, entry)
    const relPath = base ? `${base}/${entry}` : entry
    if (fs.statSync(fullPath).isDirectory()) {
      // Support both EN (ORCHESTRATION.md) and ES (ORQUESTACION.md)
      const orchestrationFile = path.join(fullPath, 'ORCHESTRATION.md')
      const orquestacionFile = path.join(fullPath, 'ORQUESTACION.md')
      const foundFile = fs.existsSync(orchestrationFile) ? orchestrationFile
        : fs.existsSync(orquestacionFile) ? orquestacionFile
        : null
      if (foundFile) {
        const content = fs.readFileSync(foundFile, 'utf-8')
        const meta = extractWorkflowMeta(content)
        const slug = entry
        workflows.push({ lang, slug, path: relPath, name: meta.name || slug, objective: meta.objective, orchestration: content })
      } else {
        workflows.push(...walkWorkflows(fullPath, lang, relPath))
      }
    }
  }
  return workflows
}

const agentsByLang = walkLangDirs(AGENTS_ROOT, walkAgents)
const workflowsByLang = walkLangDirs(WORKFLOW_ROOT, walkWorkflows)

// Pair workflows across languages using explicit EN↔ES slug mapping.
const WORKFLOW_PAIR_MAP = {
  'audit-mode': 'modo-auditoria',
  'automatic-on-call': 'on-call-automatico',
  'blackboard': 'pizarron',
  'checkpoint-snapshot': 'checkpoint-snapshot',
  'committee-mode': 'modo-comite',
  'devils-advocate': 'abogado-del-diablo',
  'follow-the-sun': 'follow-the-sun',
  'hub-and-spoke': 'hub-and-spoke',
  'human-in-the-loop': 'humano-en-el-bucle',
  'incident-mode': 'modo-incidente',
  'mentor-mode': 'modo-mentor',
  'on-demand-specialist': 'especialista-bajo-demanda',
  'parallel-swarm': 'swarm-paralelo',
  'raci-matrix': 'matriz-raci',
  'red-team-blue-team': 'red-team-blue-team',
  'research-execution': 'research-ejecucion',
  'saga': 'saga',
  'scatter-gather': 'scatter-gather',
  'stage-pipeline': 'pipeline-por-etapas',
  'technical-arbiter': 'arbitro-tecnico',
  'weekly-planning': 'planeacion-semanal',
}
// Build reverse map ES→EN
const ES_TO_EN = Object.fromEntries(Object.entries(WORKFLOW_PAIR_MAP).map(([en, es]) => [es, en]))

const enWf = workflowsByLang.EN || []
const esWf = workflowsByLang.ES || []
for (const w of enWf) w.groupId = w.slug
for (const w of esWf) w.groupId = ES_TO_EN[w.slug] || w.slug

// Flatten for legacy output
const agents = Object.values(agentsByLang).flat()
const workflows = Object.values(workflowsByLang).flat()

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true })
fs.writeFileSync(OUT_FILE, JSON.stringify(agents, null, 2))
console.log(`✓ Generated agents.json with ${agents.length} agents → ${OUT_FILE}`)

fs.mkdirSync(path.dirname(OUT_WORKFLOW_FILE), { recursive: true })
fs.writeFileSync(OUT_WORKFLOW_FILE, JSON.stringify(workflows, null, 2))
console.log(`✓ Generated workflows.json with ${workflows.length} workflows → ${OUT_WORKFLOW_FILE}`)

// TypeScript module for static bundling
const tsOut = path.join(__dirname, '..', 'web', 'lib', 'agents-data.ts')
const tsContent = `// AUTO-GENERATED by scripts/build-registry.js — do not edit manually\nexport const AGENTS_DATA = ${JSON.stringify(agents, null, 2)} as const;\n`
fs.writeFileSync(tsOut, tsContent)
console.log(`✓ Generated agents-data.ts → ${tsOut}`)

const tsWorkflowOut = path.join(__dirname, '..', 'web', 'lib', 'workflows-data.ts')
const tsWorkflowContent = `// AUTO-GENERATED by scripts/build-registry.js — do not edit manually\nexport const WORKFLOWS_DATA = ${JSON.stringify(workflows, null, 2)} as const;\n`
fs.writeFileSync(tsWorkflowOut, tsWorkflowContent)
console.log(`✓ Generated workflows-data.ts → ${tsWorkflowOut}`)

// ── Teams ──────────────────────────────────────────────────────────────────────

function extractRosterMeta(content) {
  const lines = content.split('\n')
  let objective = '', membersRaw = []
  let inMembersTable = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (/^##\s+(Objective|Objetivo)/i.test(line)) {
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j].trim()
        if (next && !next.startsWith('#')) { objective = next; break }
      }
    }
    if (/^##\s+(Members|Miembros)/i.test(line)) {
      inMembersTable = true
      continue
    }
    if (inMembersTable) {
      if (line.startsWith('#')) { inMembersTable = false; continue }
      // parse table rows like: | `slug` | Role | Resp |
      const match = line.match(/^\|\s*`([^`]+)`\s*\|\s*([^|]+)\|/)
      if (match) {
        membersRaw.push({ slug: match[1].trim(), role: match[2].trim() })
      }
    }
  }
  return { objective, membersRaw }
}

function walkTeams(dir, lang, base = '') {
  const teams = []
  if (!fs.existsSync(dir)) return teams
  for (const entry of fs.readdirSync(dir)) {
    if (entry.startsWith('_')) continue
    const fullPath = path.join(dir, entry)
    const relPath = base ? `${base}/${entry}` : entry
    if (fs.statSync(fullPath).isDirectory()) {
      const teamFile = path.join(fullPath, 'team.yaml')
      const rosterFile = path.join(fullPath, 'ROSTER.md')
      if (fs.existsSync(teamFile)) {
        const meta = yaml.load(fs.readFileSync(teamFile, 'utf-8'))
        const rosterContent = fs.existsSync(rosterFile) ? fs.readFileSync(rosterFile, 'utf-8') : ''
        const rosterMeta = extractRosterMeta(rosterContent)
        teams.push({
          ...meta,
          lang,
          path: relPath,
          // groupId: use explicit field from yaml or fall back to slug
          groupId: meta.groupId || meta.slug,
          objective: meta.description || rosterMeta.objective,
          roster: rosterContent,
        })
      } else {
        teams.push(...walkTeams(fullPath, lang, relPath))
      }
    }
  }
  return teams
}

const teamsByLang = walkLangDirs(TEAMS_ROOT, walkTeams)

// Assign groupIds: EN teams use their own slug, ES teams use groupId from yaml
const enTeams = teamsByLang.EN || []
const esTeams = teamsByLang.ES || []
for (const t of enTeams) t.groupId = t.groupId || t.slug
// ES teams already have groupId from team.yaml

const teams = Object.values(teamsByLang).flat()

fs.mkdirSync(path.dirname(OUT_TEAMS_FILE), { recursive: true })
fs.writeFileSync(OUT_TEAMS_FILE, JSON.stringify(teams, null, 2))
console.log(`✓ Generated teams.json with ${teams.length} teams → ${OUT_TEAMS_FILE}`)

const tsTeamsOut = path.join(__dirname, '..', 'web', 'lib', 'teams-data.ts')
const tsTeamsContent = `// AUTO-GENERATED by scripts/build-registry.js — do not edit manually\nexport const TEAMS_DATA = ${JSON.stringify(teams, null, 2)} as const;\n`
fs.writeFileSync(tsTeamsOut, tsTeamsContent)
console.log(`✓ Generated teams-data.ts → ${tsTeamsOut}`)
