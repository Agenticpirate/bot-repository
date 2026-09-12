import TEAMS_JSON from '../public/teams.json'

export interface TeamMember {
  slug: string
  role: string
}

export interface TeamMeta {
  name: string
  slug: string
  description: string
  category: string
  tags: string[]
  members: TeamMember[]
  workflow?: string
  author: string
  version: string
  language: string
  lang: string
  path: string
  groupId: string
  objective: string
  roster: string
}

export function getAllTeams(): TeamMeta[] {
  return TEAMS_JSON as unknown as TeamMeta[]
}

export function getTeamsByLang(lang: string): TeamMeta[] {
  return getAllTeams().filter(t => (t.lang ?? 'EN').toUpperCase() === lang.toUpperCase())
}

export function getTeamBySlug(slug: string): TeamMeta | undefined {
  return getAllTeams().find(t => t.slug === slug)
}

export const TEAM_CATEGORY_ICONS: Record<string, string> = {
  devops: '⚙️',
  development: '💻',
  marketing: '📣',
  business: '💼',
  finance: '💰',
  security: '🔐',
  data: '📈',
  hr: '👥',
  productivity: '⏱️',
  ecommerce: '🛒',
  education: '🎓',
  health: '🏥',
  legal: '⚖️',
  creative: '🎨',
  saas: '☁️',
  automation: '🤖',
  personal: '🧘',
}
