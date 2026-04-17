import { seedTasks } from '@/data/seed'
import type { ID, TaskItem, TaskStatus } from '@/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

function genId() {
  return `t-${crypto.randomUUID().slice(0, 8)}`
}

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref<TaskItem[]>([...seedTasks])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const byStatus = computed(() => {
    const map = new Map<TaskStatus, TaskItem[]>()
    for (const t of tasks.value) {
      const list = map.get(t.status) ?? []
      list.push(t)
      map.set(t.status, list)
    }
    return map
  })

  async function load() {
    loading.value = true
    error.value = null
    try {
      await new Promise((r) => setTimeout(r, 200))
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erro ao carregar tarefas'
    } finally {
      loading.value = false
    }
  }

  function getById(id: ID) {
    return tasks.value.find((t) => t.id === id)
  }

  function upsert(task: TaskItem) {
    const i = tasks.value.findIndex((t) => t.id === task.id)
    if (i === -1) tasks.value.push(task)
    else tasks.value[i] = task
  }

  function create(partial: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt' | 'loggedHours'>) {
    const now = new Date().toISOString()
    const row: TaskItem = {
      ...partial,
      id: genId(),
      loggedHours: 0,
      createdAt: now,
      updatedAt: now,
    }
    tasks.value.push(row)
    return row
  }

  function patch(id: ID, patch: Partial<TaskItem>) {
    const i = tasks.value.findIndex((t) => t.id === id)
    if (i === -1) return
    tasks.value[i] = {
      ...tasks.value[i],
      ...patch,
      updatedAt: new Date().toISOString(),
    }
  }

  function setStatus(id: ID, status: TaskStatus) {
    patch(id, { status })
  }

  function setLoggedHours(id: ID, hours: number) {
    const i = tasks.value.findIndex((t) => t.id === id)
    if (i === -1) return
    tasks.value[i] = {
      ...tasks.value[i],
      loggedHours: Math.round(hours * 100) / 100,
      updatedAt: new Date().toISOString(),
    }
  }

  function remove(id: ID) {
    tasks.value = tasks.value.filter((t) => t.id !== id)
  }

  return {
    tasks,
    loading,
    error,
    byStatus,
    load,
    getById,
    upsert,
    create,
    patch,
    setStatus,
    setLoggedHours,
    remove,
  }
})
