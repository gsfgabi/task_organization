<script setup lang="ts">
import { SEED_DEMO_LOGIN_PASSWORD } from '@/data/seed'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuditStore } from '@/stores/audit'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const auth = useAuthStore()
const org = useOrgStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const error = ref<string | null>(null)

function findUserByEmail(raw: string) {
  const q = raw.trim().toLowerCase()
  if (!q) return null
  return org.users.find((u) => u.email.toLowerCase() === q && u.active) ?? null
}

function submit() {
  error.value = null
  const u = findUserByEmail(email.value)
  if (!u || password.value !== SEED_DEMO_LOGIN_PASSWORD) {
    error.value = 'E-mail ou senha incorretos.'
    return
  }
  auth.login(u, `mock-token-${u.id}`)
  useAuditStore().add({
    action: 'auth.login',
    message: `Sessão iniciada: ${u.name}`,
    level: 'success',
    detail: { userId: u.id },
  })
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  router.push(redirect)
}
</script>

<template>
  <div
    class="flex min-h-[100dvh] flex-col items-center justify-center gap-8 bg-gradient-to-b from-muted/50 to-background px-4 py-8 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:gap-10 sm:px-6 dark:from-muted/10"
  >
    <header class="w-full max-w-md text-center">
      <p class="text-primary text-[11px] font-semibold tracking-wider uppercase sm:text-xs">
        Acesso
      </p>
      <h1 class="text-foreground mt-2 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
        Task Organization
      </h1>
      <p class="text-muted-foreground mx-auto mt-2 max-w-md text-pretty text-sm leading-relaxed sm:text-base">
        Entre com o seu e-mail institucional. Utilize uma das contas de exemplo e a senha indicada abaixo.
      </p>
    </header>

    <Card
      class="w-full max-w-[min(100%,24rem)] rounded-2xl border-border/80 shadow-lg ring-1 ring-black/[0.03] sm:max-w-md dark:ring-white/[0.04]"
    >
      <CardHeader class="space-y-1 pb-4">
        <CardTitle class="text-lg">Entrar</CardTitle>
        <CardDescription class="text-pretty leading-relaxed">
          Escolha um utilizador da lista de exemplo e a senha indicada abaixo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form class="space-y-5" @submit.prevent="submit">
          <div class="space-y-2">
            <Label for="email">E-mail</Label>
            <Input
              id="email"
              v-model="email"
              type="email"
              autocomplete="username"
              class="min-h-12 border-border/80 shadow-sm sm:min-h-11"
              placeholder="nome@empresa.com"
              required
            />
          </div>
          <div class="space-y-2">
            <Label for="password">Senha</Label>
            <Input
              id="password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              class="min-h-12 border-border/80 shadow-sm sm:min-h-11"
              placeholder="••••••••"
              required
            />
          </div>
          <p
            v-if="error"
            class="text-destructive bg-destructive/5 rounded-lg px-3 py-2 text-sm"
            role="alert"
          >
            {{ error }}
          </p>
          <p class="text-muted-foreground rounded-lg border border-dashed border-border/80 bg-muted/30 px-3 py-2.5 text-xs leading-relaxed">
            <span class="text-foreground font-medium">Exemplo:</span>
            senha comum
            <span class="text-foreground font-mono font-semibold">{{ SEED_DEMO_LOGIN_PASSWORD }}</span>
            — por exemplo
            <span class="font-mono text-[11px] text-foreground sm:text-xs">ana.silva@empresa.com</span>.
          </p>
          <Button class="min-h-12 w-full shadow-sm sm:min-h-11" size="lg" type="submit">
            Entrar
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
