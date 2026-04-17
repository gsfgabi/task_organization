<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import type { TaskStatus } from '@/types'
import { taskStatusLabels } from '@/lib/labels'
import { computed } from 'vue'

const props = defineProps<{ status: TaskStatus }>()

const variantClass = computed(() => {
  switch (props.status) {
    case 'done':
      return 'bg-success/20 text-success-foreground border-success/30'
    case 'review':
      return 'bg-warning/25 text-warning-foreground border-warning/40'
    case 'in_progress':
      return 'bg-primary/15 text-primary border-primary/25'
    case 'cancelled':
      return 'bg-muted text-muted-foreground'
    default:
      return 'bg-secondary text-secondary-foreground'
  }
})
</script>

<template>
  <Badge
    variant="outline"
    :class="['font-normal', variantClass]"
  >
    {{ taskStatusLabels[status] }}
  </Badge>
</template>
