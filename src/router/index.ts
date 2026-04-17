import { useAuthStore } from '@/stores/auth'
import { useRolesStore } from '@/stores/roles'
import type { PermissionKey } from '@/types'
import { createRouter, createWebHistory } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    permission?: PermissionKey
    title?: string
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { title: 'Entrar' },
    },
    {
      path: '/',
      component: () => import('@/components/layout/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { title: 'Painel', permission: 'tasks.read' },
        },
        {
          path: 'tasks',
          name: 'tasks',
          component: () => import('@/views/TasksView.vue'),
          meta: { title: 'Tarefas', permission: 'tasks.read' },
        },
        {
          path: 'time',
          name: 'time',
          component: () => import('@/views/TimeView.vue'),
          meta: { title: 'Tempo', permission: 'time.read' },
        },
        {
          path: 'organization',
          name: 'organization',
          component: () => import('@/views/OrganizationView.vue'),
          meta: { title: 'Organização', permission: 'org.read' },
        },
        {
          path: 'admin/roles',
          name: 'admin-roles',
          component: () => import('@/views/AdminRolesView.vue'),
          meta: { title: 'Papéis e permissões', permission: 'admin.roles' },
        },
        {
          path: 'reports',
          name: 'reports',
          component: () => import('@/views/ReportsView.vue'),
          meta: { title: 'Relatórios', permission: 'reports.read' },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: 'Não encontrado' },
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  const requiresAuth = to.matched.some((r) => r.meta.requiresAuth)

  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }

  if (!requiresAuth) return true

  if (!auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  const perm = to.meta.permission
  if (perm) {
    const roleIds = auth.user?.roleIds ?? []
    const roles = useRolesStore()
    const keys = new Set<string>()
    for (const rid of roleIds) {
      roles.roleById(rid)?.permissionKeys.forEach((k) => keys.add(k))
    }
    if (!keys.has(perm)) {
      return { name: 'dashboard' }
    }
  }

  return true
})

export default router
