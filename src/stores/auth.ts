import type { User } from '@/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const user = ref<User | null>(parseUser(localStorage.getItem(USER_KEY)))

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  function parseUser(raw: string | null): User | null {
    if (!raw) return null
    try {
      return JSON.parse(raw) as User
    } catch {
      return null
    }
  }

  function login(u: User, t: string) {
    user.value = u
    token.value = t
    localStorage.setItem(TOKEN_KEY, t)
    localStorage.setItem(USER_KEY, JSON.stringify(u))
  }

  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  function setUser(u: User) {
    user.value = u
    localStorage.setItem(USER_KEY, JSON.stringify(u))
  }

  return { token, user, isAuthenticated, login, logout, setUser }
})
