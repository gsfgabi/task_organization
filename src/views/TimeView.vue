<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { MAX_HOURS_PER_CALENDAR_DAY } from '@/config/time-rules'
import { usePermissions } from '@/composables/usePermissions'
import { useTaskScope } from '@/composables/useTaskScope'
import { useTimeSummary } from '@/composables/useTimeSummary'
import { hoursToWorkdays } from '@/config/workday'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import { useTasksStore } from '@/stores/tasks'
import { useTimeEntriesStore } from '@/stores/time-entries'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

const auth = useAuthStore()
const org = useOrgStore()
const tasks = useTasksStore()
const time = useTimeEntriesStore()
const { can } = usePermissions()
const { rangeIsoWeek } = useTimeSummary()
const { visibleTasks, isTaskVisible } = useTaskScope()

const scopedTasks = computed(() => visibleTasks(tasks.tasks))
const taskId = ref('')

watch(
  scopedTasks,
  (list) => {
    if (list.some((t) => t.id === taskId.value)) return
    taskId.value = list[0]?.id ?? ''
  },
  { immediate: true },
)
const date = ref(new Date().toISOString().slice(0, 10))
const hours = ref(2)
const note = ref('')

const weekRange = computed(() => rangeIsoWeek())

const weekTotal = computed(() => {
  const uid = auth.user?.id
  if (!uid) return 0
  return time.hoursForUserInRange(uid, weekRange.value.start, weekRange.value.end)
})

const totalByDay = computed(() => {
  const uid = auth.user?.id
  if (!uid) return []
  const map = new Map<string, number>()
  for (const e of time.entries) {
    if (e.userId !== uid) continue
    const tr = tasks.getById(e.taskId)
    if (tr && !isTaskVisible(tr)) continue
    map.set(e.date, (map.get(e.date) ?? 0) + e.hours)
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
})

const visibleTimeEntries = computed(() => {
  const uid = auth.user?.id
  return time.entries.filter((e) => {
    const tr = tasks.getById(e.taskId)
    if (!tr) return true
    if (isTaskVisible(tr)) return true
    return uid != null && e.userId === uid
  })
})

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function addEntry() {
  if (!can('time.create')) {
    toast.error('Sem permissão para registrar tempo.')
    return
  }
  if (!taskId.value) {
    toast.error('Selecione uma tarefa.')
    return
  }
  const taskRow = tasks.getById(taskId.value)
  if (!taskRow || !isTaskVisible(taskRow)) {
    toast.error('Tarefa inválida ou fora do seu âmbito.')
    return
  }
  const h = Number(hours.value) || 0
  if (h <= 0) {
    toast.error('Indique horas maiores que zero.')
    return
  }
  if (date.value > todayIso()) {
    toast.error('Não é possível registar tempo em data futura.')
    return
  }
  const uid = auth.user!.id
  const daySum = time.hoursForUserOnDate(uid, date.value)
  if (daySum + h > MAX_HOURS_PER_CALENDAR_DAY) {
    toast.error(
      `Limite de ${MAX_HOURS_PER_CALENDAR_DAY}h por dia (já tem ${daySum}h neste dia). Ajuste o valor ou o dia.`,
    )
    return
  }
  const dup = time.entries.some(
    (e) => e.userId === uid && e.taskId === taskId.value && e.date === date.value,
  )
  if (dup && !confirm('Já existe tempo nesta tarefa neste dia. Deseja acrescentar outra linha?')) {
    return
  }
  time.add({
    taskId: taskId.value,
    userId: uid,
    date: date.value,
    hours: h,
    note: note.value,
  })
  note.value = ''
  toast.success('Tempo registrado.')
}

function removeRow(id: string) {
  if (!can('time.delete')) {
    toast.error('Sem permissão para excluir.')
    return
  }
  time.remove(id)
  toast.success('Registro removido.')
}
</script>

<template>
  <div class="space-y-8 pb-1">
    <header class="space-y-2">
      <p class="text-primary text-[11px] font-semibold tracking-wider uppercase sm:text-xs">
        Capacidade
      </p>
      <h1 class="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
        Registro de tempo
      </h1>
      <p class="text-muted-foreground max-w-2xl text-sm leading-relaxed sm:text-base">
        Associe horas a tarefas e dias. Os totais e dias úteis usam 1 dia útil = 8h.
      </p>
    </header>

    <article
      class="space-y-5 rounded-2xl border border-border/80 bg-gradient-to-b from-muted/50 to-card p-5 shadow-sm ring-1 ring-black/[0.02] sm:p-6 dark:from-muted/10 dark:to-card dark:ring-white/[0.04]"
    >
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card class="border-border/60 shadow-none">
          <CardHeader>
            <CardTitle class="text-base">Semana atual</CardTitle>
            <CardDescription>{{ weekRange.start }} — {{ weekRange.end }}</CardDescription>
          </CardHeader>
          <CardContent>
            <p class="text-3xl font-semibold tabular-nums">{{ weekTotal }}h</p>
            <p class="text-muted-foreground mt-1 text-sm">
              ≈ {{ hoursToWorkdays(weekTotal) }} dia(s) úteis
            </p>
          </CardContent>
        </Card>
        <Card class="border-border/60 shadow-none">
          <CardHeader>
            <CardTitle class="text-base">Total geral</CardTitle>
            <CardDescription>Todos os registros</CardDescription>
          </CardHeader>
          <CardContent>
            <p class="text-3xl font-semibold tabular-nums">{{ time.totalHours }}h</p>
          </CardContent>
        </Card>
        <Card class="border-border/60 shadow-none sm:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle class="text-base">Por dia (você)</CardTitle>
            <CardDescription>Agregado simples</CardDescription>
          </CardHeader>
          <CardContent>
            <ul class="max-h-40 space-y-1 overflow-y-auto pr-1 text-sm">
              <li
                v-for="[d, h] in totalByDay"
                :key="d"
                class="flex justify-between gap-2"
              >
                <span>{{ d }}</span>
                <span class="tabular-nums">{{ h }}h</span>
              </li>
              <li
                v-if="!totalByDay.length"
                class="text-muted-foreground"
              >
                Nenhum registro ainda.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </article>

    <Card v-if="can('time.create')" class="rounded-2xl border-border/80 shadow-sm">
      <CardHeader class="space-y-1 pb-4">
        <CardTitle class="text-lg">Novo registro</CardTitle>
        <CardDescription class="text-pretty leading-relaxed">
          Vinculado à sua conta. Preencha e confirme — pode editar ou apagar depois na lista abaixo.
        </CardDescription>
      </CardHeader>
      <CardContent class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="grid gap-2 sm:col-span-2">
          <Label>Tarefa</Label>
          <NativeSelect v-model="taskId" class="w-full max-w-full">
            <NativeSelectOption
              v-for="t in scopedTasks"
              :key="t.id"
              :value="t.id"
            >
              {{ t.title }}
            </NativeSelectOption>
          </NativeSelect>
        </div>
        <div class="grid gap-2">
          <Label for="d">Data</Label>
          <Input id="d" v-model="date" class="min-h-12 border-border/80 shadow-sm sm:min-h-11" type="date" />
        </div>
        <div class="grid gap-2">
          <Label for="h">Horas</Label>
          <Input
            id="h"
            v-model.number="hours"
            class="min-h-12 border-border/80 shadow-sm sm:min-h-11"
            min="0"
            step="0.25"
            type="number"
          />
        </div>
        <div class="grid gap-2 sm:col-span-2 lg:col-span-4">
          <Label for="n">Observação</Label>
          <Textarea id="n" v-model="note" class="border-border/80" rows="2" />
        </div>
        <div class="sm:col-span-2 lg:col-span-4">
          <Button type="button" size="lg" class="min-h-12 w-full shadow-sm sm:min-h-11 sm:w-auto" @click="addEntry">
            Registrar
          </Button>
        </div>
      </CardContent>
    </Card>

    <section class="space-y-3">
      <div class="space-y-1">
        <h2 class="text-foreground text-base font-semibold tracking-tight">
          Histórico
        </h2>
        <p class="text-muted-foreground text-xs sm:text-sm">
          Todos os lançamentos (demo). Em ecrã grande vê-se em tabela.
        </p>
      </div>
      <Separator class="bg-border/60 lg:hidden" />
    </section>

    <div class="space-y-3 lg:hidden">
      <Card v-for="e in visibleTimeEntries" :key="e.id" class="overflow-hidden rounded-2xl border-border/80 shadow-sm">
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium leading-snug">
            {{ tasks.getById(e.taskId)?.title ?? e.taskId }}
          </CardTitle>
          <CardDescription class="text-xs">
            {{ e.date }} · {{ org.userName(e.userId) }} ·
            <span class="tabular-nums font-medium text-foreground">{{ e.hours }}h</span>
          </CardDescription>
        </CardHeader>
        <CardContent v-if="e.note" class="pt-0 text-sm text-pretty">
          {{ e.note }}
        </CardContent>
        <CardFooter
          v-if="can('time.delete')"
          class="border-t bg-muted/30 py-3"
        >
          <Button
            variant="outline"
            type="button"
            class="text-destructive hover:text-destructive min-h-11 w-full border-destructive/30 sm:min-h-10"
            @click="removeRow(e.id)"
          >
            Excluir registro
          </Button>
        </CardFooter>
      </Card>
      <p
        v-if="!visibleTimeEntries.length"
        class="text-muted-foreground py-6 text-center text-sm"
      >
        Nenhum registro de tempo ainda.
      </p>
    </div>

    <div
      v-if="visibleTimeEntries.length"
      class="hidden overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-sm lg:block"
    >
      <Table class="min-w-[640px]">
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Tarefa</TableHead>
            <TableHead>Usuário</TableHead>
            <TableHead class="text-right">Horas</TableHead>
            <TableHead>Nota</TableHead>
            <TableHead class="w-[80px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="e in visibleTimeEntries" :key="e.id">
            <TableCell>{{ e.date }}</TableCell>
            <TableCell>{{ tasks.getById(e.taskId)?.title ?? e.taskId }}</TableCell>
            <TableCell>{{ org.userName(e.userId) }}</TableCell>
            <TableCell class="text-right tabular-nums">
              {{ e.hours }}
            </TableCell>
            <TableCell class="max-w-[240px] truncate">
              {{ e.note }}
            </TableCell>
            <TableCell class="text-right whitespace-nowrap">
              <Button
                v-if="can('time.delete')"
                variant="ghost"
                size="sm"
                class="text-destructive min-h-9 min-w-[4.5rem]"
                type="button"
                @click="removeRow(e.id)"
              >
                Excluir
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>
