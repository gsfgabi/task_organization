import { useTaskScope } from '@/composables/useTaskScope'
import { useAuthStore } from '@/stores/auth'
import { useRolesStore } from '@/stores/roles'
import type { PermissionKey, TaskItem } from '@/types'
import { computed } from 'vue'

export function usePermissions() {
  const auth = useAuthStore()
  const roles = useRolesStore()
  const { scope } = useTaskScope()

  const permissionKeys = computed(() => {
    const set = new Set<PermissionKey>()
    if (!auth.user) return set
    for (const rid of auth.user.roleIds) {
      roles.roleById(rid)?.permissionKeys.forEach((k) => set.add(k))
    }
    return set
  })

  function can(permission: PermissionKey) {
    return permissionKeys.value.has(permission)
  }

  function canUpdateTask(task: Pick<TaskItem, 'assigneeId'>) {
    if (!can('tasks.update')) return false
    if (scope.value === 'own' && task.assigneeId !== auth.user?.id) return false
    return true
  }

  function canDeleteTask(task: Pick<TaskItem, 'assigneeId'>) {
    if (!can('tasks.delete')) return false
    if (scope.value === 'own' && task.assigneeId !== auth.user?.id) return false
    return true
  }

  return { permissionKeys, can, canUpdateTask, canDeleteTask }
}
