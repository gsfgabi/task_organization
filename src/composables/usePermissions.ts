import { useAuthStore } from '@/stores/auth'
import { useRolesStore } from '@/stores/roles'
import type { PermissionKey } from '@/types'
import { computed } from 'vue'

export function usePermissions() {
  const auth = useAuthStore()
  const roles = useRolesStore()

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

  return { permissionKeys, can }
}
