export type ID = string

export type TaskStatus =
  | 'backlog'
  | 'todo'
  | 'in_progress'
  | 'review'
  | 'done'
  | 'cancelled'

export type TaskDifficulty = 'trivial' | 'easy' | 'medium' | 'hard' | 'epic'

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export const PERMISSIONS = [
  'tasks.read',
  'tasks.create',
  'tasks.update',
  'tasks.delete',
  'time.read',
  'time.create',
  'time.update',
  'time.delete',
  'org.read',
  'org.manage',
  'admin.users',
  'admin.roles',
  'reports.read',
  'reports.export',
] as const

export type PermissionKey = (typeof PERMISSIONS)[number]

export interface Role {
  id: ID
  name: string
  description: string
  permissionKeys: PermissionKey[]
}

export interface User {
  id: ID
  name: string
  email: string
  avatarUrl?: string
  roleIds: ID[]
  sectorId: ID
  directorateId: ID
  active: boolean
}

export interface Directorate {
  id: ID
  name: string
  code: string
}

export interface Sector {
  id: ID
  name: string
  code: string
  directorateId: ID
}

export interface TaskItem {
  id: ID
  title: string
  description: string
  status: TaskStatus
  difficulty: TaskDifficulty
  priority: TaskPriority
  assigneeId: ID
  sectorId: ID
  directorateId: ID
  tags: string[]
  /** Estimativa em horas */
  estimatedHours: number
  /** Soma de registros — mantida pelo store ao sincronizar tempo */
  loggedHours: number
  dueDate: string | null
  createdAt: string
  updatedAt: string
}

export interface TimeEntry {
  id: ID
  taskId: ID
  userId: ID
  /** ISO date yyyy-mm-dd */
  date: string
  hours: number
  note: string
  createdAt: string
}

export interface AuthSession {
  token: string
  user: User
}

export interface ReportRow {
  userId: ID
  userName: string
  sectorName: string
  hours: number
  tasksCompleted: number
}
