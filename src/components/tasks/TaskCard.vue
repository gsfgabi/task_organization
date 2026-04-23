<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { labelForPresetTag } from '@/lib/task-tags'
import type { TaskItem } from '@/types'
import { computed } from 'vue'
import DifficultyBadge from './DifficultyBadge.vue'
import TaskStatusBadge from './TaskStatusBadge.vue'

const props = defineProps<{
  task: TaskItem
  assigneeName: string
  draggable?: boolean
}>()

const checklistSummary = computed(() => {
  const n = props.task.checklist.length
  if (!n) return null
  const d = props.task.checklist.filter((x) => x.done).length
  return `${d}/${n}`
})

const emit = defineEmits<{
  click: []
  dragstart: [e: DragEvent]
}>()
</script>

<template>
  <Card
    class="cursor-pointer transition-shadow hover:shadow-md"
    :draggable="props.draggable"
    @click="emit('click')"
    @dragstart="emit('dragstart', $event)"
  >
    <CardHeader class="gap-1 pb-2">
      <p class="line-clamp-2 text-sm font-medium leading-snug">
        {{ props.task.title }}
      </p>
      <div class="flex flex-wrap gap-1">
        <TaskStatusBadge :status="props.task.status" />
        <DifficultyBadge :difficulty="props.task.difficulty" />
      </div>
      <div v-if="props.task.tags.length" class="flex flex-wrap gap-1 pt-0.5">
        <Badge
          v-for="tag in props.task.tags.slice(0, 4)"
          :key="tag"
          variant="outline"
          class="max-w-[9rem] truncate px-1.5 py-0 text-[10px] font-normal"
          :title="tag"
        >
          {{ labelForPresetTag(tag) }}
        </Badge>
        <span v-if="props.task.tags.length > 4" class="text-muted-foreground text-[10px]">
          +{{ props.task.tags.length - 4 }}
        </span>
      </div>
    </CardHeader>
    <CardContent class="space-y-2 pt-0 text-xs text-muted-foreground">
      <div class="flex justify-between gap-2">
        <span>{{ props.assigneeName }}</span>
        <span>{{ props.task.estimatedHours }}h est.</span>
      </div>
      <div v-if="checklistSummary" class="text-[11px]">
        Checklist: {{ checklistSummary }}
      </div>
      <div v-if="props.task.attachments.length" class="text-[11px]">
        {{ props.task.attachments.length }} anexo(s)
      </div>
      <div v-if="props.task.dueDate" class="text-[11px]">
        Prazo: {{ props.task.dueDate }}
      </div>
    </CardContent>
  </Card>
</template>
