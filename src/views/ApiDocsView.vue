<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth'
import { parse } from 'yaml'
import { computed, onMounted, onUnmounted } from 'vue'
import openApiAssetUrl from '../../docs/openapi.yaml?url'

const auth = useAuthStore()
const apiBaseDisplay = computed(() =>
  String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, ''),
)

onMounted(async () => {
  const [{ default: SwaggerUIBundle }, { default: SwaggerUIStandalonePreset }] = await Promise.all([
    import('swagger-ui-dist/swagger-ui-es-bundle.js'),
    import('swagger-ui-dist/swagger-ui-standalone-preset.js'),
  ])
  await import('swagger-ui-dist/swagger-ui.css')

  const res = await fetch(openApiAssetUrl)
  const text = await res.text()
  const spec = parse(text) as Record<string, unknown>
  const rawBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
  spec.servers = [{ url: String(rawBase).replace(/\/$/, ''), description: 'API (VITE_API_BASE_URL)' }]

  SwaggerUIBundle({
    spec,
    dom_id: '#swagger-api-docs-mount',
    deepLinking: true,
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
    plugins: [SwaggerUIBundle.plugins.DownloadUrl],
    layout: 'StandaloneLayout',
    requestInterceptor: (req: { headers?: Record<string, string> }) => {
      const headers = { ...req.headers }
      const token = auth.token
      if (token && !headers.Authorization) {
        headers.Authorization = `Bearer ${token}`
      }
      return { ...req, headers }
    },
  })
})

onUnmounted(() => {
  const el = document.getElementById('swagger-api-docs-mount')
  if (el) el.innerHTML = ''
})
</script>

<template>
  <div class="space-y-4 pb-4">
    <header class="space-y-2">
      <p class="text-primary text-[11px] font-semibold tracking-wider uppercase sm:text-xs">
        Integração
      </p>
      <h1 class="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
        Documentação da API (Swagger)
      </h1>
      <p class="text-muted-foreground max-w-3xl text-sm leading-relaxed sm:text-base">
        Especificação OpenAPI embutida. Os pedidos «Try it out» usam a URL base
        <code class="text-foreground bg-muted rounded px-1 py-0.5 text-xs">{{ apiBaseDisplay }}</code>
        e enviam automaticamente o token da sessão atual (<code class="text-foreground bg-muted rounded px-1 py-0.5 text-xs">Authorization: Bearer</code>), se existir.
      </p>
    </header>

    <Card class="overflow-hidden rounded-2xl border-border/80 shadow-sm">
      <CardHeader class="pb-2">
        <CardTitle class="text-lg">Rotas</CardTitle>
        <CardDescription class="text-pretty">
          Expanda cada operação e use «Try it out» para enviar pedidos reais.
        </CardDescription>
      </CardHeader>
      <CardContent class="p-0">
        <div
          id="swagger-api-docs-mount"
          class="swagger-wrap bg-card min-h-[calc(100dvh-14rem)] w-full overflow-auto"
        />
      </CardContent>
    </Card>
  </div>
</template>

<style scoped>
.swagger-wrap :deep(.swagger-ui) {
  font-family: inherit;
}
.swagger-wrap :deep(.swagger-ui .topbar) {
  display: none;
}
.swagger-wrap :deep(.swagger-ui .information-container.wrapper) {
  padding-top: 1rem;
}
</style>
