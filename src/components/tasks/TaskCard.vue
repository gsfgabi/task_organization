<script setup lang="ts">
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { TaskItem } from '@/types'
import DifficultyBadge from './DifficultyBadge.vue'
import TaskStatusBadge from './TaskStatusBadge.vue'

defineProps<{
  task: TaskItem
  assigneeName: string
  draggable?: boolean
}>()

const emit = defineEmits<{
  click: []
  dragstart: [e: DragEvent]
}>()
</script>

<template>
  <Card
    class="cursor-pointer transition-shadow hover:shadow-md"
    :draggable="draggable"
    @click="emit('click')"
    @dragstart="emit('dragstart', $event)"
  >
    <CardHeader class="gap-1 pb-2">
      <p class="line-clamp-2 text-sm font-medium leading-snug">
        {{ task.title }}
      </p>
      <div class="flex flex-wrap gap-1">
        <TaskStatusBadge :status="task.status" />
        <DifficultyBadge :difficulty="task.difficulty" />
      </div>
    </CardHeader>
    <CardContent class="space-y-2 pt-0 text-xs text-muted-foreground">
      <div class="flex justify-between gap-2">
        <span>{{ assigneeName }}</span>
        <span>{{ task.estimatedHours }}h est.</span>
      </div>
      <div v-if="task.dueDate" class="text-[11px]">
        Prazo: {{ task.dueDate }}
      </div>
    </CardContent>
  </Card>
</template>
