<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { usePermissions } from '@/composables/usePermissions'
import { useTimeSummary } from '@/composables/useTimeSummary'
import { hoursToWorkdays } from '@/config/workday'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import { useTasksStore } from '@/stores/tasks'
import { useTimeEntriesStore } from '@/stores/time-entries'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'

const auth = useAuthStore()
const org = useOrgStore()
const tasks = useTasksStore()
const time = useTimeEntriesStore()
const { can } = usePermissions()
const { rangeIsoWeek } = useTimeSummary()

const taskId = ref(tasks.tasks[0]?.id ?? '')
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
    map.set(e.date, (map.get(e.date) ?? 0) + e.hours)
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
})

function addEntry() {
  if (!can('time.create')) {
    toast.error('Sem permissão para registrar tempo.')
    return
  }
  if (!taskId.value) {
    toast.error('Selecione uma tarefa.')
    return
  }
  time.add({
    taskId: taskId.value,
    userId: auth.user!.id,
    date: date.value,
    hours: Number(hours.value) || 0,
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
  <div class="space-y-5 sm:space-y-6">
    <p class="text-muted-foreground text-sm leading-relaxed sm:text-base">
      Registre horas por tarefa e dia. Totais e dias úteis são calculados no front (1 dia útil = 8h).
    </p>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle class="text-base">Semana atual</CardTitle>
          <CardDescription>{{ weekRange.start }}–{{ weekRange.end }}</CardDescription>
        </CardHeader>
        <CardContent>
          <p class="text-3xl font-semibold tabular-nums">{{ weekTotal }}h</p>
          <p class="text-muted-foreground mt-1 text-sm">
            ≈ {{ hoursToWorkdays(weekTotal) }} dia(s) úteis
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle class="text-base">Total geral (mock)</CardTitle>
          <CardDescription>Todos os registros</CardDescription>
        </CardHeader>
        <CardContent>
          <p class="text-3xl font-semibold tabular-nums">{{ time.totalHours }}h</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle class="text-base">Por dia (você)</CardTitle>
          <CardDescription>Agregado simples</CardDescription>
        </CardHeader>
        <CardContent>
          <ul class="space-y-1 text-sm">
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

    <Card v-if="can('time.create')">
      <CardHeader>
        <CardTitle class="text-base">Novo registro</CardTitle>
        <CardDescription>
          Vinculado à sua conta. Ao integrar com a API, o backend validará permissões.
        </CardDescription>
      </CardHeader>
      <CardContent class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="grid gap-2 sm:col-span-2">
          <Label>Tarefa</Label>
          <NativeSelect v-model="taskId" class="w-full max-w-full">
            <NativeSelectOption
              v-for="t in tasks.tasks"
              :key="t.id"
              :value="t.id"
            >
              {{ t.title }}
            </NativeSelectOption>
          </NativeSelect>
        </div>
        <div class="grid gap-2">
          <Label for="d">Data</Label>
          <Input id="d" v-model="date" class="min-h-11 sm:min-h-9" type="date" />
        </div>
        <div class="grid gap-2">
          <Label for="h">Horas</Label>
          <Input
            id="h"
            v-model.number="hours"
            class="min-h-11 sm:min-h-9"
            min="0"
            step="0.25"
            type="number"
          />
        </div>
        <div class="grid gap-2 sm:col-span-2 lg:col-span-4">
          <Label for="n">Observação</Label>
          <Textarea id="n" v-model="note" rows="2" />
        </div>
        <div class="sm:col-span-2 lg:col-span-4">
          <Button type="button" class="min-h-11 w-full sm:min-h-9 sm:w-auto" @click="addEntry">
            Registrar
          </Button>
        </div>
      </CardContent>
    </Card>

    <div class="-mx-1 overflow-x-auto rounded-xl border sm:mx-0">
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
          <TableRow v-for="e in time.entries" :key="e.id">
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
