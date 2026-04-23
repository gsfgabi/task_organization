<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div
    class="flex min-h-[100dvh] flex-col items-center justify-center gap-8 bg-gradient-to-b from-muted/50 to-background px-6 py-10 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:gap-10 dark:from-muted/10"
  >
    <header class="max-w-md text-center">
      <p class="text-primary text-[11px] font-semibold tracking-wider uppercase sm:text-xs">
        Página
      </p>
      <h1 class="text-foreground mt-2 text-5xl font-semibold tracking-tight sm:text-6xl">
        404
      </h1>
      <p class="text-muted-foreground mt-3 text-pretty text-sm leading-relaxed sm:text-base">
        Este endereço não existe ou foi movido. Verifique o URL ou volte ao painel.
      </p>
    </header>

    <Card
      class="w-full max-w-[min(100%,22rem)] rounded-2xl border-border/80 shadow-lg ring-1 ring-black/[0.03] dark:ring-white/[0.04] sm:max-w-sm"
    >
      <CardHeader class="space-y-1 pb-2 text-center">
        <CardTitle class="text-base">O que fazer</CardTitle>
        <CardDescription class="text-pretty text-xs leading-relaxed sm:text-sm">
          Use o menu lateral ou o botão abaixo para regressar à área principal.
        </CardDescription>
      </CardHeader>
      <CardContent class="pt-0">
        <Button
          type="button"
          size="lg"
          class="min-h-12 w-full shadow-sm sm:min-h-11"
          @click="router.push({ name: 'dashboard' })"
        >
          Voltar ao painel
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
