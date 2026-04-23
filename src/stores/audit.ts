import type { ID } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const STORAGE_KEY = 'taskorg_audit_log_v1'
const MAX_ENTRIES = 400

export type AuditLevel = 'info' | 'success' | 'warning' | 'danger'

export interface AuditEntry {
  id: string
  ts: string
  actorId: ID | null
  actorName: string
  action: string
  message: string
  level: AuditLevel
  marked: boolean
  detail?: Record<string, unknown>
}

function loadFromStorage(): AuditEntry[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as AuditEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveToStorage(entries: AuditEntry[]) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)))
  } catch {}
}

export const useAuditStore = defineStore('audit', () => {
  const entries = ref<AuditEntry[]>(loadFromStorage())

  const markedCount = computed(() => entries.value.filter((e) => e.marked).length)

  function persist() {
    saveToStorage(entries.value)
  }

  function add(payload: {
    action: string
    message: string
    level?: AuditLevel
    detail?: Record<string, unknown>
    marked?: boolean
  }) {
    const auth = useAuthStore()
    const id = `a-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const row: AuditEntry = {
      id,
      ts: new Date().toISOString(),
      actorId: auth.user?.id ?? null,
      actorName: auth.user?.name ?? 'Sistema',
      action: payload.action,
      message: payload.message,
      level: payload.level ?? 'info',
      marked: payload.marked ?? false,
      detail: payload.detail,
    }
    entries.value = [row, ...entries.value].slice(0, MAX_ENTRIES)
    persist()
  }

  function toggleMarked(id: string) {
    const i = entries.value.findIndex((e) => e.id === id)
    if (i === -1) return
    entries.value[i] = { ...entries.value[i]!, marked: !entries.value[i]!.marked }
    persist()
  }

  function setMarked(id: string, marked: boolean) {
    const i = entries.value.findIndex((e) => e.id === id)
    if (i === -1) return
    entries.value[i] = { ...entries.value[i]!, marked }
    persist()
  }

  function clearAll() {
    entries.value = []
    persist()
  }

  return { entries, markedCount, add, toggleMarked, setMarked, clearAll }
})
