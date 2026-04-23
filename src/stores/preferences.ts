import type { ReportFiltersSnapshot, ReportPreset } from '@/types/report-filters'
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const LS_KEY = 'task_org_prefs'
const REPORT_UI_KEY = 'task_org_report_ui_v1'
const SIDEBAR_COLLAPSED_KEY = 'task_org_sidebar_collapsed_v1'

function loadSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

function persistSidebarCollapsed(v: boolean) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, v ? '1' : '0')
  } catch {
  }
}

export interface DashboardPrefs {
  showMyTasks: boolean
  showOverdue: boolean
  showWeekHours: boolean
  showDifficultyBreakdown: boolean
  showTeamSignals: boolean
  showNextSteps: boolean
}

const defaultDashboard: DashboardPrefs = {
  showMyTasks: true,
  showOverdue: true,
  showWeekHours: true,
  showDifficultyBreakdown: true,
  showTeamSignals: true,
  showNextSteps: true,
}

function loadPrefs(): DashboardPrefs {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { ...defaultDashboard }
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (parsed && typeof parsed === 'object' && 'dashboard' in parsed && parsed.dashboard) {
      return { ...defaultDashboard, ...(parsed.dashboard as DashboardPrefs) }
    }
    return { ...defaultDashboard, ...parsed }
  } catch {
    return { ...defaultDashboard }
  }
}

function persistDashboard(v: DashboardPrefs) {
  const raw = localStorage.getItem(LS_KEY)
  let reportBlock: Record<string, unknown> = {}
  try {
    if (raw) {
      const p = JSON.parse(raw) as Record<string, unknown>
      if (p.reportLast) reportBlock.reportLast = p.reportLast
      if (p.reportPresets) reportBlock.reportPresets = p.reportPresets
    }
  } catch {
  }
  localStorage.setItem(LS_KEY, JSON.stringify({ dashboard: v, ...reportBlock }))
}

interface ReportUiStored {
  last?: ReportFiltersSnapshot
  presets: ReportPreset[]
}

function loadReportUi(): ReportUiStored {
  try {
    const raw = localStorage.getItem(REPORT_UI_KEY)
    if (!raw) {
      const legacy = localStorage.getItem(LS_KEY)
      if (legacy) {
        const p = JSON.parse(legacy) as Record<string, unknown>
        if (p.reportLast || p.reportPresets) {
          return {
            last: p.reportLast as ReportFiltersSnapshot | undefined,
            presets: Array.isArray(p.reportPresets) ? (p.reportPresets as ReportPreset[]).slice(0, 10) : [],
          }
        }
      }
      return { presets: [] }
    }
    const p = JSON.parse(raw) as Partial<ReportUiStored>
    return {
      last: p.last,
      presets: Array.isArray(p.presets) ? p.presets.slice(0, 10) : [],
    }
  } catch {
    return { presets: [] }
  }
}

function persistReportUi(v: ReportUiStored) {
  localStorage.setItem(REPORT_UI_KEY, JSON.stringify(v))
}

export const usePreferencesStore = defineStore('preferences', () => {
  const dashboard = ref<DashboardPrefs>(loadPrefs())
  const reportUi = ref<ReportUiStored>(loadReportUi())
  const sidebarCollapsed = ref(loadSidebarCollapsed())

  watch(
    dashboard,
    (v) => {
      persistDashboard(v)
    },
    { deep: true },
  )

  watch(
    reportUi,
    (v) => {
      persistReportUi(v)
    },
    { deep: true },
  )

  watch(sidebarCollapsed, (v) => {
    persistSidebarCollapsed(v)
  })

  function resetDashboard() {
    dashboard.value = { ...defaultDashboard }
  }

  function saveReportLast(snapshot: ReportFiltersSnapshot) {
    reportUi.value = { ...reportUi.value, last: { ...snapshot } }
  }

  function addReportPreset(name: string, snapshot: ReportFiltersSnapshot) {
    const id = `rp-${crypto.randomUUID().slice(0, 8)}`
    const next = [...reportUi.value.presets, { id, name: name.trim() || 'Recorte', snapshot: { ...snapshot } }]
    reportUi.value = { ...reportUi.value, presets: next.slice(-10) }
  }

  function removeReportPreset(id: string) {
    reportUi.value = {
      ...reportUi.value,
      presets: reportUi.value.presets.filter((p) => p.id !== id),
    }
  }

  function toggleSidebarCollapsed() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  return {
    dashboard,
    reportUi,
    sidebarCollapsed,
    resetDashboard,
    saveReportLast,
    addReportPreset,
    removeReportPreset,
    toggleSidebarCollapsed,
  }
})
