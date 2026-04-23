<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useTimeSummary } from '@/composables/useTimeSummary'
import { hoursToWorkdays } from '@/config/workday'
import { taskDifficultyLabels } from '@/lib/labels'
import { usePermissions } from '@/composables/usePermissions'
import { useTaskScope } from '@/composables/useTaskScope'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'
import { useTasksStore } from '@/stores/tasks'
import { useTimeEntriesStore } from '@/stores/time-entries'
import type { TaskDifficulty, TaskItem } from '@/types'
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const tasks = useTasksStore()
const time = useTimeEntriesStore()
const prefs = usePreferencesStore()
const router = useRouter()
const { can } = usePermissions()
const { visibleTasks } = useTaskScope()
const { rangeIsoWeek } = useTimeSummary()

onMounted(() => {
  tasks.load()
})

const myId = computed(() => auth.user?.id ?? '')

const scopedPool = computed(() => visibleTasks(tasks.tasks))

const myTasks = computed(() =>
  scopedPool.value.filter((t) => t.assigneeId === myId.value),
)

const overdue = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return myTasks.value.filter(
    (t) => t.dueDate && t.dueDate < today && t.status !== 'done' && t.status !== 'cancelled',
  )
})

const weekHours = computed(() => {
  if (!myId.value) return 0
  const { start, end } = rangeIsoWeek()
  return time.hoursForUserInRange(myId.value, start, end)
})

const difficultyBreakdown = computed(() => {
  const map = new Map<TaskDifficulty, number>()
  for (const t of scopedPool.value) {
    map.set(t.difficulty, (map.get(t.difficulty) ?? 0) + 1)
  }
  return map
})

function isOpenTask(t: TaskItem) {
  return t.status !== 'done' && t.status !== 'cancelled'
}

const overdueOrg = computed(() => {
  const d = new Date().toISOString().slice(0, 10)
  return scopedPool.value.filter(
    (t) => t.dueDate && t.dueDate < d && isOpenTask(t),
  )
})

const openOrgCount = computed(() => scopedPool.value.filter(isOpenTask).length)

const nextSteps = computed(() => {
  const uid = myId.value
  if (!uid) return [] as { taskId: string; title: string; hint: string }[]
  const today = new Date().toISOString().slice(0, 10)
  const items: { taskId: string; title: string; hint: string }[] = []
  const mine = scopedPool.value.filter((t) => t.assigneeId === uid && isOpenTask(t))
  for (const t of mine) {
    if (t.dueDate && t.dueDate < today) {
      items.push({
        taskId: t.id,
        title: t.title,
        hint: 'Prazo ultrapassado — alinhe data ou estado com quem coordena o trabalho.',
      })
    }
  }
  for (const t of mine) {
    if (items.length >= 5) break
    if (items.some((i) => i.taskId === t.id)) continue
    if (!t.dueDate && (t.priority === 'urgent' || t.priority === 'high')) {
      items.push({
        taskId: t.id,
        title: t.title,
        hint: 'Sem prazo definido — convém acordar uma data objetivo.',
      })
    }
  }
  return items.slice(0, 5)
})

function openTaskFromDashboard(taskId: string) {
  void router.push({ name: 'tasks', query: { task: taskId } })
}
</script>

<template>
  <div class="space-y-8 pb-1">
    <header class="space-y-2">
      <p class="text-primary text-[11px] font-semibold tracking-wider uppercase sm:text-xs">
        Início
      </p>
      <h1 class="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
        Painel
      </h1>
      <p class="text-muted-foreground max-w-2xl text-sm leading-relaxed sm:text-base">
        O essencial num relance: as suas tarefas, alertas e tempo. Mostre só o que precisa — o painel adapta-se a si.
      </p>
    </header>

    <article
      class="space-y-5 rounded-2xl border border-border/80 bg-gradient-to-b from-muted/50 to-card p-5 shadow-sm ring-1 ring-black/[0.02] sm:p-6 dark:from-muted/10 dark:to-card dark:ring-white/[0.04]"
    >
      <div class="space-y-1">
        <h2 class="text-foreground text-base font-semibold tracking-tight">
          Personalização do painel
        </h2>
        <p class="text-muted-foreground text-xs leading-relaxed sm:text-sm">
          Escolha os cartões visíveis. As preferências ficam guardadas neste navegador.
        </p>
      </div>
      <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-3">
        <div class="flex min-h-11 items-center gap-3">
          <Switch
            id="w1"
            :checked="prefs.dashboard.showMyTasks"
            @update:checked="(v: boolean) => (prefs.dashboard.showMyTasks = v)"
          />
          <Label for="w1">Minhas tarefas</Label>
        </div>
        <div class="flex min-h-11 items-center gap-3">
          <Switch
            id="w2"
            :checked="prefs.dashboard.showOverdue"
            @update:checked="(v: boolean) => (prefs.dashboard.showOverdue = v)"
          />
          <Label for="w2">Atrasos</Label>
        </div>
        <div class="flex min-h-11 items-center gap-3">
          <Switch
            id="w3"
            :checked="prefs.dashboard.showWeekHours"
            @update:checked="(v: boolean) => (prefs.dashboard.showWeekHours = v)"
          />
          <Label for="w3">Tempo na semana</Label>
        </div>
        <div class="flex min-h-11 items-center gap-3">
          <Switch
            id="w4"
            :checked="prefs.dashboard.showDifficultyBreakdown"
            @update:checked="(v: boolean) => (prefs.dashboard.showDifficultyBreakdown = v)"
          />
          <Label for="w4">Tarefas por dificuldade</Label>
        </div>
        <div v-if="can('reports.read')" class="flex min-h-11 items-center gap-3">
          <Switch
            id="w5"
            :checked="prefs.dashboard.showTeamSignals"
            @update:checked="(v: boolean) => (prefs.dashboard.showTeamSignals = v)"
          />
          <Label for="w5">Sinais da equipe</Label>
        </div>
        <div class="flex min-h-11 items-center gap-3">
          <Switch
            id="w6"
            :checked="prefs.dashboard.showNextSteps"
            @update:checked="(v: boolean) => (prefs.dashboard.showNextSteps = v)"
          />
          <Label for="w6">Próximos passos</Label>
        </div>
      </div>
      <Separator class="bg-border/60" />
      <Button
        type="button"
        variant="outline"
        size="sm"
        class="border-dashed min-h-10 self-start"
        @click="prefs.resetDashboard()"
      >
        Restaurar padrão
      </Button>
    </article>

    <Card
      v-if="prefs.dashboard.showNextSteps && nextSteps.length"
      class="border-primary/20 rounded-2xl border-border/80 shadow-sm"
    >
      <CardHeader>
        <CardTitle class="text-base">Próximos passos (até 5)</CardTitle>
        <CardDescription>
          Lista breve a partir das suas tarefas abertas, para apoio ao planeamento.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-2">
        <div
          v-for="s in nextSteps"
          :key="s.taskId"
          class="border-border/60 flex flex-col gap-2 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="min-w-0">
            <p class="text-foreground truncate text-sm font-medium">{{ s.title }}</p>
            <p class="text-muted-foreground text-xs leading-relaxed">{{ s.hint }}</p>
          </div>
          <Button type="button" variant="secondary" size="sm" class="shrink-0" @click="openTaskFromDashboard(s.taskId)">
            Abrir tarefa
          </Button>
        </div>
      </CardContent>
    </Card>

    <div class="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
      <Card v-if="prefs.dashboard.showMyTasks" class="rounded-2xl border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle class="text-base">Minhas tarefas</CardTitle>
          <CardDescription>Atribuídas a você</CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="tasks.loading" class="space-y-2">
            <Skeleton class="h-8 w-full" />
            <Skeleton class="h-8 w-full" />
          </div>
          <div v-else class="space-y-2">
            <p class="text-3xl font-semibold tabular-nums">{{ myTasks.length }}</p>
            <Button variant="link" class="h-auto px-0" @click="router.push({ name: 'tasks' })">
              Abrir tarefas
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card v-if="prefs.dashboard.showOverdue" class="rounded-2xl border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle class="text-base">Atrasos</CardTitle>
          <CardDescription>Prazo vencido e não concluídas</CardDescription>
        </CardHeader>
        <CardContent>
          <p class="text-warning-foreground text-3xl font-semibold tabular-nums">
            {{ overdue.length }}
          </p>
          <p v-if="overdue.length" class="text-muted-foreground mt-2 text-sm">
            Revise prazos e prioridades com o time.
          </p>
        </CardContent>
      </Card>

      <Card v-if="prefs.dashboard.showWeekHours" class="rounded-2xl border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle class="text-base">Tempo nesta semana</CardTitle>
          <CardDescription>Registros (semana ISO)</CardDescription>
        </CardHeader>
        <CardContent>
          <p class="text-3xl font-semibold tabular-nums">{{ weekHours }}h</p>
          <p class="text-muted-foreground mt-1 text-sm">
            ≈ {{ hoursToWorkdays(weekHours) }} dia(s) úteis
          </p>
        </CardContent>
      </Card>

      <Card v-if="prefs.dashboard.showDifficultyBreakdown" class="rounded-2xl border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle class="text-base">Tarefas por dificuldade</CardTitle>
          <CardDescription>Distribuição no seu âmbito</CardDescription>
        </CardHeader>
        <CardContent>
          <ul class="space-y-1 text-sm">
            <li
              v-for="d in (['trivial', 'easy', 'medium', 'hard', 'epic'] as const)"
              :key="d"
              class="flex justify-between gap-2"
            >
              <span>{{ taskDifficultyLabels[d] }}</span>
              <span class="text-muted-foreground tabular-nums">
                {{ difficultyBreakdown.get(d) ?? 0 }}
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card
        v-if="can('reports.read') && prefs.dashboard.showTeamSignals"
        class="border-primary/25 rounded-2xl shadow-sm md:col-span-2"
      >
        <CardHeader>
          <CardTitle class="text-base">Sinais da equipe</CardTitle>
          <CardDescription>
            Visão compacta de atrasos e tarefas em aberto na sua área.
          </CardDescription>
        </CardHeader>
        <CardContent class="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div class="flex flex-wrap gap-6">
            <div>
              <p class="text-muted-foreground text-xs">Abertas (org.)</p>
              <p class="text-2xl font-semibold tabular-nums">{{ openOrgCount }}</p>
            </div>
            <div>
              <p class="text-muted-foreground text-xs">Atrasadas (org.)</p>
              <p class="text-warning-foreground text-2xl font-semibold tabular-nums">
                {{ overdueOrg.length }}
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="lg"
            class="min-h-12 w-full shadow-sm sm:min-h-11 sm:w-auto"
            @click="router.push({ name: 'team-insights' })"
          >
            Ver acompanhamento completo
          </Button>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
