import type { TaskDifficulty, TaskPriority, TaskStatus } from '@/types'

export const taskStatusLabels: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'A fazer',
  in_progress: 'Em andamento',
  review: 'Em revisão',
  done: 'Concluída',
  cancelled: 'Cancelada',
}

export const taskDifficultyLabels: Record<TaskDifficulty, string> = {
  trivial: 'Trivial',
  easy: 'Fácil',
  medium: 'Média',
  hard: 'Difícil',
  epic: 'Épica',
}

export const taskPriorityLabels: Record<TaskPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
}

/** Colunas exibidas no quadro Kanban */
export const kanbanStatuses: TaskStatus[] = [
  'backlog',
  'todo',
  'in_progress',
  'review',
  'done',
]

export const permissionLabels: Record<string, string> = {
  'tasks.read': 'Ver tarefas',
  'tasks.create': 'Criar tarefas',
  'tasks.update': 'Editar tarefas',
  'tasks.delete': 'Excluir tarefas',
  'time.read': 'Ver tempo',
  'time.create': 'Registrar tempo',
  'time.update': 'Editar tempo',
  'time.delete': 'Excluir tempo',
  'org.read': 'Ver organização',
  'org.manage': 'Gerir diretorias/setores',
  'admin.users': 'Administrar usuários',
  'admin.roles': 'Administrar papéis',
  'reports.read': 'Ver relatórios',
  'reports.export': 'Exportar relatórios',
}
