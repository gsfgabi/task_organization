<script setup lang="ts">
import { usePermissions } from '@/composables/usePermissions'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTasksStore } from '@/stores/tasks'
import type { TaskItem, TaskStatus } from '@/types'
import { Button } from '@/components/ui/button'
import { kanbanStatuses, taskStatusLabels } from '@/lib/labels'
import { computed, ref } from 'vue'
import TaskCard from './TaskCard.vue'

const INITIAL_VISIBLE = 40

const props = defineProps<{
  tasks: TaskItem[]
  assigneeName: (id: string) => string
}>()

const emit = defineEmits<{
  select: [task: TaskItem]
}>()

const tasksStore = useTasksStore()
const { canUpdateTask } = usePermissions()

const expanded = ref<Record<string, boolean>>({})

function columnTasks(status: TaskStatus) {
  const list = byColumn.value.get(status) ?? []
  if (expanded.value[status]) return list
  return list.slice(0, INITIAL_VISIBLE)
}

function hiddenCount(status: TaskStatus) {
  const list = byColumn.value.get(status) ?? []
  return Math.max(0, list.length - INITIAL_VISIBLE)
}

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
  const t = tasksStore.getById(taskId)
  if (!t || !canUpdateTask(t)) return
  tasksStore.setStatus(taskId, status)
}

function showAllInColumn(status: TaskStatus) {
  expanded.value = { ...expanded.value, [status]: true }
}
</script>

<template>
  <div
    class="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 pt-1 [-webkit-overflow-scrolling:touch] sm:mx-0"
    role="region"
    aria-label="Quadro Kanban — deslize horizontalmente no celular"
  >
    <div
      v-for="status in kanbanStatuses"
      :key="status"
      class="bg-muted/40 flex w-[min(88vw,20rem)] shrink-0 snap-start flex-col rounded-xl border sm:w-[min(260px,42vw)] lg:w-72"
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
            v-for="task in columnTasks(status)"
            :key="task.id"
            :task="task"
            :assignee-name="assigneeName(task.assigneeId)"
            :draggable="canUpdateTask(task)"
            @dragstart="
              (e: DragEvent) => {
                if (!canUpdateTask(task)) return
                e.dataTransfer?.setData('task/id', task.id)
              }
            "
            @click="emit('select', task)"
          />
          <Button
            v-if="hiddenCount(status) > 0 && !expanded[status]"
            type="button"
            variant="outline"
            size="sm"
            class="text-muted-foreground w-full text-xs"
            @click="showAllInColumn(status)"
          >
            Mostrar mais ({{ hiddenCount(status) }})
          </Button>
        </div>
      </ScrollArea>
    </div>
  </div>
</template>
