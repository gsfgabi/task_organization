import type { User } from '@/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'
const IMPERSONATION_KEY = 'taskorg_impersonation_v1'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const user = ref<User | null>(parseUser(localStorage.getItem(USER_KEY)))

  const impersonationBackup = ref<{ user: User; token: string } | null>(loadImpersonationBackup())

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isImpersonating = computed(() => !!impersonationBackup.value)

  function parseUser(raw: string | null): User | null {
    if (!raw) return null
    try {
      return JSON.parse(raw) as User
    } catch {
      return null
    }
  }

  function loadImpersonationBackup(): { user: User; token: string } | null {
    if (typeof sessionStorage === 'undefined') return null
    try {
      const raw = sessionStorage.getItem(IMPERSONATION_KEY)
      if (!raw) return null
      return JSON.parse(raw) as { user: User; token: string }
    } catch {
      return null
    }
  }

  function persistImpersonationBackup() {
    if (typeof sessionStorage === 'undefined') return
    if (impersonationBackup.value) {
      sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify(impersonationBackup.value))
    } else {
      sessionStorage.removeItem(IMPERSONATION_KEY)
    }
  }

  function login(u: User, t: string) {
    impersonationBackup.value = null
    persistImpersonationBackup()
    user.value = u
    token.value = t
    localStorage.setItem(TOKEN_KEY, t)
    localStorage.setItem(USER_KEY, JSON.stringify(u))
  }

  function logout() {
    impersonationBackup.value = null
    persistImpersonationBackup()
    user.value = null
    token.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  function setUser(u: User) {
    user.value = u
    localStorage.setItem(USER_KEY, JSON.stringify(u))
  }

  function startImpersonation(target: User) {
    if (!user.value || !token.value) return
    if (user.value.id === target.id) return
    if (!target.active) return
    impersonationBackup.value = {
      user: JSON.parse(JSON.stringify(user.value)) as User,
      token: token.value,
    }
    persistImpersonationBackup()
    user.value = JSON.parse(JSON.stringify(target)) as User
    token.value = `mock-token-${target.id}`
    localStorage.setItem(TOKEN_KEY, token.value)
    localStorage.setItem(USER_KEY, JSON.stringify(target))
  }

  function stopImpersonation() {
    const b = impersonationBackup.value
    if (!b) return
    impersonationBackup.value = null
    persistImpersonationBackup()
    user.value = b.user
    token.value = b.token
    localStorage.setItem(TOKEN_KEY, b.token)
    localStorage.setItem(USER_KEY, JSON.stringify(b.user))
  }

  return {
    token,
    user,
    isAuthenticated,
    isImpersonating,
    impersonationBackup,
    login,
    logout,
    setUser,
    startImpersonation,
    stopImpersonation,
  }
})
