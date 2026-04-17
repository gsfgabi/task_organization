<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
    <h1 class="text-4xl font-semibold">404</h1>
    <p class="text-muted-foreground text-center">
      Página não encontrada.
    </p>
    <Button type="button" @click="router.push({ name: 'dashboard' })">
      Voltar ao painel
    </Button>
  </div>
</template>
