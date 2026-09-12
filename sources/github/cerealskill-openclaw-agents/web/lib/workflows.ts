import { WORKFLOWS_DATA } from './workflows-data'

export interface WorkflowMeta {
  lang: string
  slug: string
  groupId: string
  path: string
  name: string
  objective: string
  orchestration: string
}

export function getAllWorkflows(): WorkflowMeta[] {
  return WORKFLOWS_DATA as unknown as WorkflowMeta[]
}

export function getWorkflowsByLang(lang: string): WorkflowMeta[] {
  return getAllWorkflows().filter(w => w.lang.toUpperCase() === lang.toUpperCase())
}

export function getWorkflowBySlug(slug: string): WorkflowMeta | undefined {
  return getAllWorkflows().find(w => w.slug === slug)
}
