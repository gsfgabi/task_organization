<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useTimeSummary } from '@/composables/useTimeSummary'
import { hoursToWorkdays } from '@/config/workday'
import { taskDifficultyLabels } from '@/lib/labels'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'
import { useTasksStore } from '@/stores/tasks'
import { useTimeEntriesStore } from '@/stores/time-entries'
import type { TaskDifficulty } from '@/types'
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const tasks = useTasksStore()
const time = useTimeEntriesStore()
const prefs = usePreferencesStore()
const router = useRouter()
const { rangeIsoWeek } = useTimeSummary()

onMounted(() => {
  tasks.load()
})

const myId = computed(() => auth.user?.id ?? '')

const myTasks = computed(() =>
  tasks.tasks.filter((t) => t.assigneeId === myId.value),
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
  for (const t of tasks.tasks) {
    map.set(t.difficulty, (map.get(t.difficulty) ?? 0) + 1)
  }
  return map
})
</script>

<template>
  <div class="space-y-5 sm:space-y-6">
    <p class="text-muted-foreground text-sm leading-relaxed sm:text-base">
      Resumo do que importa agora. Personalize os blocos abaixo.
    </p>

    <Card class="border-dashed">
      <CardHeader class="pb-3">
        <CardTitle class="text-base">Personalização do painel</CardTitle>
        <CardDescription>
          Escolha quais cartões deseja ver. As preferências ficam no navegador.
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          class="min-h-10 self-start sm:self-center"
          @click="prefs.resetDashboard()"
        >
          Restaurar padrão
        </Button>
      </CardContent>
    </Card>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
      <Card v-if="prefs.dashboard.showMyTasks">
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

      <Card v-if="prefs.dashboard.showOverdue">
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

      <Card v-if="prefs.dashboard.showWeekHours">
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

      <Card v-if="prefs.dashboard.showDifficultyBreakdown">
        <CardHeader>
          <CardTitle class="text-base">Tarefas por dificuldade</CardTitle>
          <CardDescription>Distribuição global</CardDescription>
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
    </div>
  </div>
</template>
