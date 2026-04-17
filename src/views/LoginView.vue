<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import { useRolesStore } from '@/stores/roles'
import type { User } from '@/types'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const auth = useAuthStore()
const org = useOrgStore()
const roles = useRolesStore()
const router = useRouter()
const route = useRoute()

const selectedId = ref(org.users[0]?.id ?? '')

const selectedUser = computed(
  () => org.users.find((u) => u.id === selectedId.value) ?? null,
)

function login() {
  const u = selectedUser.value
  if (!u) return
  auth.login(u, `mock-token-${u.id}`)
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  router.push(redirect)
}

function describeUser(u: User) {
  const names = u.roleIds
    .map((id) => roles.roleById(id)?.name)
    .filter(Boolean)
    .join(', ')
  return `${u.email} · ${names}`
}
</script>

<template>
  <div
    class="bg-muted/30 flex min-h-[100dvh] min-h-screen flex-col items-center justify-center gap-6 px-4 py-8 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]"
  >
    <div class="text-center">
      <h1 class="text-primary text-2xl font-semibold tracking-tight">
        Task Organization
      </h1>
      <p class="text-muted-foreground mt-1 max-w-md text-sm">
        Ambiente de demonstração: escolha um usuário para simular permissões
        (RBAC). O backend C# substituirá login e token.
      </p>
    </div>

    <Card class="w-full max-w-md shadow-md">
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>
          Selecione o perfil para testar o painel, tarefas, tempo e relatórios.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-2">
          <Label for="user">Usuário</Label>
          <NativeSelect id="user" v-model="selectedId" class="w-full">
            <NativeSelectOption
              v-for="u in org.users"
              :key="u.id"
              :value="u.id"
            >
              {{ u.name }} — {{ u.email }}
            </NativeSelectOption>
          </NativeSelect>
        </div>
        <p v-if="selectedUser" class="text-muted-foreground text-xs">
          {{ describeUser(selectedUser) }}
        </p>
        <Button class="min-h-11 w-full" type="button" @click="login">
          Continuar
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
