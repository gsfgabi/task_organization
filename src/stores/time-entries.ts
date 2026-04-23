import { seedTimeEntries } from '@/data/seed'
import { useAuditStore } from '@/stores/audit'
import type { ID, TimeEntry } from '@/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useTasksStore } from './tasks'

function genId() {
  return `te-${crypto.randomUUID().slice(0, 8)}`
}

export const useTimeEntriesStore = defineStore('timeEntries', () => {
  const entries = ref<TimeEntry[]>([...seedTimeEntries])

  const totalHours = computed(() =>
    entries.value.reduce((acc, e) => acc + e.hours, 0),
  )

  function byTask(taskId: ID) {
    return entries.value.filter((e) => e.taskId === taskId)
  }

  function hoursForUserInRange(userId: ID, start: string, end: string) {
    return entries.value
      .filter((e) => e.userId === userId && e.date >= start && e.date <= end)
      .reduce((a, e) => a + e.hours, 0)
  }

  function hoursForUserOnDate(userId: ID, date: string) {
    return entries.value
      .filter((e) => e.userId === userId && e.date === date)
      .reduce((a, e) => a + e.hours, 0)
  }

  function add(entry: Omit<TimeEntry, 'id' | 'createdAt'>) {
    const row: TimeEntry = {
      ...entry,
      id: genId(),
      createdAt: new Date().toISOString(),
    }
    entries.value.push(row)
    syncTaskLoggedHours(entry.taskId)
    useAuditStore().add({
      action: 'time.create',
      message: `Tempo registado: ${entry.hours}h em ${entry.date}`,
      level: 'success',
      detail: { entryId: row.id, taskId: entry.taskId },
    })
    return row
  }

  function update(id: ID, patch: Partial<Pick<TimeEntry, 'date' | 'hours' | 'note'>>) {
    const i = entries.value.findIndex((e) => e.id === id)
    if (i === -1) return
    const taskId = entries.value[i].taskId
    entries.value[i] = { ...entries.value[i], ...patch }
    syncTaskLoggedHours(taskId)
  }

  function remove(id: ID) {
    const e = entries.value.find((x) => x.id === id)
    entries.value = entries.value.filter((x) => x.id !== id)
    if (e) {
      syncTaskLoggedHours(e.taskId)
      useAuditStore().add({
        action: 'time.delete',
        message: `Registo de tempo removido (${e.hours}h, ${e.date})`,
        level: 'warning',
        detail: { entryId: id, taskId: e.taskId },
      })
    }
  }

  function syncTaskLoggedHours(taskId: ID) {
    const tasks = useTasksStore()
    const sum = entries.value.filter((e) => e.taskId === taskId).reduce((a, e) => a + e.hours, 0)
    tasks.setLoggedHours(taskId, sum)
  }

  function resyncAllTasks() {
    const tasks = useTasksStore()
    const byTask = new Map<ID, number>()
    for (const e of entries.value) {
      byTask.set(e.taskId, (byTask.get(e.taskId) ?? 0) + e.hours)
    }
    for (const t of tasks.tasks) {
      tasks.setLoggedHours(t.id, byTask.get(t.id) ?? 0)
    }
  }

  return {
    entries,
    totalHours,
    byTask,
    hoursForUserInRange,
    hoursForUserOnDate,
    add,
    update,
    remove,
    resyncAllTasks,
  }
})
