// Shared constants and types — safe for client and server components
export const BUNDLE_FILES = ['SOUL.md', 'IDENTITY.md', 'USER.md', 'AGENTS.md', 'HEARTBEAT.md', 'TOOLS.md', 'BOOTSTRAP.md'] as const
export type BundleFile = typeof BUNDLE_FILES[number]

export interface AgentMeta {
  name: string
  slug: string
  description: string
  category: string
  subcategory?: string
  tags: string[]
  model: string
  author: string
  version: string
  path: string
  lang?: string
  soul_id?: string
  soul: string
  files: Record<BundleFile, string>
}

// Lightweight version for listing pages — no soul or files content
export type AgentListItem = Omit<AgentMeta, 'soul' | 'files'>

export const CATEGORY_ICONS: Record<string, string> = {
  tech: '🖥️',
  business: '💼',
  personal: '🧘',
  creative: '🎨',
  finance: '💰',
  marketing: '📣',
  devops: '⚙️',
  education: '🎓',
  government: '🏛️',
  health: '🏥',
  healthcare: '🩺',
  hospitality: '🏨',
  legal: '⚖️',
  logistics: '🚚',
  manufacturing: '🏭',
  nonprofit: '🤝',
  'real-estate': '🏠',
  sports: '🏆',
  security: '🔐',
  automation: '🤖',
  compliance: '📜',
  'customer-success': '🎯',
  data: '📈',
  ecommerce: '🛒',
  freelance: '💡',
  hr: '👥',
  productivity: '⏱️',
  'supply-chain': '📦',
  moltbook: '📓',
  voice: '🎙️',
  development: '💻',
  saas: '☁️',
}
