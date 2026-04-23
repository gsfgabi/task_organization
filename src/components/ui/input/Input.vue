<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { useVModel } from '@vueuse/core'
import { cn } from '@/lib/utils'

const props = defineProps<{
  defaultValue?: string | number
  modelValue?: string | number
  class?: HTMLAttributes['class']
}>()

const emits = defineEmits<{
  (e: 'update:modelValue', payload: string | number): void
}>()

const modelValue = useVModel(props, 'modelValue', emits, {
  passive: true,
  defaultValue: props.defaultValue,
})
</script>

<template>
  <input
    v-model="modelValue"
    data-slot="input"
    :class="cn(
      'border-border/80 bg-background text-foreground placeholder:text-muted-foreground',
      'h-10 min-h-10 w-full min-w-0 rounded-md border px-3 py-2 text-base md:text-sm',
      'shadow-sm transition-[border-color,box-shadow,background-color] hover:border-primary/25 hover:shadow',
      'focus-visible:border-ring focus-visible:ring-ring/45 focus-visible:ring-2 focus-visible:outline-none',
      'aria-invalid:border-destructive aria-invalid:ring-destructive/25 focus-visible:aria-invalid:ring-destructive/30',
      'dark:bg-input/35 dark:hover:bg-input/45 dark:border-input',
      'file:text-foreground file:inline-flex file:h-8 file:rounded-md file:border-0 file:bg-muted file:px-3 file:text-sm file:font-medium',
      'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
      props.class,
    )"
  >
</template>
