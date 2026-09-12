// Server-only data access — uses fs to avoid bundling 4MB JSON
import { readFileSync } from 'fs'
import { join } from 'path'
export type { AgentMeta, AgentListItem, BundleFile } from './agents-types'
export { BUNDLE_FILES, CATEGORY_ICONS } from './agents-types'
import type { AgentMeta } from './agents-types'

let _agentsCache: AgentMeta[] | null = null

export function getAllAgents(): AgentMeta[] {
  if (_agentsCache) return _agentsCache
  const filePath = join(process.cwd(), 'public', 'agents.json')
  const raw = readFileSync(filePath, 'utf-8')
  _agentsCache = JSON.parse(raw) as AgentMeta[]
  return _agentsCache
}

export function getAllAgentsMeta() {
  return getAllAgents().map(({ soul: _soul, files: _files, ...rest }) => rest)
}

export function getAgentsByLang(lang: string): AgentMeta[] {
  return getAllAgents().filter(a => (a.lang ?? 'EN').toUpperCase() === lang.toUpperCase())
}

export function getAgentBySlug(slug: string): AgentMeta | undefined {
  return getAllAgents().find(a => a.slug === slug)
}
