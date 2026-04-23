<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePermissions } from '@/composables/usePermissions'
import { useTaskScope } from '@/composables/useTaskScope'
import { useTimeSummary } from '@/composables/useTimeSummary'
import { downloadCsv } from '@/lib/csv'
import { taskPriorityLabels, taskStatusLabels } from '@/lib/labels'
import { useAuditStore } from '@/stores/audit'
import { useOrgStore } from '@/stores/org'
import { useTasksStore } from '@/stores/tasks'
import { useTimeEntriesStore } from '@/stores/time-entries'
import type { TaskItem, User } from '@/types'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

const audit = useAuditStore()
const org = useOrgStore()
const tasks = useTasksStore()
const time = useTimeEntriesStore()
const router = useRouter()
const { can } = usePermissions()
const { rangeIsoWeek } = useTimeSummary()
const { visibleTasks, visibleUsers, isTaskVisible } = useTaskScope()

const scopedTasks = computed(() => visibleTasks(tasks.tasks))

const today = computed(() => new Date().toISOString().slice(0, 10))

function isOpen(t: TaskItem) {
  return t.status !== 'done' && t.status !== 'cancelled'
}

const openTasks = computed(() => scopedTasks.value.filter(isOpen))

const overdueAll = computed(() => {
  const d = today.value
  return scopedTasks.value.filter(
    (t) => t.dueDate && t.dueDate < d && isOpen(t),
  )
})

const dueSoonRisk = computed(() => {
  const d0 = new Date(today.value + 'T12:00:00')
  const limit = new Date(d0)
  limit.setDate(limit.getDate() + 3)
  const lim = limit.toISOString().slice(0, 10)
  const d = today.value
  return scopedTasks.value.filter(
    (t) =>
      isOpen(t) &&
      t.dueDate &&
      t.dueDate >= d &&
      t.dueDate <= lim &&
      (t.priority === 'urgent' || t.priority === 'high' || t.difficulty === 'hard' || t.difficulty === 'epic'),
  )
})

const riskTasks = computed(() => {
  const scored = [...openTasks.value].filter((t) => t.dueDate || t.priority === 'urgent' || t.priority === 'high')
  const d = today.value
  return scored
    .map((t) => {
      let score = 0
      if (t.dueDate && t.dueDate < d) score += 100
      if (t.dueDate && t.dueDate >= d) {
        const days = (new Date(t.dueDate).getTime() - new Date(d).getTime()) / 86400000
        if (days <= 3) score += 40 - days * 5
      }
      if (t.priority === 'urgent') score += 30
      else if (t.priority === 'high') score += 15
      return { t, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map((x) => x.t)
})

const weekRange = computed(() => rangeIsoWeek())

const weekHoursTotal = computed(() => {
  const { start, end } = weekRange.value
  return time.entries
    .filter((e) => {
      if (e.date < start || e.date > end) return false
      const tr = tasks.getById(e.taskId)
      if (!tr) return true
      return isTaskVisible(tr)
    })
    .reduce((a, e) => a + e.hours, 0)
})

const usersWithOverdue = computed(() => {
  const set = new Set(overdueAll.value.map((t) => t.assigneeId))
  return set.size
})

function userOverdueCount(u: User) {
  return overdueAll.value.filter((t) => t.assigneeId === u.id).length
}

function userOpenCount(u: User) {
  return scopedTasks.value.filter((t) => t.assigneeId === u.id && isOpen(t)).length
}

function userWeekHours(u: User) {
  const { start, end } = weekRange.value
  let sum = 0
  for (const e of time.entries) {
    if (e.userId !== u.id || e.date < start || e.date > end) continue
    const tr = tasks.getById(e.taskId)
    if (tr && !isTaskVisible(tr)) continue
    sum += e.hours
  }
  return sum
}

function userOpenEstimate(u: User) {
  return scopedTasks.value
    .filter((t) => t.assigneeId === u.id && isOpen(t))
    .reduce((a, t) => a + t.estimatedHours, 0)
}

const activeUsers = computed(() => visibleUsers(org.users.filter((u) => u.active)))

const recentTime = computed(() =>
  [...time.entries]
    .filter((e) => {
      const tr = tasks.getById(e.taskId)
      if (!tr) return true
      return isTaskVisible(tr)
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10),
)

function varianceHint(logged: number, estimated: number) {
  if (estimated <= 0) return '—'
  const ratio = logged / estimated
  if (ratio > 1.15) return 'Estimativa estourada'
  if (ratio < 0.5) return 'Pouco tempo registrado'
  return 'Dentro do esperado'
}

function exportAcompanhamentoCsv() {
  if (!can('reports.export')) {
    toast.error('Sem permissão para exportar.')
    return
  }
  const stamp = new Date().toISOString().slice(0, 19).replaceAll(':', '-')
  const h: string[] = ['Secao', 'A', 'B', 'C', 'D', 'E']
  const rows: (string | number)[][] = []
  rows.push(['KPI', 'Tarefas abertas', openTasks.value.length, '', '', ''])
  rows.push(['KPI', 'Atrasadas', overdueAll.value.length, '', '', ''])
  rows.push(['KPI', 'Horas semana ISO (equipe)', `${weekHoursTotal.value}h`, '', '', ''])
  rows.push(['KPI', 'Colaboradores com atraso', usersWithOverdue.value, '', '', ''])
  for (const t of riskTasks.value) {
    rows.push([
      'RISCO',
      t.title,
      org.userName(t.assigneeId),
      t.dueDate ?? '—',
      taskStatusLabels[t.status],
      taskPriorityLabels[t.priority],
    ])
  }
  for (const u of activeUsers.value) {
    rows.push([
      'COLABORADOR',
      u.name,
      userOpenCount(u),
      userOverdueCount(u),
      `${userOpenEstimate(u)}h estim.`,
      `${userWeekHours(u)}h sem.`,
    ])
  }
  for (const e of recentTime.value) {
    rows.push([
      'TEMPO_RECENTE',
      org.userName(e.userId),
      e.date,
      tasks.getById(e.taskId)?.title ?? e.taskId,
      `${e.hours}h`,
      e.note.slice(0, 80),
    ])
  }
  downloadCsv(`acompanhamento-${stamp}.csv`, h, rows)
  audit.add({
    action: 'reports.export',
    message: `Exportação CSV: acompanhamento da equipa (${stamp})`,
    level: 'success',
    detail: { rows: rows.length },
  })
  toast.success('CSV gerado.')
}
</script>

<template>
  <div class="space-y-8 pb-1">
    <header class="space-y-2">
      <p class="text-primary text-[11px] font-semibold tracking-wider uppercase sm:text-xs">
        Visão geral
      </p>
      <h1 class="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
        Acompanhamento da equipe
      </h1>
      <p class="text-muted-foreground max-w-3xl text-sm leading-relaxed sm:text-base">
        Indicadores agregados de carga e tempo para planear apoio à equipa. Os números orientam conversas — não substituem
        o contexto nem decisões individuais sobre desempenho.
      </p>
    </header>

    <article
      class="space-y-5 rounded-2xl border border-border/80 bg-gradient-to-b from-muted/50 to-card p-5 shadow-sm ring-1 ring-black/[0.02] sm:p-6 dark:from-muted/10 dark:to-card dark:ring-white/[0.04]"
    >
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card class="border-border/60 shadow-none">
          <CardHeader class="pb-2">
            <CardTitle class="text-sm font-medium">Tarefas abertas</CardTitle>
          </CardHeader>
          <CardContent>
            <p class="text-2xl font-semibold tabular-nums">{{ openTasks.length }}</p>
            <p class="text-muted-foreground mt-1 text-xs">Não concluídas nem canceladas</p>
          </CardContent>
        </Card>
        <Card class="border-warning/40 bg-warning/5 shadow-none">
          <CardHeader class="pb-2">
            <CardTitle class="text-sm font-medium text-warning-foreground">Atrasadas</CardTitle>
          </CardHeader>
          <CardContent>
            <p class="text-warning-foreground text-2xl font-semibold tabular-nums">{{ overdueAll.length }}</p>
            <p class="text-muted-foreground mt-1 text-xs">Prazo vencido</p>
          </CardContent>
        </Card>
        <Card class="border-border/60 shadow-none">
          <CardHeader class="pb-2">
            <CardTitle class="text-sm font-medium">Horas (semana ISO)</CardTitle>
          </CardHeader>
          <CardContent>
            <p class="text-2xl font-semibold tabular-nums">{{ weekHoursTotal }}h</p>
            <p class="text-muted-foreground mt-1 text-xs">Toda a equipe</p>
          </CardContent>
        </Card>
        <Card class="border-border/60 shadow-none">
          <CardHeader class="pb-2">
            <CardTitle class="text-sm font-medium">Com atraso</CardTitle>
          </CardHeader>
          <CardContent>
            <p class="text-2xl font-semibold tabular-nums">{{ usersWithOverdue }}</p>
            <p class="text-muted-foreground mt-1 text-xs">Colaboradores únicos</p>
          </CardContent>
        </Card>
      </div>

      <Separator class="bg-border/60" />

      <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          v-if="can('reports.export')"
          type="button"
          variant="default"
          size="lg"
          class="min-h-12 w-full shadow-sm sm:min-h-11 sm:w-auto"
          @click="exportAcompanhamentoCsv"
        >
          Exportar CSV
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          class="min-h-12 w-full sm:min-h-11 sm:w-auto"
          @click="router.push({ name: 'tasks' })"
        >
          Abrir tarefas
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          class="min-h-12 w-full border-dashed sm:min-h-11 sm:w-auto"
          @click="router.push({ name: 'time' })"
        >
          Registro de tempo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          class="min-h-12 w-full border-dashed sm:min-h-11 sm:w-auto"
          @click="router.push({ name: 'reports' })"
        >
          Relatórios
        </Button>
      </div>
    </article>

    <Card class="rounded-2xl border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle class="text-base">Tarefas que pedem atenção</CardTitle>
        <CardDescription>
          Prioridade por atraso, urgência e prazo próximo.
        </CardDescription>
      </CardHeader>
      <CardContent class="p-0 sm:p-6 sm:pt-0">
        <p v-if="!riskTasks.length" class="text-muted-foreground px-4 py-8 text-center text-sm sm:px-6">
          Nenhuma tarefa em destaque por risco. Bom sinal.
        </p>
        <div v-else class="md:hidden">
          <div
            v-for="t in riskTasks"
            :key="t.id"
            class="border-b px-4 py-3 last:border-0"
          >
            <p class="font-medium leading-snug">{{ t.title }}</p>
            <p class="text-muted-foreground mt-1 text-xs">
              {{ org.userName(t.assigneeId) }} · {{ t.dueDate ?? 'sem prazo' }}
            </p>
            <div class="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">{{ taskStatusLabels[t.status] }}</Badge>
              <Badge variant="secondary">{{ taskPriorityLabels[t.priority] }}</Badge>
            </div>
          </div>
        </div>
        <div class="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarefa</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="t in riskTasks" :key="t.id">
                <TableCell class="max-w-[14rem] font-medium">
                  {{ t.title }}
                </TableCell>
                <TableCell>{{ org.userName(t.assigneeId) }}</TableCell>
                <TableCell class="tabular-nums">{{ t.dueDate ?? '—' }}</TableCell>
                <TableCell>{{ taskStatusLabels[t.status] }}</TableCell>
                <TableCell>{{ taskPriorityLabels[t.priority] }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <Card class="rounded-2xl border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle class="text-base">Carga por colaborador</CardTitle>
        <CardDescription>
          Tarefas abertas, atrasos, estimativa em aberto e tempo na semana — visão tipo “workload” de ferramentas
          corporativas.
        </CardDescription>
      </CardHeader>
      <CardContent class="p-0 sm:p-6 sm:pt-0">
        <div class="space-y-3 lg:hidden">
          <Card v-for="u in activeUsers" :key="u.id" class="shadow-sm">
            <CardContent class="space-y-2 p-4 text-sm">
              <p class="font-medium">{{ u.name }}</p>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <span class="text-muted-foreground text-xs">Abertas</span>
                  <p class="tabular-nums font-semibold">{{ userOpenCount(u) }}</p>
                </div>
                <div>
                  <span class="text-muted-foreground text-xs">Atrasadas</span>
                  <p class="tabular-nums font-semibold text-warning-foreground">{{ userOverdueCount(u) }}</p>
                </div>
                <div>
                  <span class="text-muted-foreground text-xs">Estim. aberto</span>
                  <p class="tabular-nums font-semibold">{{ userOpenEstimate(u) }}h</p>
                </div>
                <div>
                  <span class="text-muted-foreground text-xs">Tempo (sem.)</span>
                  <p class="tabular-nums font-semibold">{{ userWeekHours(u) }}h</p>
                </div>
              </div>
              <p class="text-muted-foreground text-xs">
                {{ varianceHint(userWeekHours(u), userOpenEstimate(u)) }}
              </p>
            </CardContent>
          </Card>
        </div>
        <div class="hidden overflow-x-auto lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead class="text-right">Abertas</TableHead>
                <TableHead class="text-right">Atrasadas</TableHead>
                <TableHead class="text-right">Estim. (aberto)</TableHead>
                <TableHead class="text-right">Tempo (sem.)</TableHead>
                <TableHead>Sinal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="u in activeUsers" :key="u.id">
                <TableCell class="font-medium">{{ u.name }}</TableCell>
                <TableCell class="text-right tabular-nums">{{ userOpenCount(u) }}</TableCell>
                <TableCell class="text-right tabular-nums text-warning-foreground">
                  {{ userOverdueCount(u) }}
                </TableCell>
                <TableCell class="text-right tabular-nums">{{ userOpenEstimate(u) }}h</TableCell>
                <TableCell class="text-right tabular-nums">{{ userWeekHours(u) }}h</TableCell>
                <TableCell class="text-muted-foreground text-sm">
                  {{ varianceHint(userWeekHours(u), userOpenEstimate(u)) }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <Card class="rounded-2xl border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle class="text-base">Últimos registros de tempo</CardTitle>
        <CardDescription>
          Últimos registos de tempo: quem lançou e em que tarefa.
        </CardDescription>
      </CardHeader>
      <CardContent class="p-0 sm:p-6 sm:pt-0">
        <ul class="divide-y">
          <li
            v-for="e in recentTime"
            :key="e.id"
            class="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-0"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium">
                {{ org.userName(e.userId) }}
                <span class="text-muted-foreground font-normal">· {{ e.date }}</span>
              </p>
              <p class="text-muted-foreground truncate text-xs">
                {{ tasks.getById(e.taskId)?.title ?? e.taskId }}
              </p>
            </div>
            <span class="tabular-nums text-sm font-semibold">{{ e.hours }}h</span>
          </li>
        </ul>
        <p v-if="!recentTime.length" class="text-muted-foreground px-4 py-6 text-center text-sm">
          Ainda não há registros de tempo.
        </p>
      </CardContent>
    </Card>

    <p v-if="dueSoonRisk.length" class="text-muted-foreground text-xs leading-relaxed">
      {{ dueSoonRisk.length }} tarefa(s) com prazo nos próximos 3 dias e prioridade ou complexidade elevada — vale
      sincronizar com o responsável.
    </p>
  </div>
</template>
