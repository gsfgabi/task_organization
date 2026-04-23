<script setup lang="ts">
import ReportFilterGrid from '@/components/reports/ReportFilterGrid.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePermissions } from '@/composables/usePermissions'
import { useTaskScope } from '@/composables/useTaskScope'
import { downloadCsv } from '@/lib/csv'
import { monthsInRange, semestersInRange } from '@/lib/report-periods'
import { labelForPresetTag } from '@/lib/task-tags'
import { useAuditStore } from '@/stores/audit'
import { useOrgStore } from '@/stores/org'
import { usePreferencesStore } from '@/stores/preferences'
import { useTasksStore } from '@/stores/tasks'
import { useTimeEntriesStore } from '@/stores/time-entries'
import type { ReportFiltersModel, ReportFiltersSnapshot } from '@/types/report-filters'
import { REPORT_TYPE_OPTIONS } from '@/types/report-filters'
import type { TaskItem } from '@/types'
import { useMediaQuery } from '@vueuse/core'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

const audit = useAuditStore()
const org = useOrgStore()
const tasks = useTasksStore()
const time = useTimeEntriesStore()
const prefs = usePreferencesStore()
const { can } = usePermissions()
const { visibleTasks, isTaskVisible, visibleUsers, visibleSectors, visibleDirectorates } = useTaskScope()

const scopedTasks = computed(() => visibleTasks(tasks.tasks))

const isMobile = useMediaQuery('(max-width: 767px)')
const mobileFiltersOpen = ref(false)
const presetName = ref('')

const rf = reactive<ReportFiltersModel>({
  reportKind: 'person',
  start: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
  end: new Date().toISOString().slice(0, 10),
  sectorFilter: 'all',
  reportPersonUserIds: [],
  reportDirectorateIds: [],
  reportTagFilters: [],
})

const showResults = ref(false)

function formatDateShort(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
  if (!m) return iso
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('pt-BR')
}

const selectedTypeTitle = computed(
  () => REPORT_TYPE_OPTIONS.find((r) => r.id === rf.reportKind)?.title ?? '',
)
const periodSummary = computed(
  () => `${formatDateShort(rf.start)} → ${formatDateShort(rf.end)}`,
)

function reportSnapshot(): ReportFiltersSnapshot {
  return {
    reportKind: rf.reportKind,
    start: rf.start,
    end: rf.end,
    sectorFilter: rf.sectorFilter,
    reportPersonUserIds: [...rf.reportPersonUserIds],
    reportDirectorateIds: [...rf.reportDirectorateIds],
    reportTagFilters: [...rf.reportTagFilters],
  }
}

onMounted(() => {
  const last = prefs.reportUi.last
  if (last) {
    Object.assign(rf, {
      reportKind: last.reportKind,
      start: last.start,
      end: last.end,
      sectorFilter: last.sectorFilter,
      reportPersonUserIds: [...last.reportPersonUserIds],
      reportDirectorateIds: [...last.reportDirectorateIds],
      reportTagFilters: [...last.reportTagFilters],
    })
  }
})

watch(
  () =>
    [
      rf.reportKind,
      rf.start,
      rf.end,
      rf.sectorFilter,
      [...rf.reportTagFilters].sort().join(','),
      [...rf.reportPersonUserIds].sort().join(','),
      [...rf.reportDirectorateIds].sort().join(','),
    ].join('|'),
  () => {
    showResults.value = false
  },
)

function taskMatchesReportTags(t: TaskItem): boolean {
  if (!rf.reportTagFilters.length) return true
  return t.tags.some((tag) => rf.reportTagFilters.includes(tag))
}

const filterSummaryCsv = computed(() => {
  if (!rf.reportTagFilters.length) return '(todas)'
  return rf.reportTagFilters.map((id) => labelForPresetTag(id)).join('; ')
})

const personUsersCsv = computed(() => {
  if (!rf.reportPersonUserIds.length) return '(todos)'
  return rf.reportPersonUserIds.map((id) => org.userName(id)).join('; ')
})

const directorateFilterCsv = computed(() => {
  if (!rf.reportDirectorateIds.length) return '(todas)'
  return rf.reportDirectorateIds.map((id) => org.directorateName(id)).join('; ')
})

function sumHours(ws: string, we: string, taskPred: (t: TaskItem) => boolean) {
  let sum = 0
  for (const e of time.entries) {
    if (e.date < ws || e.date > we) continue
    const t = tasks.getById(e.taskId)
    if (!t || !isTaskVisible(t) || !taskMatchesReportTags(t)) continue
    if (!taskPred(t)) continue
    sum += e.hours
  }
  return Math.round(sum * 100) / 100
}

function countCompleted(ws: string, we: string, taskPred: (t: TaskItem) => boolean) {
  const sd = new Date(`${ws}T00:00:00.000Z`)
  const ed = new Date(`${we}T23:59:59.999Z`)
  let n = 0
  for (const t of scopedTasks.value) {
    if (t.status !== 'done') continue
    if (!taskMatchesReportTags(t)) continue
    if (!taskPred(t)) continue
    const d = new Date(t.updatedAt)
    if (d < sd || d > ed) continue
    n++
  }
  return n
}

const personRows = computed(() => {
  const uidHours = new Map<string, number>()
  const uidDone = new Map<string, number>()

  for (const e of time.entries) {
    if (e.date < rf.start || e.date > rf.end) continue
    const task = tasks.getById(e.taskId)
    if (!task || !isTaskVisible(task) || !taskMatchesReportTags(task)) continue
    uidHours.set(e.userId, (uidHours.get(e.userId) ?? 0) + e.hours)
  }

  const endDay = new Date(`${rf.end}T23:59:59.999Z`)
  const startDay = new Date(`${rf.start}T00:00:00.000Z`)
  for (const t of scopedTasks.value) {
    if (t.status !== 'done') continue
    if (!taskMatchesReportTags(t)) continue
    if (rf.sectorFilter !== 'all' && t.sectorId !== rf.sectorFilter) continue
    const d = new Date(t.updatedAt)
    if (d < startDay || d > endDay) continue
    uidDone.set(t.assigneeId, (uidDone.get(t.assigneeId) ?? 0) + 1)
  }

  let users = visibleUsers(
    org.users.filter((u) => {
      if (!u.active) return false
      if (rf.sectorFilter === 'all') return true
      return u.sectorId === rf.sectorFilter
    }),
  )

  if (rf.reportPersonUserIds.length > 0) {
    const pick = new Set(rf.reportPersonUserIds)
    users = users.filter((u) => pick.has(u.id))
  }

  return users.map((u) => ({
    userId: u.id,
    userName: u.name,
    sectorName: org.sectorName(u.sectorId),
    directorateName: org.directorateName(u.directorateId),
    hours: Math.round((uidHours.get(u.id) ?? 0) * 100) / 100,
    tasksCompleted: uidDone.get(u.id) ?? 0,
  }))
})

const monthRows = computed(() =>
  monthsInRange(rf.start, rf.end).map((m) => ({
    ...m,
    hours: sumHours(m.start, m.end, () => true),
    completed: countCompleted(m.start, m.end, () => true),
  })),
)

const semesterRows = computed(() =>
  semestersInRange(rf.start, rf.end).map((s) => ({
    ...s,
    hours: sumHours(s.start, s.end, () => true),
    completed: countCompleted(s.start, s.end, () => true),
  })),
)

const sectorRows = computed(() =>
  visibleSectors.value.map((s) => ({
    sectorId: s.id,
    sectorName: s.name,
    directorateName: org.directorateName(s.directorateId),
    hours: sumHours(rf.start, rf.end, (t) => t.sectorId === s.id),
    completed: countCompleted(rf.start, rf.end, (t) => t.sectorId === s.id),
  })),
)

const directorateRows = computed(() => {
  let rows = visibleDirectorates.value.map((d) => ({
    directorateId: d.id,
    directorateName: d.name,
    code: d.code,
    hours: sumHours(rf.start, rf.end, (t) => t.directorateId === d.id),
    completed: countCompleted(rf.start, rf.end, (t) => t.directorateId === d.id),
  }))
  if (rf.reportDirectorateIds.length > 0) {
    const pick = new Set(rf.reportDirectorateIds)
    rows = rows.filter((r) => pick.has(r.directorateId))
  }
  return rows
})

const resultKpis = computed(() => {
  if (!showResults.value) return null as null | { hours: number; completed: number; rows: number; label: string }
  switch (rf.reportKind) {
    case 'person': {
      const rows = personRows.value
      const h = Math.round(rows.reduce((a, r) => a + r.hours, 0) * 100) / 100
      const c = rows.reduce((a, r) => a + r.tasksCompleted, 0)
      return { label: 'Linhas (pessoas)', hours: h, completed: c, rows: rows.length }
    }
    case 'month': {
      const rows = monthRows.value
      const h = Math.round(rows.reduce((a, r) => a + r.hours, 0) * 100) / 100
      const c = rows.reduce((a, r) => a + r.completed, 0)
      return { label: 'Meses no recorte', hours: h, completed: c, rows: rows.length }
    }
    case 'semester': {
      const rows = semesterRows.value
      const h = Math.round(rows.reduce((a, r) => a + r.hours, 0) * 100) / 100
      const c = rows.reduce((a, r) => a + r.completed, 0)
      return { label: 'Semestres', hours: h, completed: c, rows: rows.length }
    }
    case 'sector': {
      const rows = sectorRows.value
      const h = Math.round(rows.reduce((a, r) => a + r.hours, 0) * 100) / 100
      const c = rows.reduce((a, r) => a + r.completed, 0)
      return { label: 'Setores', hours: h, completed: c, rows: rows.length }
    }
    case 'directorate': {
      const rows = directorateRows.value
      const h = Math.round(rows.reduce((a, r) => a + r.hours, 0) * 100) / 100
      const c = rows.reduce((a, r) => a + r.completed, 0)
      return { label: 'Diretorias', hours: h, completed: c, rows: rows.length }
    }
    default:
      return null
  }
})

function exportFileBase() {
  const tagPart = rf.reportTagFilters.length ? `_tags${rf.reportTagFilters.length}` : ''
  return `relatorio-${rf.reportKind}-${rf.start}_${rf.end}${tagPart}`
}

function consultar() {
  showResults.value = true
  prefs.saveReportLast(reportSnapshot())
}

const presetPicker = ref('')

function applyPickedPreset() {
  const id = presetPicker.value
  if (!id) return
  const p = prefs.reportUi.presets.find((x) => x.id === id)
  if (!p) return
  Object.assign(rf, {
    reportKind: p.snapshot.reportKind,
    start: p.snapshot.start,
    end: p.snapshot.end,
    sectorFilter: p.snapshot.sectorFilter,
    reportPersonUserIds: [...p.snapshot.reportPersonUserIds],
    reportDirectorateIds: [...p.snapshot.reportDirectorateIds],
    reportTagFilters: [...p.snapshot.reportTagFilters],
  })
  presetPicker.value = ''
  showResults.value = false
  toast('Preset aplicado. Toque em Consultar para atualizar os números.')
}

function saveCurrentPreset() {
  const name = presetName.value.trim() || 'O meu recorte'
  prefs.addReportPreset(name, reportSnapshot())
  presetName.value = ''
  toast.success('Preset guardado neste navegador.')
}

function consultarAndCloseMobile() {
  consultar()
  mobileFiltersOpen.value = false
}

function exportReport() {
  if (!can('reports.export')) {
    toast.error('Sem permissão para exportar.')
    return
  }
  const tag = filterSummaryCsv.value
  const sf = rf.sectorFilter === 'all' ? '(todos)' : org.sectorName(rf.sectorFilter)
  const base = exportFileBase()

  switch (rf.reportKind) {
    case 'person':
      downloadCsv(
        `${base}.csv`,
        [
          'Usuário',
          'Setor (colaborador)',
          'Diretoria',
          'Horas no período',
          'Tarefas concluídas (aprox.)',
          'Filtro etiquetas',
          'Filtro setor (pessoa)',
          'Filtro colaboradores',
        ],
        personRows.value.map((r) => [
          r.userName,
          r.sectorName,
          r.directorateName,
          r.hours,
          r.tasksCompleted,
          tag,
          sf,
          personUsersCsv.value,
        ]),
      )
      break
    case 'month':
      downloadCsv(
        `${base}.csv`,
        ['Mês', 'Início (clip)', 'Fim (clip)', 'Horas', 'Concluídas (aprox.)', 'Filtro etiquetas'],
        monthRows.value.map((r) => [r.label, r.start, r.end, r.hours, r.completed, tag]),
      )
      break
    case 'semester':
      downloadCsv(
        `${base}.csv`,
        ['Semestre', 'Início (clip)', 'Fim (clip)', 'Horas', 'Concluídas (aprox.)', 'Filtro etiquetas'],
        semesterRows.value.map((r) => [r.label, r.start, r.end, r.hours, r.completed, tag]),
      )
      break
    case 'sector':
      downloadCsv(
        `${base}.csv`,
        ['Setor', 'Diretoria', 'Horas no período', 'Concluídas (aprox.)', 'Filtro etiquetas'],
        sectorRows.value.map((r) => [r.sectorName, r.directorateName, r.hours, r.completed, tag]),
      )
      break
    case 'directorate':
      downloadCsv(
        `${base}.csv`,
        [
          'Diretoria',
          'Código',
          'Horas no período',
          'Concluídas (aprox.)',
          'Filtro etiquetas',
          'Filtro diretorias',
        ],
        directorateRows.value.map((r) => [
          r.directorateName,
          r.code,
          r.hours,
          r.completed,
          tag,
          directorateFilterCsv.value,
        ]),
      )
      break
  }
  audit.add({
    action: 'reports.export',
    message: `Exportação CSV: relatório «${rf.reportKind}» (${rf.start} — ${rf.end})`,
    level: 'success',
    detail: { kind: rf.reportKind },
  })
  toast.success('CSV gerado.')
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-10 pb-1">
    <header class="space-y-2">
      <p class="text-primary text-[11px] font-semibold tracking-wider uppercase sm:text-xs">
        Análise
      </p>
      <h1 class="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
        Relatórios
      </h1>
      <p class="text-muted-foreground max-w-xl text-sm leading-relaxed">
        Defina o recorte nos filtros abaixo e toque em <strong class="text-foreground">Consultar</strong>
        para ver os números. Pode ajustar e voltar a consultar quando quiser.
      </p>
    </header>

    <article
      class="space-y-5 rounded-2xl border border-border/80 bg-gradient-to-b from-muted/50 to-card p-5 shadow-sm ring-1 ring-black/[0.02] sm:p-6 dark:from-muted/10 dark:to-card dark:ring-white/[0.04]"
    >
      <div class="space-y-1">
        <h2 class="text-foreground text-base font-semibold tracking-tight">
          Filtros
        </h2>
        <p class="text-muted-foreground text-xs leading-relaxed sm:text-sm">
          Em ecrã pequeno use o painel deslizante; no desktop, os cartões abrem ao lado.
        </p>
      </div>

      <div v-if="isMobile" class="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          class="border-border/80 min-h-12 w-full justify-between text-left shadow-sm"
          @click="mobileFiltersOpen = true"
        >
          <span class="flex min-w-0 flex-col gap-0.5">
            <span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">Ajustar</span>
            <span class="truncate text-sm font-medium">{{ selectedTypeTitle }} · {{ periodSummary }}</span>
          </span>
        </Button>
        <Sheet v-model:open="mobileFiltersOpen">
          <SheetContent side="bottom" class="flex max-h-[min(92dvh,40rem)] flex-col gap-0 rounded-t-xl p-0">
            <SheetHeader class="border-b px-4 py-3 text-left">
              <SheetTitle>Filtros do relatório</SheetTitle>
              <SheetDescription> Ajuste o recorte e confirme com Consultar. </SheetDescription>
            </SheetHeader>
            <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              <ReportFilterGrid :filter-state="rf" layout="stack" />
            </div>
            <SheetFooter
              class="border-border/60 mt-0 flex-row gap-2 border-t bg-muted/20 px-4 py-3 sm:justify-stretch"
            >
              <Button type="button" variant="outline" class="min-h-11 flex-1" @click="mobileFiltersOpen = false">
                Fechar
              </Button>
              <Button type="button" class="min-h-11 flex-1" @click="consultarAndCloseMobile"> Consultar </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      <div v-if="!isMobile" class="hidden md:block">
        <ReportFilterGrid :filter-state="rf" layout="grid" />
      </div>

      <div class="flex flex-col gap-3 rounded-md border border-border/50 bg-muted/20 p-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div class="grid min-w-0 flex-1 gap-1.5 sm:max-w-xs">
          <label class="text-muted-foreground text-xs font-medium" for="preset-pick">Carregar preset</label>
          <NativeSelect id="preset-pick" v-model="presetPicker" class="w-full">
            <NativeSelectOption value="">— Escolher —</NativeSelectOption>
            <NativeSelectOption v-for="p in prefs.reportUi.presets" :key="p.id" :value="p.id">
              {{ p.name }}
            </NativeSelectOption>
          </NativeSelect>
        </div>
        <div class="grid min-w-0 flex-1 gap-1.5 sm:max-w-xs">
          <label class="text-muted-foreground text-xs font-medium" for="preset-name">Guardar recorte atual</label>
          <Input
            id="preset-name"
            v-model="presetName"
            class="min-h-11"
            placeholder="Nome do preset (opcional)"
            @keydown.enter.prevent="saveCurrentPreset"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          class="min-h-11 w-full sm:w-auto"
          :disabled="!presetPicker"
          @click="applyPickedPreset"
        >
          Aplicar preset
        </Button>
        <Button type="button" variant="secondary" class="min-h-11 w-full sm:w-auto" @click="saveCurrentPreset">
          Guardar preset
        </Button>
        <div v-if="prefs.reportUi.presets.length" class="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
          <Button
            v-for="p in prefs.reportUi.presets"
            :key="p.id + '-rm'"
            type="button"
            variant="ghost"
            size="sm"
            class="text-muted-foreground h-8 px-2 text-xs"
            :title="`Remover «${p.name}»`"
            @click="prefs.removeReportPreset(p.id)"
          >
            ✕ {{ p.name }}
          </Button>
        </div>
      </div>

      <Separator class="bg-border/60" />

      <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Button
          type="button"
          size="lg"
          class="min-h-12 w-full shadow-sm sm:min-h-11 sm:w-auto sm:min-w-[10.5rem]"
          @click="consultar"
        >
          Consultar
        </Button>
        <Button
          v-if="can('reports.export')"
          type="button"
          variant="outline"
          size="lg"
          class="min-h-12 w-full border-dashed sm:min-h-11 sm:w-auto"
          @click="exportReport"
        >
          Exportar CSV
        </Button>
      </div>
    </article>

    <section v-if="showResults" class="space-y-4 border-t border-border/60 pt-8">
      <div class="space-y-1">
        <h2 class="text-foreground text-base font-semibold tracking-tight">
          Resultado
        </h2>
        <p class="text-muted-foreground text-xs sm:text-sm">
          Valores conforme o recorte atual dos filtros.
        </p>
      </div>

      <div
        v-if="resultKpis"
        class="grid grid-cols-2 gap-3 rounded-md border border-border/60 bg-card p-3 sm:grid-cols-4"
      >
        <div>
          <p class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">Horas</p>
          <p class="text-lg font-semibold tabular-nums">{{ resultKpis.hours }}</p>
        </div>
        <div>
          <p class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">Concluídas</p>
          <p class="text-lg font-semibold tabular-nums">{{ resultKpis.completed }}</p>
        </div>
        <div class="col-span-2 sm:col-span-1">
          <p class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">Linhas</p>
          <p class="text-lg font-semibold tabular-nums">{{ resultKpis.rows }}</p>
        </div>
        <div class="col-span-2 sm:col-span-1">
          <p class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">Recorte</p>
          <p class="text-foreground text-xs font-medium leading-snug">{{ resultKpis.label }}</p>
        </div>
      </div>

      <template v-if="rf.reportKind === 'person'">
        <p v-if="!personRows.length" class="text-muted-foreground py-6 text-center text-sm">
          Nenhum colaborador neste recorte.
        </p>
        <div v-else class="overflow-x-auto rounded-md border">
          <Table class="min-w-[32rem] text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Diretoria</TableHead>
                <TableHead class="text-right">Horas</TableHead>
                <TableHead class="text-right">Concluídas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="r in personRows" :key="r.userId">
                <TableCell class="font-medium">{{ r.userName }}</TableCell>
                <TableCell>{{ r.sectorName }}</TableCell>
                <TableCell>{{ r.directorateName }}</TableCell>
                <TableCell class="text-right tabular-nums">{{ r.hours }}</TableCell>
                <TableCell class="text-right tabular-nums">{{ r.tasksCompleted }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </template>

      <template v-else-if="rf.reportKind === 'month'">
        <p v-if="!monthRows.length" class="text-muted-foreground py-6 text-center text-sm">
          Ajuste as datas para incluir pelo menos um mês.
        </p>
        <div v-else class="overflow-x-auto rounded-md border">
          <Table class="min-w-[28rem] text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead>Intervalo</TableHead>
                <TableHead class="text-right">Horas</TableHead>
                <TableHead class="text-right">Concluídas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="r in monthRows" :key="r.key">
                <TableCell class="font-medium">{{ r.label }}</TableCell>
                <TableCell class="text-muted-foreground tabular-nums">{{ r.start }} — {{ r.end }}</TableCell>
                <TableCell class="text-right tabular-nums">{{ r.hours }}</TableCell>
                <TableCell class="text-right tabular-nums">{{ r.completed }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </template>

      <template v-else-if="rf.reportKind === 'semester'">
        <p v-if="!semesterRows.length" class="text-muted-foreground py-6 text-center text-sm">
          Nenhum semestre cruza o intervalo.
        </p>
        <div v-else class="overflow-x-auto rounded-md border">
          <Table class="min-w-[28rem] text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Semestre</TableHead>
                <TableHead>Intervalo</TableHead>
                <TableHead class="text-right">Horas</TableHead>
                <TableHead class="text-right">Concluídas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="r in semesterRows" :key="r.key">
                <TableCell class="font-medium">{{ r.label }}</TableCell>
                <TableCell class="text-muted-foreground tabular-nums">{{ r.start }} — {{ r.end }}</TableCell>
                <TableCell class="text-right tabular-nums">{{ r.hours }}</TableCell>
                <TableCell class="text-right tabular-nums">{{ r.completed }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </template>

      <template v-else-if="rf.reportKind === 'sector'">
        <div class="overflow-x-auto rounded-md border">
          <Table class="min-w-[26rem] text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Setor</TableHead>
                <TableHead>Diretoria</TableHead>
                <TableHead class="text-right">Horas</TableHead>
                <TableHead class="text-right">Concluídas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="r in sectorRows" :key="r.sectorId">
                <TableCell class="font-medium">{{ r.sectorName }}</TableCell>
                <TableCell>{{ r.directorateName }}</TableCell>
                <TableCell class="text-right tabular-nums">{{ r.hours }}</TableCell>
                <TableCell class="text-right tabular-nums">{{ r.completed }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </template>

      <template v-else-if="rf.reportKind === 'directorate'">
        <div class="overflow-x-auto rounded-md border">
          <Table class="min-w-[26rem] text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Diretoria</TableHead>
                <TableHead>Código</TableHead>
                <TableHead class="text-right">Horas</TableHead>
                <TableHead class="text-right">Concluídas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="r in directorateRows" :key="r.directorateId">
                <TableCell class="font-medium">{{ r.directorateName }}</TableCell>
                <TableCell class="font-mono text-xs">{{ r.code }}</TableCell>
                <TableCell class="text-right tabular-nums">{{ r.hours }}</TableCell>
                <TableCell class="text-right tabular-nums">{{ r.completed }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </template>
    </section>
  </div>
</template>
