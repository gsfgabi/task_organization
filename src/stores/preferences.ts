import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const LS_KEY = 'task_org_prefs'

export interface DashboardPrefs {
  showMyTasks: boolean
  showOverdue: boolean
  showWeekHours: boolean
  showDifficultyBreakdown: boolean
}

const defaultDashboard: DashboardPrefs = {
  showMyTasks: true,
  showOverdue: true,
  showWeekHours: true,
  showDifficultyBreakdown: true,
}

function loadPrefs(): DashboardPrefs {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { ...defaultDashboard }
    return { ...defaultDashboard, ...JSON.parse(raw) }
  } catch {
    return { ...defaultDashboard }
  }
}

export const usePreferencesStore = defineStore('preferences', () => {
  const dashboard = ref<DashboardPrefs>(loadPrefs())

  watch(
    dashboard,
    (v) => {
      localStorage.setItem(LS_KEY, JSON.stringify(v))
    },
    { deep: true },
  )

  function resetDashboard() {
    dashboard.value = { ...defaultDashboard }
  }

  return { dashboard, resetDashboard }
})
