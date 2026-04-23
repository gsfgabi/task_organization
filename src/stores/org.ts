import { seedDirectorates, seedSectors, seedUsers } from '@/data/seed'
import { useAuditStore } from '@/stores/audit'
import type { Directorate, ID, Sector, User } from '@/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useOrgStore = defineStore('org', () => {
  const directorates = ref<Directorate[]>([...seedDirectorates])
  const sectors = ref<Sector[]>([...seedSectors])
  const users = ref<User[]>([...seedUsers])

  const directorateOptions = computed(() =>
    directorates.value.map((d) => ({ value: d.id, label: `${d.name} (${d.code})` })),
  )

  const sectorOptions = computed(() =>
    sectors.value.map((s) => ({
      value: s.id,
      label: `${s.name} (${s.code})`,
      directorateId: s.directorateId,
    })),
  )

  function upsertDirectorate(d: Directorate) {
    const i = directorates.value.findIndex((x) => x.id === d.id)
    const created = i === -1
    if (i === -1) directorates.value.push({ ...d })
    else directorates.value[i] = { ...d }
    useAuditStore().add({
      action: created ? 'org.directorate.create' : 'org.directorate.update',
      message: `${created ? 'Diretoria criada' : 'Diretoria atualizada'}: ${d.name} (${d.code})`,
      level: 'info',
      detail: { directorateId: d.id },
    })
  }

  function removeDirectorate(id: ID) {
    directorates.value = directorates.value.filter((d) => d.id !== id)
    sectors.value = sectors.value.filter((s) => s.directorateId !== id)
  }

  function upsertSector(s: Sector) {
    const i = sectors.value.findIndex((x) => x.id === s.id)
    const created = i === -1
    if (i === -1) sectors.value.push({ ...s })
    else sectors.value[i] = { ...s }
    useAuditStore().add({
      action: created ? 'org.sector.create' : 'org.sector.update',
      message: `${created ? 'Setor criado' : 'Setor atualizado'}: ${s.name} (${s.code})`,
      level: 'info',
      detail: { sectorId: s.id },
    })
  }

  function removeSector(id: ID) {
    sectors.value = sectors.value.filter((s) => s.id !== id)
  }

  function upsertUser(u: User) {
    const i = users.value.findIndex((x) => x.id === u.id)
    const created = i === -1
    if (i === -1) users.value.push({ ...u })
    else users.value[i] = { ...u }
    useAuditStore().add({
      action: created ? 'org.user.create' : 'org.user.update',
      message: `${created ? 'Utilizador criado' : 'Utilizador atualizado'}: ${u.name} <${u.email}>`,
      level: 'info',
      detail: { userId: u.id },
    })
  }

  function removeUser(id: ID) {
    users.value = users.value.filter((u) => u.id !== id)
  }

  function directorateName(id: ID) {
    return directorates.value.find((d) => d.id === id)?.name ?? id
  }

  function sectorName(id: ID) {
    return sectors.value.find((s) => s.id === id)?.name ?? id
  }

  function userName(id: ID) {
    return users.value.find((u) => u.id === id)?.name ?? id
  }

  return {
    directorates,
    sectors,
    users,
    directorateOptions,
    sectorOptions,
    upsertDirectorate,
    removeDirectorate,
    upsertSector,
    removeSector,
    upsertUser,
    removeUser,
    directorateName,
    sectorName,
    userName,
  }
})
