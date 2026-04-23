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
import { useAuditStore } from '@/stores/audit'
import { useAuthStore } from '@/stores/auth'
import { LogOut, Moon, Sun, Undo2, UserRound } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { ref } from 'vue'
import { toast } from 'vue-sonner'

const props = withDefaults(
  defineProps<{
    panelClass?: string
    collapsed?: boolean
  }>(),
  { collapsed: false },
)

const auth = useAuthStore()
const audit = useAuditStore()
const router = useRouter()

const dark = ref(
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
)

function toggleTheme() {
  dark.value = !dark.value
  document.documentElement.classList.toggle('dark', dark.value)
}

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

function logout() {
  if (auth.user) {
    audit.add({
      action: 'auth.logout',
      message: `Sessão terminada: ${auth.user.name}`,
      level: 'info',
    })
  }
  auth.logout()
  void router.push({ name: 'login' })
}
</script>

<template>
  <div
    :class="[
      'border-sidebar-border flex flex-col gap-2 border-t px-2 py-3',
      props.collapsed && 'items-center px-1',
      props.panelClass,
    ]"
  >
    <div :class="props.collapsed ? 'flex flex-col items-center gap-2' : 'flex items-center gap-2'">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        class="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground size-10 shrink-0 sm:size-9"
        :aria-label="dark ? 'Modo claro' : 'Modo escuro'"
        :title="dark ? 'Modo claro' : 'Modo escuro'"
        @click="toggleTheme"
      >
        <Sun v-if="dark" class="size-5 sm:size-4" />
        <Moon v-else class="size-5 sm:size-4" />
      </Button>
      <DropdownMenu v-if="auth.user">
        <DropdownMenuTrigger as-child>
          <Button
            type="button"
            :variant="props.collapsed ? 'ghost' : 'outline'"
            size="sm"
            :class="
              props.collapsed
                ? 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground size-10 shrink-0 p-0 sm:size-9'
                : 'border-sidebar-border bg-sidebar-accent/10 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex min-h-10 min-w-0 flex-1 items-center gap-2 truncate px-2 sm:min-h-9'
            "
            :title="props.collapsed ? auth.user.name : undefined"
            :aria-label="props.collapsed ? `Menu de ${auth.user.name}` : undefined"
          >
            <UserRound class="text-sidebar-foreground/80 size-5 shrink-0 sm:size-4" aria-hidden="true" />
            <span
              v-if="!props.collapsed"
              class="min-w-0 flex-1 truncate text-left text-xs font-medium sm:text-sm"
            >
              {{ auth.user.name }}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" class="w-[min(calc(100vw-2rem),16rem)]">
          <DropdownMenuLabel class="font-normal">
            <div class="flex flex-col gap-0.5">
              <span class="text-sm font-medium">{{ auth.user.name }}</span>
              <span class="text-muted-foreground text-xs break-all">{{ auth.user.email }}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            v-if="auth.isImpersonating"
            class="min-h-10 cursor-pointer sm:min-h-8"
            @click="endImpersonation"
          >
            <Undo2 class="mr-2 size-4 shrink-0" />
            Voltar à minha sessão
          </DropdownMenuItem>
          <DropdownMenuItem class="min-h-10 cursor-pointer sm:min-h-8" @click="router.push({ name: 'login' })">
            Trocar perfil
          </DropdownMenuItem>
          <DropdownMenuItem
            class="text-destructive min-h-10 cursor-pointer focus:text-destructive sm:min-h-8"
            @click="logout"
          >
            <LogOut class="mr-2 size-4 shrink-0" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
</template>
