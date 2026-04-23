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
  'audit.read',
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
  managedSectorIds?: ID[]
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

export interface TaskChecklistItem {
  id: ID
  label: string
  done: boolean
}

export interface TaskAttachment {
  id: ID
  name: string
  mime: string
  size: number
  dataUrl: string
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
  checklist: TaskChecklistItem[]
  attachments: TaskAttachment[]
  estimatedHours: number
  loggedHours: number
  dueDate: string | null
  createdAt: string
  updatedAt: string
}

export interface TimeEntry {
  id: ID
  taskId: ID
  userId: ID
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
