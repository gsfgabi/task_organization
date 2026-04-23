<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/composables/usePermissions'
import { cn } from '@/lib/utils'
import {
  Braces,
  Building2,
  ClipboardList,
  Clock,
  LayoutDashboard,
  ScrollText,
  Shield,
  Table2,
  UsersRound,
} from 'lucide-vue-next'
import { RouterLink, useRoute } from 'vue-router'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    touchFriendly?: boolean
    collapsed?: boolean
  }>(),
  { touchFriendly: false, collapsed: false },
)

const emit = defineEmits<{
  navigate: []
}>()

const route = useRoute()
const { can } = usePermissions()

const items = computed(() =>
  [
    { to: '/', label: 'Painel', icon: LayoutDashboard, show: can('tasks.read') },
    { to: '/tasks', label: 'Tarefas', icon: ClipboardList, show: can('tasks.read') },
    { to: '/time', label: 'Tempo', icon: Clock, show: can('time.read') },
    {
      to: '/organization',
      label: 'Organização',
      icon: Building2,
      show: can('org.read'),
    },
    { to: '/admin/roles', label: 'Papéis', icon: Shield, show: can('admin.roles') },
    { to: '/auditoria', label: 'Auditoria', icon: ScrollText, show: can('audit.read') },
    { to: '/reports', label: 'Relatórios', icon: Table2, show: can('reports.read') },
    {
      to: '/acompanhamento',
      label: 'Acompanhamento',
      icon: UsersRound,
      show: can('reports.read'),
    },
    { to: '/api-docs', label: 'API (Swagger)', icon: Braces, show: true },
  ].filter((x) => x.show),
)

function isActive(to: string) {
  if (to === '/') return route.path === '/' || route.path === ''
  return route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<template>
  <nav
    class="flex flex-col"
    :class="touchFriendly ? 'gap-1 p-2' : 'gap-0.5'"
  >
    <RouterLink
      v-for="item in items"
      :key="item.to"
      v-slot="{ navigate, href }"
      :to="item.to"
      custom
    >
      <Button
        as="a"
        :href="href"
        variant="ghost"
        :title="collapsed ? item.label : undefined"
        :class="
          cn(
            'w-full text-left',
            collapsed
              ? 'min-h-10 justify-center px-0'
              : touchFriendly
                ? 'min-h-12 justify-start gap-3 px-3 text-base'
                : 'min-h-10 justify-start gap-2 px-2 py-1.5 text-sm',
            isActive(item.to)
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
              : 'text-sidebar-foreground/90 hover:bg-sidebar-accent/80',
          )
        "
        @click="
          (e: MouseEvent) => {
            navigate(e)
            emit('navigate')
          }
        "
      >
        <component
          :is="item.icon"
          :class="
            touchFriendly ? 'size-5 shrink-0' : collapsed ? 'size-5 shrink-0' : 'size-4 shrink-0'
          "
        />
        <span v-if="!collapsed">{{ item.label }}</span>
      </Button>
    </RouterLink>
  </nav>
</template>
