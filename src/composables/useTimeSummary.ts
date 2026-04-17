import { WORKDAY_HOURS, hoursToWorkdays } from '@/config/workday'
import { useTimeEntriesStore } from '@/stores/time-entries'
import type { ID } from '@/types'
import { computed } from 'vue'

export function useTimeSummary() {
  const timeStore = useTimeEntriesStore()

  function rangeIsoWeek(): { start: string; end: string } {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(d)
    monday.setDate(diff)
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const fmt = (x: Date) => x.toISOString().slice(0, 10)
    return { start: fmt(monday), end: fmt(sunday) }
  }

  const weekHoursForUser = (userId: ID) => {
    const { start, end } = rangeIsoWeek()
    return computed(() => timeStore.hoursForUserInRange(userId, start, end))
  }

  return {
    WORKDAY_HOURS,
    hoursToWorkdays,
    rangeIsoWeek,
    weekHoursForUser,
  }
}
