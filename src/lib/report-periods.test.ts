import { describe, expect, it } from 'vitest'
import { clipDate, monthsInRange, semesterBounds, semestersInRange } from './report-periods'

describe('clipDate', () => {
  it('mantém intervalo dentro dos limites', () => {
    expect(clipDate('2024-03-01', '2024-03-31', '2024-01-01', '2024-12-31')).toEqual({
      start: '2024-03-01',
      end: '2024-03-31',
    })
  })

  it('corta para os limites quando o intervalo é mais largo', () => {
    expect(clipDate('2024-01-01', '2024-12-31', '2024-04-01', '2024-04-30')).toEqual({
      start: '2024-04-01',
      end: '2024-04-30',
    })
  })
})

describe('semesterBounds', () => {
  it('1º semestre', () => {
    expect(semesterBounds(2025, 1)).toEqual({ start: '2025-01-01', end: '2025-06-30' })
  })

  it('2º semestre', () => {
    expect(semesterBounds(2025, 2)).toEqual({ start: '2025-07-01', end: '2025-12-31' })
  })
})

describe('monthsInRange', () => {
  it('um único mês parcial', () => {
    const rows = monthsInRange('2024-02-10', '2024-02-20')
    expect(rows).toHaveLength(1)
    expect(rows[0].key).toBe('2024-02')
    expect(rows[0].start).toBe('2024-02-10')
    expect(rows[0].end).toBe('2024-02-20')
  })

  it('vários meses', () => {
    const rows = monthsInRange('2024-01-30', '2024-03-02')
    expect(rows.map((r) => r.key)).toEqual(['2024-01', '2024-02', '2024-03'])
  })
})

describe('semestersInRange', () => {
  it('filtra semestres fora do intervalo', () => {
    const rows = semestersInRange('2024-05-01', '2024-08-31')
    const keys = rows.map((r) => r.key)
    expect(keys).toContain('2024-S1')
    expect(keys).toContain('2024-S2')
    expect(keys.some((k) => k.startsWith('2023-'))).toBe(false)
  })
})
