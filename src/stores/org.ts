import { seedDirectorates, seedSectors, seedUsers } from '@/data/seed'
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
    if (i === -1) directorates.value.push({ ...d })
    else directorates.value[i] = { ...d }
  }

  function removeDirectorate(id: ID) {
    directorates.value = directorates.value.filter((d) => d.id !== id)
    sectors.value = sectors.value.filter((s) => s.directorateId !== id)
  }

  function upsertSector(s: Sector) {
    const i = sectors.value.findIndex((x) => x.id === s.id)
    if (i === -1) sectors.value.push({ ...s })
    else sectors.value[i] = { ...s }
  }

  function removeSector(id: ID) {
    sectors.value = sectors.value.filter((s) => s.id !== id)
  }

  function upsertUser(u: User) {
    const i = users.value.findIndex((x) => x.id === u.id)
    if (i === -1) users.value.push({ ...u })
    else users.value[i] = { ...u }
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
