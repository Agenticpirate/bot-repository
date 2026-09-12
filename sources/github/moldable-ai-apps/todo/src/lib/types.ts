export type Priority = 'low' | 'medium' | 'high'

export interface Todo {
  id: string
  title: string
  completed: boolean
  priority: Priority
  dueDate: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface TodoList {
  id: string
  name: string
  color: string
  createdAt: Date
  updatedAt: Date
}

export const TODO_UI_VIEWS = ['all', 'active', 'completed'] as const

export type TodoUiView = (typeof TODO_UI_VIEWS)[number]

export interface TodoUiIntent {
  id: string
  view: TodoUiView
  entityId?: string
  params?: Record<string, unknown>
  createdAt: string
}
