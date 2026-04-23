import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import type { Directorate, ID, Sector, TaskItem, User } from '@/types'
import { computed } from 'vue'

const SCOPE_ROLE_ORDER = [
  'role-admin',
  'role-director',
  'role-manager',
  'role-supervisor',
  'role-member',
  'role-viewer',
] as const

export type TaskScope = 'all' | 'directorate' | 'sectors' | 'own' | 'read_all'

export function sectorsManagedBy(u: User): ID[] {
  if (u.managedSectorIds?.length) return [...u.managedSectorIds]
  return [u.sectorId]
}

export function taskScopeForUser(user: User | null, roleIds: ID[]): TaskScope {
  if (!user || !roleIds.length) return 'read_all'
  for (const rid of SCOPE_ROLE_ORDER) {
    if (!roleIds.includes(rid)) continue
    switch (rid) {
      case 'role-admin':
        return 'all'
      case 'role-director':
        return 'directorate'
      case 'role-manager':
      case 'role-supervisor':
        return 'sectors'
      case 'role-member':
        return 'own'
      case 'role-viewer':
        return 'read_all'
      default:
        break
    }
  }
  return 'own'
}

export type TaskScopeProbe = Pick<TaskItem, 'assigneeId' | 'sectorId' | 'directorateId'>

export function taskMatchesScope(task: TaskScopeProbe, user: User, scope: TaskScope): boolean {
  switch (scope) {
    case 'all':
    case 'read_all':
      return true
    case 'directorate':
      return task.directorateId === user.directorateId
    case 'sectors':
      return sectorsManagedBy(user).includes(task.sectorId)
    case 'own':
      return task.assigneeId === user.id
    default:
      return false
  }
}

export function useTaskScope() {
  const auth = useAuthStore()
  const org = useOrgStore()

  const scope = computed<TaskScope>(() =>
    taskScopeForUser(auth.user, auth.user?.roleIds ?? []),
  )

  const visibleSectors = computed((): Sector[] => {
    const u = auth.user
    if (!u) return org.sectors
    switch (scope.value) {
      case 'all':
      case 'read_all':
        return org.sectors
      case 'directorate':
        return org.sectors.filter((s) => s.directorateId === u.directorateId)
      case 'sectors':
        return org.sectors.filter((s) => sectorsManagedBy(u).includes(s.id))
      case 'own':
        return org.sectors.filter((s) => s.id === u.sectorId)
      default:
        return org.sectors
    }
  })

  const visibleDirectorates = computed((): Directorate[] => {
    const u = auth.user
    if (!u) return org.directorates
    switch (scope.value) {
      case 'all':
      case 'read_all':
        return org.directorates
      case 'directorate':
        return org.directorates.filter((d) => d.id === u.directorateId)
      case 'sectors': {
        const dirIds = new Set(visibleSectors.value.map((s) => s.directorateId))
        return org.directorates.filter((d) => dirIds.has(d.id))
      }
      case 'own':
        return org.directorates.filter((d) => d.id === u.directorateId)
      default:
        return org.directorates
    }
  })

  function visibleTasks(list: TaskItem[]): TaskItem[] {
    const u = auth.user
    if (!u) return []
    const s = scope.value
    return list.filter((t) => taskMatchesScope(t, u, s))
  }

  function isTaskVisible(task: TaskScopeProbe | undefined | null): boolean {
    if (!task || !auth.user) return false
    return taskMatchesScope(task, auth.user, scope.value)
  }

  function visibleUsers(users: User[]): User[] {
    const u = auth.user
    if (!u) return []
    const active = users.filter((x) => x.active)
    switch (scope.value) {
      case 'all':
      case 'read_all':
        return active
      case 'directorate':
        return active.filter((x) => x.directorateId === u.directorateId)
      case 'sectors': {
        const set = new Set(sectorsManagedBy(u))
        return active.filter((x) => set.has(x.sectorId))
      }
      case 'own':
        return active.filter((x) => x.id === u.id)
      default:
        return active
    }
  }

  return {
    scope,
    visibleTasks,
    isTaskVisible,
    visibleSectors,
    visibleDirectorates,
    sectorsManagedBy: () => (auth.user ? sectorsManagedBy(auth.user) : []),
    visibleUsers,
    taskMatchesScope: (task: TaskScopeProbe) =>
      auth.user ? taskMatchesScope(task, auth.user, scope.value) : false,
  }
}
