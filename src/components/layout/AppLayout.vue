<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Toaster } from '@/components/ui/sonner'
import { useAuditStore } from '@/stores/audit'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'
import { Menu, Undo2 } from 'lucide-vue-next'
import { RouterView, useRoute } from 'vue-router'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import AppNavLinks from './AppNavLinks.vue'
import AppSidebar from './AppSidebar.vue'
import SidebarUserPanel from './SidebarUserPanel.vue'

const auth = useAuthStore()
const audit = useAuditStore()
const prefs = usePreferencesStore()
const route = useRoute()

function endImpersonation() {
  const name = auth.user?.name
  audit.add({
    action: 'auth.impersonate_end',
    message: `Fim de personificação (${name ?? '?'})`,
    level: 'info',
  })
  auth.stopImpersonation()
  toast.success('Sessão anterior restaurada.')
}

const mobileNavOpen = ref(false)

const pageTitle = computed(() => (route.meta.title as string) || 'Task Org')

function closeMobileNav() {
  mobileNavOpen.value = false
}
</script>

<template>
  <div class="bg-background min-h-[100dvh] w-full max-w-[100vw]">
    <AppSidebar />

    <Sheet v-model:open="mobileNavOpen">
      <SheetContent
        side="left"
        class="text-sidebar-foreground w-[min(100%,20rem)] border-r bg-sidebar p-0 sm:max-w-xs"
      >
        <SheetHeader class="border-b border-sidebar-border px-4 py-4 text-left">
          <SheetTitle class="text-sidebar-foreground text-base font-semibold">
            Menu
          </SheetTitle>
          <p class="text-sidebar-foreground/70 text-xs font-normal">
            Navegue entre as áreas do sistema
          </p>
        </SheetHeader>
        <ScrollArea class="min-h-0 flex-1">
          <AppNavLinks touch-friendly @navigate="closeMobileNav" />
        </ScrollArea>
        <SidebarUserPanel />
        <Separator class="bg-sidebar-border" />
        <p class="text-sidebar-foreground/60 px-4 py-2 text-xs leading-relaxed">
          Task Org · gestão de tarefas
        </p>
      </SheetContent>
    </Sheet>

    <div
      class="flex min-w-0 flex-1 flex-col"
      :class="prefs.sidebarCollapsed ? 'md:pl-16' : 'md:pl-60'"
    >

      <div
        v-if="auth.isImpersonating"
        class="border-warning/40 bg-warning/15 text-foreground flex shrink-0 items-center justify-between gap-3 border-b px-3 py-2.5 sm:px-4"
        role="status"
      >
        <p class="min-w-0 text-pretty text-xs leading-relaxed sm:text-sm">
          <strong class="font-semibold">Modo personificação:</strong>
          está a usar a conta de
          <span class="font-medium">{{ auth.user?.name }}</span>.
          As acções são registadas em Auditoria.
        </p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          class="shrink-0 gap-1.5 shadow-sm"
          @click="endImpersonation"
        >
          <Undo2 class="size-4" />
          Voltar à minha sessão
        </Button>
      </div>
      <header
        class="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-30 flex min-h-14 shrink-0 items-center gap-2 border-b px-2 pt-[max(0.25rem,env(safe-area-inset-top))] pb-2 backdrop-blur sm:min-h-14 sm:px-4"
      >
        <Button
          class="md:hidden"
          variant="ghost"
          size="icon"
          type="button"
          aria-label="Abrir menu"
          @click="mobileNavOpen = true"
        >
          <Menu class="size-5" />
        </Button>
        <h1
          class="text-foreground line-clamp-2 min-w-0 flex-1 text-balance text-base font-semibold tracking-tight sm:line-clamp-1 sm:truncate sm:text-lg md:text-xl"
        >
          {{ pageTitle }}
        </h1>
      </header>
      <main
        class="mx-auto w-full min-w-0 max-w-[1600px] flex-1 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-5 sm:py-5 md:px-6 md:py-6"
      >
        <RouterView />
      </main>
    </div>
    <Toaster
      rich-colors
      position="bottom-center"
      class="pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:pb-2"
      :toast-options="{ class: 'max-w-[min(calc(100vw-1.5rem),24rem)]' }"
    />
  </div>
</template>
