<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Toaster } from '@/components/ui/sonner'
import { useAuthStore } from '@/stores/auth'
import { Menu, Moon, Sun } from 'lucide-vue-next'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { computed, ref } from 'vue'
import AppNavLinks from './AppNavLinks.vue'
import AppSidebar from './AppSidebar.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const mobileNavOpen = ref(false)

const pageTitle = computed(() => (route.meta.title as string) || 'Task Org')

const dark = ref(
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
)

function toggleTheme() {
  dark.value = !dark.value
  document.documentElement.classList.toggle('dark', dark.value)
}

function closeMobileNav() {
  mobileNavOpen.value = false
}
</script>

<template>
  <div class="bg-background flex min-h-[100dvh] min-h-screen w-full">
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
        <ScrollArea class="h-[calc(100dvh-8rem)]">
          <AppNavLinks touch-friendly @navigate="closeMobileNav" />
        </ScrollArea>
        <Separator />
        <p class="text-sidebar-foreground/60 px-4 py-3 text-xs leading-relaxed">
          Task Org · gestão de tarefas
        </p>
      </SheetContent>
    </Sheet>

    <div class="flex min-w-0 flex-1 flex-col">
      <header
        class="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b px-3 pt-[max(0.25rem,env(safe-area-inset-top))] pb-2 backdrop-blur sm:px-4"
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
        <h1 class="text-foreground min-w-0 flex-1 truncate text-base font-semibold tracking-tight sm:text-lg md:text-xl">
          {{ pageTitle }}
        </h1>
        <div class="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button
            size="icon"
            variant="ghost"
            type="button"
            class="size-10 sm:size-9"
            :aria-label="dark ? 'Modo claro' : 'Modo escuro'"
            @click="toggleTheme"
          >
            <Sun v-if="dark" class="size-5 sm:size-4" />
            <Moon v-else class="size-5 sm:size-4" />
          </Button>
          <DropdownMenu v-if="auth.user">
            <DropdownMenuTrigger as-child>
              <Button
                variant="outline"
                size="sm"
                class="max-w-[140px] truncate sm:max-w-[220px] min-h-10 px-2 sm:min-h-8"
              >
                {{ auth.user.name }}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              class="w-[min(calc(100vw-2rem),16rem)]"
            >
              <DropdownMenuLabel class="font-normal">
                <div class="flex flex-col gap-0.5">
                  <span class="text-sm font-medium">{{ auth.user.name }}</span>
                  <span class="text-muted-foreground text-xs break-all">{{ auth.user.email }}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                class="min-h-10 cursor-pointer sm:min-h-8"
                @click="router.push({ name: 'login' })"
              >
                Trocar perfil
              </DropdownMenuItem>
              <DropdownMenuItem
                class="text-destructive min-h-10 cursor-pointer focus:text-destructive sm:min-h-8"
                @click="
                  () => {
                    auth.logout()
                    router.push({ name: 'login' })
                  }
                "
              >
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main
        class="mx-auto w-full max-w-[1600px] flex-1 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:py-5 md:px-6 md:py-6"
      >
        <RouterView />
      </main>
    </div>
    <Toaster rich-colors position="top-center" />
  </div>
</template>
