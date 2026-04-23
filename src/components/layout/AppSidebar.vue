<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { usePreferencesStore } from '@/stores/preferences'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { computed } from 'vue'
import AppNavLinks from './AppNavLinks.vue'
import SidebarUserPanel from './SidebarUserPanel.vue'

const prefs = usePreferencesStore()

const collapsed = computed(() => prefs.sidebarCollapsed)
</script>

<template>
  <aside
    class="text-sidebar-foreground border-sidebar-border fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden border-r bg-sidebar transition-[width] duration-200 ease-out md:flex"
    :class="collapsed ? 'w-16' : 'w-60'"
  >
    <div
      class="flex shrink-0 items-center gap-2 border-b border-sidebar-border px-2 sm:px-3"
      :class="collapsed ? 'flex-col justify-center gap-2 py-3' : 'h-14'"
    >
      <Button
        type="button"
        size="icon"
        variant="ghost"
        class="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground size-9 shrink-0"
        :aria-label="collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'"
        :title="collapsed ? 'Expandir menu' : 'Recolher menu'"
        @click="prefs.toggleSidebarCollapsed()"
      >
        <ChevronLeft v-if="!collapsed" class="size-5" />
        <ChevronRight v-else class="size-5" />
      </Button>
      <img
        v-if="!collapsed"
        src="/favicon.svg"
        alt=""
        width="32"
        height="32"
        class="size-8 shrink-0 rounded-lg"
        aria-hidden="true"
      />
      <div
        v-if="!collapsed"
        class="min-w-0 flex-1 leading-tight"
      >
        <p class="truncate text-sm font-semibold">Task Org</p>
        <p class="text-sidebar-foreground/70 truncate text-xs">Gestão corporativa</p>
      </div>
      <img
        v-else
        src="/favicon.svg"
        alt="Task Org"
        width="32"
        height="32"
        class="size-8 shrink-0 rounded-lg"
      />
    </div>
    <nav
      class="min-h-0 flex-1 overflow-y-auto px-1 py-2"
      :class="collapsed ? 'px-1' : 'px-2 py-3'"
      aria-label="Navegação principal"
    >
      <AppNavLinks :collapsed="collapsed" />
    </nav>
    <SidebarUserPanel :collapsed="collapsed" />
  </aside>
</template>
