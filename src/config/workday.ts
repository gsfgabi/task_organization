export const WORKDAY_HOURS = 8

export function hoursToWorkdays(hours: number): number {
  if (WORKDAY_HOURS <= 0) return 0
  return Math.round((hours / WORKDAY_HOURS) * 100) / 100
}

export function workdaysToHours(days: number): number {
  return Math.round(days * WORKDAY_HOURS * 100) / 100
}
