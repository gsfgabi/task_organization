import { describe, expect, it } from 'vitest'
import { kanbanStatuses, permissionLabels, taskPriorityLabels, taskStatusLabels } from './labels'

describe('labels', () => {
  it('taskStatusLabels cobre estados usados no kanban', () => {
    for (const s of kanbanStatuses) {
      expect(taskStatusLabels[s]).toBeTruthy()
    }
  })

  it('taskPriorityLabels tem chaves esperadas', () => {
    expect(taskPriorityLabels.urgent).toBe('Urgente')
    expect(taskPriorityLabels.low).toBe('Baixa')
  })

  it('permissionLabels inclui leitura de tarefas', () => {
    expect(permissionLabels['tasks.read']).toBe('Ver tarefas')
  })
})
