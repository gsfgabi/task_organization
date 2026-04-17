import { seedRoles } from '@/data/seed'
import type { ID, PermissionKey, Role } from '@/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useRolesStore = defineStore('roles', () => {
  const roles = ref<Role[]>([...seedRoles])

  function roleById(id: ID) {
    return roles.value.find((r) => r.id === id)
  }

  function setRolePermissions(roleId: ID, keys: PermissionKey[]) {
    const r = roles.value.find((x) => x.id === roleId)
    if (r) r.permissionKeys = [...keys]
  }

  function updateRole(partial: Pick<Role, 'id'> & Partial<Omit<Role, 'id'>>) {
    const i = roles.value.findIndex((r) => r.id === partial.id)
    if (i === -1) return
    roles.value[i] = { ...roles.value[i], ...partial }
  }

  return { roles, roleById, setRolePermissions, updateRole }
})
