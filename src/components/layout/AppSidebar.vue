<script setup lang="ts">
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import AppNavLinks from './AppNavLinks.vue'
</script>

<template>
  <aside
    class="text-sidebar-foreground hidden w-60 shrink-0 flex-col border-r bg-sidebar md:flex"
  >
    <div class="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
      <div
        class="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 items-center justify-center rounded-lg text-xs font-bold"
      >
        TO
      </div>
      <div class="leading-tight">
        <p class="text-sm font-semibold">Task Org</p>
        <p class="text-sidebar-foreground/70 text-xs">Gestão corporativa</p>
      </div>
    </div>
    <ScrollArea class="flex-1 px-2 py-3">
      <AppNavLinks />
    </ScrollArea>
    <Separator />
    <p class="text-sidebar-foreground/60 px-4 py-3 text-xs leading-relaxed">
      Controle de tarefa
    </p>
  </aside>
</template>
