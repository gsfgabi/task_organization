<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePermissions } from '@/composables/usePermissions'
import { useTaskScope } from '@/composables/useTaskScope'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import { useTasksStore } from '@/stores/tasks'
import type { AuditEntry, AuditLevel } from '@/stores/audit'
import { useAuditStore } from '@/stores/audit'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'

const audit = useAuditStore()
const auth = useAuthStore()
const org = useOrgStore()
const tasks = useTasksStore()
const { can } = usePermissions()
const { scope, sectorsManagedBy } = useTaskScope()

function auditEntryInScope(e: AuditEntry): boolean {
  if (!can('audit.read')) return false
  if (scope.value === 'all') return true
  if (scope.value === 'read_all' || scope.value === 'own') return false
  const u = auth.user
  if (!u) return false
  if (scope.value === 'directorate') {
    if (e.actorId) {
      const actor = org.users.find((x) => x.id === e.actorId)
      if (actor && actor.directorateId === u.directorateId) return true
    }
    const taskId = e.detail?.taskId as string | undefined
    if (taskId) {
      const t = tasks.getById(taskId)
      if (t && t.directorateId === u.directorateId) return true
    }
    for (const key of ['userId', 'fromUserId', 'toUserId'] as const) {
      const id = e.detail?.[key] as string | undefined
      if (!id) continue
      const ou = org.users.find((x) => x.id === id)
      if (ou && ou.directorateId === u.directorateId) return true
    }
    return false
  }
  if (scope.value === 'sectors') {
    const managed = new Set(sectorsManagedBy())
    if (e.actorId) {
      const actor = org.users.find((x) => x.id === e.actorId)
      if (actor && managed.has(actor.sectorId)) return true
    }
    const taskId = e.detail?.taskId as string | undefined
    if (taskId) {
      const t = tasks.getById(taskId)
      if (t && managed.has(t.sectorId)) return true
    }
    for (const key of ['userId', 'fromUserId', 'toUserId'] as const) {
      const id = e.detail?.[key] as string | undefined
      if (!id) continue
      const ou = org.users.find((x) => x.id === id)
      if (ou && managed.has(ou.sectorId)) return true
    }
    return false
  }
  return true
}

const filterLevel = ref<AuditLevel | 'all'>('all')
const filterMarked = ref<'all' | 'marked' | 'unmarked'>('all')
const q = ref('')

function levelVariant(l: AuditLevel): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (l) {
    case 'danger':
      return 'destructive'
    case 'warning':
      return 'outline'
    case 'success':
      return 'secondary'
    default:
      return 'default'
  }
}

function levelLabel(l: AuditLevel) {
  switch (l) {
    case 'danger':
      return 'Crítico'
    case 'warning':
      return 'Atenção'
    case 'success':
      return 'Sucesso'
    default:
      return 'Info'
  }
}

const filtered = computed(() => {
  const s = q.value.trim().toLowerCase()
  return audit.entries.filter((e) => {
    if (!auditEntryInScope(e)) return false
    if (filterLevel.value !== 'all' && e.level !== filterLevel.value) return false
    if (filterMarked.value === 'marked' && !e.marked) return false
    if (filterMarked.value === 'unmarked' && e.marked) return false
    if (!s) return true
    return (
      e.message.toLowerCase().includes(s) ||
      e.action.toLowerCase().includes(s) ||
      e.actorName.toLowerCase().includes(s)
    )
  })
})

function clearLog() {
  if (!confirm('Apagar todos os registos de auditoria deste navegador?')) return
  audit.clearAll()
  toast.success('Registo de auditoria limpo.')
}
</script>

<template>
  <div class="space-y-8 pb-1">
    <header class="space-y-2">
      <p class="text-primary text-[11px] font-semibold tracking-wider uppercase sm:text-xs">
        Conformidade
      </p>
      <h1 class="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
        Auditoria
      </h1>
      <p class="text-muted-foreground max-w-2xl text-sm leading-relaxed sm:text-base">
        Registo local das ações relevantes. Marque entradas para seguimento e use os filtros para localizar eventos.
      </p>
    </header>

    <article
      class="space-y-5 rounded-2xl border border-border/80 bg-gradient-to-b from-muted/50 to-card p-5 shadow-sm ring-1 ring-black/[0.02] sm:p-6 dark:from-muted/10 dark:to-card dark:ring-white/[0.04]"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div class="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            :variant="filterLevel === 'all' ? 'default' : 'outline'"
            class="rounded-md"
            @click="filterLevel = 'all'"
          >
            Todos os níveis
          </Button>
          <Button
            type="button"
            size="sm"
            :variant="filterLevel === 'info' ? 'default' : 'outline'"
            class="rounded-md"
            @click="filterLevel = 'info'"
          >
            Info
          </Button>
          <Button
            type="button"
            size="sm"
            :variant="filterLevel === 'success' ? 'default' : 'outline'"
            class="rounded-md"
            @click="filterLevel = 'success'"
          >
            Sucesso
          </Button>
          <Button
            type="button"
            size="sm"
            :variant="filterLevel === 'warning' ? 'default' : 'outline'"
            class="rounded-md"
            @click="filterLevel = 'warning'"
          >
            Atenção
          </Button>
          <Button
            type="button"
            size="sm"
            :variant="filterLevel === 'danger' ? 'default' : 'outline'"
            class="rounded-md"
            @click="filterLevel = 'danger'"
          >
            Crítico
          </Button>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            :variant="filterMarked === 'all' ? 'default' : 'outline'"
            class="rounded-md"
            @click="filterMarked = 'all'"
          >
            Todas
          </Button>
          <Button
            type="button"
            size="sm"
            :variant="filterMarked === 'marked' ? 'default' : 'outline'"
            class="rounded-md"
            @click="filterMarked = 'marked'"
          >
            Marcadas ({{ audit.markedCount }})
          </Button>
          <Button
            type="button"
            size="sm"
            :variant="filterMarked === 'unmarked' ? 'default' : 'outline'"
            class="rounded-md"
            @click="filterMarked = 'unmarked'"
          >
            Sem marca
          </Button>
        </div>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div class="grid w-full max-w-md gap-1.5">
          <label class="text-muted-foreground text-xs font-medium" for="audit-q">Pesquisar</label>
          <input
            id="audit-q"
            v-model="q"
            type="search"
            placeholder="Mensagem, ação ou utilizador…"
            class="border-border/80 bg-background focus-visible:ring-ring/45 h-10 w-full rounded-md border px-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:outline-none"
          >
        </div>
        <Button
          v-if="can('audit.read') && audit.entries.length"
          type="button"
          variant="outline"
          size="sm"
          class="border-destructive/40 text-destructive hover:bg-destructive/10 rounded-md"
          @click="clearLog"
        >
          Limpar tudo
        </Button>
      </div>
    </article>

    <div class="overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-sm">
      <Table class="min-w-[720px] text-sm">
        <TableHeader>
          <TableRow>
            <TableHead class="w-[3rem]" />
            <TableHead class="w-[10rem]">Quando</TableHead>
            <TableHead class="w-[8rem]">Nível</TableHead>
            <TableHead>Quem</TableHead>
            <TableHead>Ação</TableHead>
            <TableHead>Mensagem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="e in filtered" :key="e.id" :class="e.marked ? 'bg-warning/5' : ''">
            <TableCell class="align-top">
              <Checkbox
                :checked="e.marked"
                class="mt-0.5"
                :aria-label="e.marked ? 'Desmarcar entrada' : 'Marcar entrada'"
                @update:checked="(v: boolean) => audit.setMarked(e.id, v)"
              />
            </TableCell>
            <TableCell class="text-muted-foreground align-top font-mono text-xs tabular-nums">
              {{ new Date(e.ts).toLocaleString('pt-BR') }}
            </TableCell>
            <TableCell class="align-top">
              <Badge :variant="levelVariant(e.level)">
                {{ levelLabel(e.level) }}
              </Badge>
            </TableCell>
            <TableCell class="align-top font-medium">
              {{ e.actorName }}
            </TableCell>
            <TableCell class="text-muted-foreground align-top font-mono text-xs">
              {{ e.action }}
            </TableCell>
            <TableCell class="align-top">
              <span class="leading-snug">{{ e.message }}</span>
              <template v-if="e.detail && Object.keys(e.detail).length">
                <Separator class="my-2 bg-border/50" />
                <pre class="text-muted-foreground max-h-24 overflow-auto rounded-md bg-muted/50 p-2 font-mono text-[10px] leading-relaxed">{{ JSON.stringify(e.detail, null, 0) }}</pre>
              </template>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
    <p v-if="!filtered.length" class="text-muted-foreground text-center text-sm">
      {{ audit.entries.length ? 'Nenhum evento corresponde aos filtros.' : 'Ainda não há eventos registados.' }}
    </p>
  </div>
</template>
