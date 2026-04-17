<script setup lang="ts">
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTasksStore } from '@/stores/tasks'
import type { TaskItem, TaskStatus } from '@/types'
import { kanbanStatuses, taskStatusLabels } from '@/lib/labels'
import { computed } from 'vue'
import TaskCard from './TaskCard.vue'

const props = defineProps<{
  tasks: TaskItem[]
  assigneeName: (id: string) => string
}>()

const emit = defineEmits<{
  select: [task: TaskItem]
}>()

const tasksStore = useTasksStore()

const byColumn = computed(() => {
  const map = new Map<TaskStatus, TaskItem[]>()
  for (const s of kanbanStatuses) map.set(s, [])
  for (const t of props.tasks) {
    if (!kanbanStatuses.includes(t.status)) continue
    const list = map.get(t.status) ?? []
    list.push(t)
    map.set(t.status, list)
  }
  return map
})

function onDrop(status: TaskStatus, taskId: string) {
  tasksStore.setStatus(taskId, status)
}
</script>

<template>
  <div
    class="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 pt-1 [-webkit-overflow-scrolling:touch] sm:mx-0"
    role="region"
    aria-label="Quadro Kanban — deslize horizontalmente no celular"
  >
    <div
      v-for="status in kanbanStatuses"
      :key="status"
      class="bg-muted/40 flex w-[min(85vw,280px)] shrink-0 snap-start flex-col rounded-xl border"
      @dragover.prevent
      @drop="(e) => {
        const id = e.dataTransfer?.getData('task/id')
        if (id) onDrop(status, id)
      }"
    >
      <div class="border-b px-3 py-2 text-sm font-medium">
        {{ taskStatusLabels[status] }}
        <span class="text-muted-foreground ml-1 text-xs">
          ({{ (byColumn.get(status) ?? []).length }})
        </span>
      </div>
      <ScrollArea class="h-[min(65dvh,520px)] sm:h-[min(70vh,560px)]">
        <div class="flex flex-col gap-2 p-2">
          <TaskCard
            v-for="task in byColumn.get(status) ?? []"
            :key="task.id"
            :task="task"
            :assignee-name="assigneeName(task.assigneeId)"
            draggable
            @dragstart="
              (e: DragEvent) => {
                e.dataTransfer?.setData('task/id', task.id)
              }
            "
            @click="emit('select', task)"
          />
        </div>
      </ScrollArea>
    </div>
  </div>
</template>
