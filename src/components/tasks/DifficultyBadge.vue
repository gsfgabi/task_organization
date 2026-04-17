<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import type { TaskDifficulty } from '@/types'
import { taskDifficultyLabels } from '@/lib/labels'
import { computed } from 'vue'

const props = defineProps<{ difficulty: TaskDifficulty }>()

const cls = computed(() => {
  const d = props.difficulty
  if (d === 'trivial' || d === 'easy')
    return 'bg-success/15 text-success-foreground border-success/30'
  if (d === 'medium') return 'bg-warning/20 text-warning-foreground border-warning/35'
  return 'bg-destructive/10 text-destructive border-destructive/25'
})
</script>

<template>
  <Badge variant="outline" :class="['font-normal', cls]">
    {{ taskDifficultyLabels[difficulty] }}
  </Badge>
</template>
