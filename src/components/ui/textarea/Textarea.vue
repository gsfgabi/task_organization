<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { useVModel } from '@vueuse/core'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
  defaultValue?: string | number
  modelValue?: string | number
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
  <textarea
    v-model="modelValue"
    data-slot="textarea"
    :class="cn(
      'border-border/80 bg-background text-foreground placeholder:text-muted-foreground',
      'field-sizing-content flex min-h-24 w-full rounded-md border px-3 py-3 text-base md:text-sm',
      'shadow-sm transition-[border-color,box-shadow,background-color] hover:border-primary/25 hover:shadow',
      'focus-visible:border-ring focus-visible:ring-ring/45 focus-visible:ring-2 focus-visible:outline-none',
      'aria-invalid:border-destructive aria-invalid:ring-destructive/25',
      'dark:bg-input/35 dark:hover:bg-input/45 dark:border-input',
      'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
      props.class,
    )"
  />
</template>
