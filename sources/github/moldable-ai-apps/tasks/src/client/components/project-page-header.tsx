import { Edit3, Trash2 } from 'lucide-react'
import { AppTitlebar } from './app-titlebar'
import type { ProjectWithTasks } from '@/shared/types'

export function ProjectPageHeader({
  selectedProject,
  onBackToProjects,
  onEditProject,
  onDeleteProject,
}: {
  selectedProject: ProjectWithTasks
  onBackToProjects: () => void
  onEditProject: () => void
  onDeleteProject: () => void
}) {
  return (
    <>
      <AppTitlebar
        title={selectedProject.name}
        back={onBackToProjects}
        variant="plain"
        material="none"
        actions={[
          {
            id: 'tasks.edit-project',
            icon: Edit3,
            label: 'Edit project',
            onPress: onEditProject,
          },
          {
            id: 'tasks.delete-project',
            icon: Trash2,
            label: 'Delete project',
            placement: 'overflow',
            onPress: onDeleteProject,
          },
        ]}
      />
    </>
  )
}
