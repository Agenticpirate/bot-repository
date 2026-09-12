'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

export type Lang = 'EN' | 'ES'

const translations = {
  EN: {
    // Nav
    addAgent: '+ Add Agent',
    github: 'GitHub',
    // Hero
    bundlesBadge: (n: number) => `${n} production-ready bundles`,
    heroTitle: 'The Agent Store',
    heroTitleHighlight: 'Agents, Workflows and Teams — ready for production.',
    heroDesc: '',
    heroDescSuffix: '',
    // Search
    searchPlaceholder: 'Search by name, description or tags...',
    allCategory: 'All',
    noResults: (q: string) => `No agents match "${q}"`,
    clearSearch: 'Clear search',
    resultCount: (n: number) => `${n} result${n !== 1 ? 's' : ''}`,
    // AgentCard
    viewAgent: 'View →',
    byAuthor: (a: string) => `by ${a}`,
    // Agent detail
    donateAuthor: '❤️ Donate to author',
    install: 'Install',
    installDesc: 'Copy bundle to your OpenClaw workspace.',
    deployBtn: '🦀 Deploy in OpenClaw',
    copied: '✓ Copied!',
    downloadTar: 'Download .tar.gz',
    includes: 'Includes',
    info: 'Info',
    author: 'Author',
    version: 'Version',
    model: 'Model',
    bundleFiles: 'Bundle files',
    // FileTabs
    fileDescSoul: 'Personality, tone & core values',
    fileDescIdentity: 'Name, creature type & avatar',
    fileDescUser: 'Info about the human this agent helps',
    fileDescAgents: 'Workspace rules & memory conventions',
    fileDescHeartbeat: 'Periodic background tasks',
    fileDescTools: 'Local tool config & notes',
    fileDescBootstrap: 'First-run setup guide',
    emptyFile: 'This file is empty in the bundle.',
    linesCount: 'Lines',
    wordsCount: 'Words',
    // StarRating
    rateAgent: 'Rate this agent',
    loading: 'Loading...',
    noVotes: 'No votes yet — be the first!',
    thanksVote: '✓ Thanks for your vote!',
    signInToRate: 'Sign in to rate this agent',
    signInToVote: 'Sign in to vote',
    rateStar: (n: number) => `Rate ${n} star${n > 1 ? 's' : ''}`,
    voteCount: (n: number) => `vote${n !== 1 ? 's' : ''}`,
    // Auth
    signInGoogle: 'Sign in with Google',
    signOut: 'out',
    // Footer
    finder: 'Finder',
    docs: 'Docs',
    privacy: 'Privacy',
    builtFor: 'Built for',
    contributeGH: 'Contribute on GitHub',
    // Theme
    switchLight: 'Switch to light mode',
    switchDark: 'Switch to dark mode',
    // Tabs
    tabAgents: 'Agents',
    tabWorkflows: 'Workflows',
    // Workflow
    workflowsTitle: 'Workflows',
    workflowObjective: 'Objective',
    workflowRoles: 'Roles',
    workflowProtocol: 'Protocol',
    workflowOrchestration: 'Orchestration',
    noWorkflows: (q: string) => `No workflows match "${q}"`,
    workflowCount: (n: number) => `${n} workflow${n !== 1 ? 's' : ''}`,
    // Teams
    tabTeams: 'Teams',
    teamSearchPlaceholder: 'Search by name, description, agent or tags...',
    noTeams: (q: string) => `No teams match "${q}"`,
    teamCount: (n: number) => `${n} team${n !== 1 ? 's' : ''}`,
    teamMembers: 'members',
    teamMembersTitle: 'Members',
    teamRosterDesc: 'Team roster & interaction model',
  },
  ES: {
    // Nav
    addAgent: '+ Agregar Agente',
    github: 'GitHub',
    // Hero
    bundlesBadge: (n: number) => `${n} bundles listos para producción`,
    heroTitle: 'El Agent Store',
    heroTitleHighlight: 'Agentes, Workflows y Equipos — listos para producción.',
    heroDesc: '',
    heroDescSuffix: '',
    // Search
    searchPlaceholder: 'Buscar por nombre, descripción o tags...',
    allCategory: 'Todos',
    noResults: (q: string) => `No hay agentes que coincidan con "${q}"`,
    clearSearch: 'Limpiar búsqueda',
    resultCount: (n: number) => `${n} resultado${n !== 1 ? 's' : ''}`,
    // AgentCard
    viewAgent: 'Ver →',
    byAuthor: (a: string) => `por ${a}`,
    // Agent detail
    donateAuthor: '❤️ Donar al autor',
    install: 'Instalar',
    installDesc: 'Copia el bundle a tu workspace de OpenClaw.',
    deployBtn: '🦀 Desplegar en OpenClaw',
    copied: '✓ ¡Copiado!',
    downloadTar: 'Descargar .tar.gz',
    includes: 'Incluye',
    info: 'Info',
    author: 'Autor',
    version: 'Versión',
    model: 'Modelo',
    bundleFiles: 'Archivos del bundle',
    // FileTabs
    fileDescSoul: 'Personalidad, tono y valores',
    fileDescIdentity: 'Nombre, tipo y avatar',
    fileDescUser: 'Info sobre el humano que este agente ayuda',
    fileDescAgents: 'Reglas del workspace y convenciones de memoria',
    fileDescHeartbeat: 'Tareas periódicas en background',
    fileDescTools: 'Config de herramientas locales',
    fileDescBootstrap: 'Guía de primer inicio',
    emptyFile: 'Este archivo está vacío en el bundle.',
    linesCount: 'Líneas',
    wordsCount: 'Palabras',
    // StarRating
    rateAgent: 'Califica este agente',
    loading: 'Cargando...',
    noVotes: '¡Sin votos aún — sé el primero!',
    thanksVote: '✓ ¡Gracias por tu voto!',
    signInToRate: 'Inicia sesión para calificar',
    signInToVote: 'Inicia sesión para votar',
    rateStar: (n: number) => `Calificar ${n} estrella${n > 1 ? 's' : ''}`,
    voteCount: (n: number) => `voto${n !== 1 ? 's' : ''}`,
    // Auth
    signInGoogle: 'Iniciar sesión con Google',
    signOut: 'salir',
    // Footer
    finder: 'Finder',
    docs: 'Docs',
    privacy: 'Privacidad',
    builtFor: 'Hecho para',
    contributeGH: 'Contribuir en GitHub',
    // Theme
    switchLight: 'Cambiar a modo claro',
    switchDark: 'Cambiar a modo oscuro',
    // Tabs
    tabAgents: 'Agentes',
    tabWorkflows: 'Workflows',
    // Workflow
    workflowsTitle: 'Workflows',
    workflowObjective: 'Objetivo',
    workflowRoles: 'Roles',
    workflowProtocol: 'Protocolo',
    workflowOrchestration: 'Orquestación',
    noWorkflows: (q: string) => `No hay workflows que coincidan con "${q}"`,
    workflowCount: (n: number) => `${n} workflow${n !== 1 ? 's' : ''}`,
    // Teams
    tabTeams: 'Equipos',
    teamSearchPlaceholder: 'Buscar por nombre, descripción, agente o tags...',
    noTeams: (q: string) => `No hay equipos que coincidan con "${q}"`,
    teamCount: (n: number) => `${n} equipo${n !== 1 ? 's' : ''}`,
    teamMembers: 'miembros',
    teamMembersTitle: 'Miembros',
    teamRosterDesc: 'Roster del equipo y modelo de interacción',
  },
} as const satisfies Record<Lang, Record<string, string | ((...args: any[]) => string)>>

type TranslationKeys = keyof typeof translations.EN

type Translations = {
  [K in TranslationKeys]: (typeof translations.EN)[K] extends (...args: infer A) => string
    ? (...args: A) => string
    : string
}

interface I18nContextType {
  lang: Lang
  setLang: (lang: Lang) => void
  t: Translations
}

const I18nContext = createContext<I18nContextType>({
  lang: 'EN',
  setLang: () => {},
  t: translations.EN,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('EN')

  useEffect(() => {
    const stored = localStorage.getItem('lang') as Lang | null
    if (stored && (stored === 'EN' || stored === 'ES')) {
      setLangState(stored)
      document.documentElement.setAttribute('lang', stored.toLowerCase())
    }
  }, [])

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang)
    localStorage.setItem('lang', newLang)
    document.documentElement.setAttribute('lang', newLang.toLowerCase())
  }, [])

  return (
    <I18nContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
