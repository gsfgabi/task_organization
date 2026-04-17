<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/composables/usePermissions'
import { cn } from '@/lib/utils'
import {
  Building2,
  ClipboardList,
  Clock,
  LayoutDashboard,
  Shield,
  Table2,
} from 'lucide-vue-next'
import { RouterLink, useRoute } from 'vue-router'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Itens mais altos (área de toque) no menu mobile */
    touchFriendly?: boolean
  }>(),
  { touchFriendly: false },
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
    { to: '/reports', label: 'Relatórios', icon: Table2, show: can('reports.read') },
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
        :class="
          cn(
            'w-full justify-start text-left',
            touchFriendly ? 'min-h-12 gap-3 px-3 text-base' : 'gap-2',
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
        <component :is="item.icon" :class="touchFriendly ? 'size-5 shrink-0' : 'size-4 shrink-0'" />
        {{ item.label }}
      </Button>
    </RouterLink>
  </nav>
</template>
