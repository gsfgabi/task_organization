<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePermissions } from '@/composables/usePermissions'
import { downloadCsv } from '@/lib/csv'
import { useOrgStore } from '@/stores/org'
import { useTasksStore } from '@/stores/tasks'
import { useTimeEntriesStore } from '@/stores/time-entries'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'

const org = useOrgStore()
const tasks = useTasksStore()
const time = useTimeEntriesStore()
const { can } = usePermissions()

const start = ref(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
const end = ref(new Date().toISOString().slice(0, 10))
const sectorFilter = ref<string>('all')

const rows = computed(() => {
  const uidHours = new Map<string, number>()
  const uidDone = new Map<string, number>()

  for (const e of time.entries) {
    if (e.date < start.value || e.date > end.value) continue
    uidHours.set(e.userId, (uidHours.get(e.userId) ?? 0) + e.hours)
  }

  const endDay = new Date(end.value + 'T23:59:59.999Z')
  const startDay = new Date(start.value + 'T00:00:00.000Z')
  for (const t of tasks.tasks) {
    if (t.status !== 'done') continue
    if (sectorFilter.value !== 'all' && t.sectorId !== sectorFilter.value) continue
    const d = new Date(t.updatedAt)
    if (d < startDay || d > endDay) continue
    uidDone.set(t.assigneeId, (uidDone.get(t.assigneeId) ?? 0) + 1)
  }

  const users = org.users.filter((u) => {
    if (sectorFilter.value === 'all') return true
    return u.sectorId === sectorFilter.value
  })

  return users.map((u) => ({
    userId: u.id,
    userName: u.name,
    sectorName: org.sectorName(u.sectorId),
    hours: Math.round((uidHours.get(u.id) ?? 0) * 100) / 100,
    tasksCompleted: uidDone.get(u.id) ?? 0,
  }))
})

function exportReport() {
  if (!can('reports.export')) {
    toast.error('Sem permissão para exportar.')
    return
  }
  downloadCsv(
    `relatorio-tempo-${start.value}_${end.value}.csv`,
    ['Usuário', 'Setor', 'Horas no período', 'Tarefas concluídas (aprox.)'],
    rows.value.map((r) => [r.userName, r.sectorName, r.hours, r.tasksCompleted]),
  )
  toast.success('CSV gerado.')
}
</script>

<template>
  <div class="space-y-5 sm:space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <p class="text-muted-foreground text-sm leading-relaxed sm:max-w-xl sm:text-base">
        Agregações por pessoa e setor. Ajuste o período e exporte para planilha (CSV com separador compatível com Excel).
      </p>
      <Button
        v-if="can('reports.export')"
        type="button"
        variant="secondary"
        class="min-h-11 w-full shrink-0 sm:min-h-9 sm:w-auto"
        @click="exportReport"
      >
        Exportar CSV
      </Button>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div class="grid gap-2">
        <Label for="s">Início</Label>
        <Input id="s" v-model="start" class="min-h-11 sm:min-h-9" type="date" />
      </div>
      <div class="grid gap-2">
        <Label for="e">Fim</Label>
        <Input id="e" v-model="end" class="min-h-11 sm:min-h-9" type="date" />
      </div>
      <div class="grid gap-2 sm:col-span-2 lg:col-span-1">
        <Label>Setor</Label>
        <NativeSelect v-model="sectorFilter" class="w-full max-w-full">
          <NativeSelectOption value="all">Todos</NativeSelectOption>
          <NativeSelectOption
            v-for="s in org.sectors"
            :key="s.id"
            :value="s.id"
          >
            {{ s.name }}
          </NativeSelectOption>
        </NativeSelect>
      </div>
    </div>

    <div class="-mx-1 overflow-x-auto rounded-xl border sm:mx-0">
      <Table class="min-w-[360px]">
        <TableHeader>
          <TableRow>
            <TableHead>Usuário</TableHead>
            <TableHead>Setor</TableHead>
            <TableHead class="text-right">Horas (período)</TableHead>
            <TableHead class="text-right">Concluídas (aprox.)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="r in rows" :key="r.userId">
            <TableCell>{{ r.userName }}</TableCell>
            <TableCell>{{ r.sectorName }}</TableCell>
            <TableCell class="text-right tabular-nums">
              {{ r.hours }}
            </TableCell>
            <TableCell class="text-right tabular-nums">
              {{ r.tasksCompleted }}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>
