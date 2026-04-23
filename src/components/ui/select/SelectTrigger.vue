<script setup lang="ts">
import type { SelectTriggerProps } from 'reka-ui'

import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { ChevronDownIcon } from 'lucide-vue-next'
import { SelectIcon, SelectTrigger, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<SelectTriggerProps & { class?: HTMLAttributes['class'], size?: 'sm' | 'default' }>(),
  { size: 'default' },
)

const delegatedProps = reactiveOmit(props, 'class', 'size')
const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <SelectTrigger
    data-slot="select-trigger"
    :data-size="size"
    v-bind="forwardedProps"
    :class="cn(
      'border-border/80 bg-background text-foreground data-placeholder:text-muted-foreground',
      'flex w-fit min-w-0 items-center justify-between gap-1.5 whitespace-nowrap rounded-md border py-2 pr-3 pl-3 text-sm',
      'shadow-sm transition-[border-color,box-shadow,background-color] hover:border-primary/25 hover:shadow',
      'focus-visible:border-ring focus-visible:ring-ring/45 focus-visible:ring-2 focus-visible:outline-none',
      'aria-invalid:border-destructive aria-invalid:ring-destructive/25',
      'dark:bg-input/35 dark:hover:bg-input/45 dark:border-input',
      'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
      'data-[size=default]:min-h-10 data-[size=default]:h-10 data-[size=sm]:min-h-9 data-[size=sm]:h-9 data-[size=sm]:rounded-md data-[size=sm]:py-1.5 data-[size=sm]:pl-2.5 data-[size=sm]:pr-2.5',
      '*:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5',
      '[&_svg:not([class*=size-])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0',
      props.class,
    )"
  >
    <slot />
    <SelectIcon as-child>
      <ChevronDownIcon class="text-muted-foreground size-4 pointer-events-none" />
    </SelectIcon>
  </SelectTrigger>
</template>
