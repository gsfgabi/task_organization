import { apiClient } from '@/api/client'
import type { TaskItem } from '@/types'

export async function httpListTasks(): Promise<TaskItem[]> {
  const { data } = await apiClient.get<TaskItem[]>('/api/tasks')
  return data
}

export async function httpPatchTask(id: string, body: Partial<TaskItem>): Promise<TaskItem> {
  const { data } = await apiClient.patch<TaskItem>(`/api/tasks/${id}`, body)
  return data
}
