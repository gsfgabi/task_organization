<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { TASK_TAG_PRESETS } from '@/lib/task-tags'
import { useOrgStore } from '@/stores/org'
import type { ReportFiltersModel } from '@/types/report-filters'
import { REPORT_TYPE_OPTIONS } from '@/types/report-filters'
import { ChevronDown } from 'lucide-vue-next'
import { computed, ref, useId, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    filterState: ReportFiltersModel
    layout?: 'grid' | 'stack'
  }>(),
  { layout: 'grid' },
)

const org = useOrgStore()
const formUid = useId()
const popKindOpen = ref(false)
const popSectorOpen = ref(false)

const filterTriggerClass =
  'min-h-12 w-full justify-between gap-3 rounded-md shadow-sm transition-[border-color,box-shadow,transform] hover:border-primary/35 hover:shadow-md active:scale-[0.99] sm:min-h-11 lg:min-h-10'

const selectedTypeTitle = computed(
  () => REPORT_TYPE_OPTIONS.find((r) => r.id === props.filterState.reportKind)?.title ?? '',
)
const periodSummary = computed(() => {
  const a = props.filterState.start
  const b = props.filterState.end
  const fmt = (iso: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
    if (!m) return iso
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString('pt-BR')
  }
  return `${fmt(a)} → ${fmt(b)}`
})
const tagsSummary = computed(() => {
  if (!props.filterState.reportTagFilters.length) return 'Todas as etiquetas'
  const labels = props.filterState.reportTagFilters.map((id) => {
    const p = TASK_TAG_PRESETS.find((x) => x.id === id)
    return p?.label ?? id
  })
  if (labels.length <= 2) return labels.join(' · ')
  return `${labels.length} etiquetas`
})
const sectorSummary = computed(() =>
  props.filterState.sectorFilter === 'all'
    ? 'Todos os setores'
    : org.sectorName(props.filterState.sectorFilter),
)
const personUsersSummary = computed(() => {
  if (!props.filterState.reportPersonUserIds.length) return 'Todos os colaboradores'
  if (props.filterState.reportPersonUserIds.length === 1)
    return org.userName(props.filterState.reportPersonUserIds[0]!)
  return `${props.filterState.reportPersonUserIds.length} selecionados`
})
const directoratesReportSummary = computed(() => {
  if (!props.filterState.reportDirectorateIds.length) return 'Todas as diretorias'
  if (props.filterState.reportDirectorateIds.length === 1)
    return org.directorateName(props.filterState.reportDirectorateIds[0]!)
  return `${props.filterState.reportDirectorateIds.length} selecionadas`
})

const visiblePersonReportUsers = computed(() =>
  org.users.filter((u) => {
    if (!u.active) return false
    if (props.filterState.sectorFilter === 'all') return true
    return u.sectorId === props.filterState.sectorFilter
  }),
)

watch(
  () => props.filterState.reportKind,
  (k) => {
    if (k !== 'person') props.filterState.reportPersonUserIds = []
    if (k !== 'directorate') props.filterState.reportDirectorateIds = []
  },
)

watch(
  () => props.filterState.sectorFilter,
  () => {
    const allow = new Set(visiblePersonReportUsers.value.map((u) => u.id))
    props.filterState.reportPersonUserIds = props.filterState.reportPersonUserIds.filter((id) =>
      allow.has(id),
    )
  },
)

function pickType(id: ReportFiltersModel['reportKind']) {
  props.filterState.reportKind = id
  popKindOpen.value = false
}

function setSectorFilter(id: string) {
  props.filterState.sectorFilter = id
  popSectorOpen.value = false
}

function toggleReportTag(id: string) {
  const i = props.filterState.reportTagFilters.indexOf(id)
  if (i === -1) props.filterState.reportTagFilters.push(id)
  else props.filterState.reportTagFilters.splice(i, 1)
}

function toggleReportPersonUser(id: string) {
  const i = props.filterState.reportPersonUserIds.indexOf(id)
  if (i === -1) props.filterState.reportPersonUserIds.push(id)
  else props.filterState.reportPersonUserIds.splice(i, 1)
}

function clearReportPersonUsers() {
  props.filterState.reportPersonUserIds = []
}

function selectAllVisiblePersonUsers() {
  props.filterState.reportPersonUserIds = visiblePersonReportUsers.value.map((u) => u.id)
}

function toggleReportDirectorate(id: string) {
  const i = props.filterState.reportDirectorateIds.indexOf(id)
  if (i === -1) props.filterState.reportDirectorateIds.push(id)
  else props.filterState.reportDirectorateIds.splice(i, 1)
}

function clearReportDirectorates() {
  props.filterState.reportDirectorateIds = []
}

const gridClass = computed(() =>
  props.layout === 'stack'
    ? 'grid grid-cols-1 gap-3'
    : 'grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4',
)
</script>

<template>
  <div :class="gridClass">
    <Popover v-model:open="popKindOpen">
      <PopoverTrigger as-child>
        <Button type="button" variant="outline" :class="cn(filterTriggerClass, 'border-border/80')">
          <span class="flex min-w-0 flex-col items-start text-left">
            <span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
              Tipo
            </span>
            <span class="truncate text-sm font-medium">{{ selectedTypeTitle }}</span>
          </span>
          <ChevronDown class="text-muted-foreground size-4 shrink-0 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        class="w-[min(20rem,calc(100vw-2rem))] gap-3 rounded-md border border-border/60 p-3 shadow-lg"
      >
        <p class="text-muted-foreground text-xs font-medium">Tipo de relatório</p>
        <div class="grid max-h-[min(24rem,70vh)] gap-2 overflow-y-auto pr-0.5">
          <button
            v-for="opt in REPORT_TYPE_OPTIONS"
            :key="opt.id"
            type="button"
            :class="
              cn(
                'border-input bg-card focus-visible:ring-ring/40 flex min-h-[3.75rem] flex-col items-start justify-center rounded-md border px-3 py-2.5 text-left transition-all focus-visible:ring-2 focus-visible:outline-none',
                filterState.reportKind === opt.id
                  ? 'ring-primary border-primary ring-2 shadow-sm'
                  : 'hover:border-primary/50 hover:bg-muted/40',
              )
            "
            @click="pickType(opt.id)"
          >
            <span class="text-sm font-medium leading-tight">{{ opt.title }}</span>
            <span class="text-muted-foreground mt-0.5 text-[11px]">{{ opt.hint }}</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>

    <Popover>
      <PopoverTrigger as-child>
        <Button type="button" variant="outline" :class="cn(filterTriggerClass, 'border-border/80')">
          <span class="flex min-w-0 flex-col items-start text-left">
            <span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
              Período
            </span>
            <span class="truncate text-xs font-medium tabular-nums sm:text-sm">
              {{ periodSummary }}
            </span>
          </span>
          <ChevronDown class="text-muted-foreground size-4 shrink-0 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        class="w-[min(20rem,calc(100vw-2rem))] gap-3 rounded-md border border-border/60 p-3 shadow-lg"
      >
        <p class="text-muted-foreground text-xs font-medium">Datas</p>
        <div class="grid gap-3">
          <div class="grid gap-1.5">
            <Label :for="`rep-start-${formUid}`" class="text-xs">Início</Label>
            <Input :id="`rep-start-${formUid}`" v-model="filterState.start" class="min-h-11 sm:min-h-10" type="date" />
          </div>
          <div class="grid gap-1.5">
            <Label :for="`rep-end-${formUid}`" class="text-xs">Fim</Label>
            <Input :id="`rep-end-${formUid}`" v-model="filterState.end" class="min-h-11 sm:min-h-10" type="date" />
          </div>
        </div>
      </PopoverContent>
    </Popover>

    <Popover>
      <PopoverTrigger as-child>
        <Button type="button" variant="outline" :class="cn(filterTriggerClass, 'border-border/80')">
          <span class="flex min-w-0 flex-col items-start text-left">
            <span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
              Etiquetas
            </span>
            <span class="line-clamp-2 text-sm font-medium leading-snug">{{ tagsSummary }}</span>
          </span>
          <ChevronDown class="text-muted-foreground size-4 shrink-0 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        class="w-[min(22rem,calc(100vw-2rem))] gap-3 rounded-md border border-border/60 p-3 shadow-lg"
      >
        <div class="flex items-start justify-between gap-2">
          <p class="text-muted-foreground text-xs font-medium">Etiquetas da tarefa</p>
          <Button
            v-if="filterState.reportTagFilters.length"
            type="button"
            variant="ghost"
            size="sm"
            class="text-muted-foreground -my-1 h-8 shrink-0 px-2 text-xs"
            @click="filterState.reportTagFilters = []"
          >
            Limpar
          </Button>
        </div>
        <div class="grid max-h-[min(22rem,65vh)] grid-cols-2 gap-2 overflow-y-auto pr-0.5">
          <button
            v-for="p in TASK_TAG_PRESETS"
            :key="p.id"
            type="button"
            :class="
              cn(
                'border-input bg-card focus-visible:ring-ring/40 flex min-h-[3rem] items-center rounded-md border px-2 py-2 text-left text-xs leading-snug transition-colors focus-visible:ring-2 focus-visible:outline-none',
                filterState.reportTagFilters.includes(p.id)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'hover:bg-muted/50',
              )
            "
            :aria-pressed="filterState.reportTagFilters.includes(p.id)"
            @click="toggleReportTag(p.id)"
          >
            <span class="line-clamp-3">{{ p.label }}</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>

    <Popover v-if="filterState.reportKind === 'person'" v-model:open="popSectorOpen">
      <PopoverTrigger as-child>
        <Button type="button" variant="outline" :class="cn(filterTriggerClass, 'border-border/80')">
          <span class="flex min-w-0 flex-col items-start text-left">
            <span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
              Setor (pessoa)
            </span>
            <span class="truncate text-sm font-medium">{{ sectorSummary }}</span>
          </span>
          <ChevronDown class="text-muted-foreground size-4 shrink-0 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        class="w-[min(20rem,calc(100vw-2rem))] gap-3 rounded-md border border-border/60 p-3 shadow-lg"
      >
        <p class="text-muted-foreground text-xs font-medium">Colaboradores por setor</p>
        <div class="flex max-h-[min(20rem,60vh)] flex-wrap gap-2 overflow-y-auto pr-0.5">
          <button
            type="button"
            :class="
              cn(
                'border-input rounded-md border px-3 py-2.5 text-xs font-medium transition-colors',
                filterState.sectorFilter === 'all'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card hover:bg-muted/50',
              )
            "
            @click="setSectorFilter('all')"
          >
            Todos
          </button>
          <button
            v-for="s in org.sectors"
            :key="s.id"
            type="button"
            :class="
              cn(
                'border-input rounded-md border px-3 py-2.5 text-xs font-medium transition-colors',
                filterState.sectorFilter === s.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card hover:bg-muted/50',
              )
            "
            @click="setSectorFilter(s.id)"
          >
            {{ s.name }}
          </button>
        </div>
      </PopoverContent>
    </Popover>

    <Popover v-if="filterState.reportKind === 'person'">
      <PopoverTrigger as-child>
        <Button type="button" variant="outline" :class="cn(filterTriggerClass, 'border-border/80')">
          <span class="flex min-w-0 flex-col items-start text-left">
            <span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
              Colaboradores
            </span>
            <span class="line-clamp-2 text-sm font-medium leading-snug">{{ personUsersSummary }}</span>
          </span>
          <ChevronDown class="text-muted-foreground size-4 shrink-0 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        class="w-[min(22rem,calc(100vw-2rem))] gap-3 rounded-md border border-border/60 p-3 shadow-lg"
      >
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p class="text-muted-foreground text-xs font-medium">Quem incluir</p>
            <p class="text-muted-foreground mt-1 text-[11px] leading-relaxed">
              Sem ninguém marcado = todos no setor acima. Use os botões para refinar.
            </p>
          </div>
          <div class="flex shrink-0 flex-wrap justify-end gap-1.5">
            <Button type="button" variant="outline" size="sm" class="h-8 px-2 text-xs" @click="clearReportPersonUsers">
              Todos
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              class="h-8 px-2 text-xs"
              @click="selectAllVisiblePersonUsers"
            >
              Neste recorte
            </Button>
          </div>
        </div>
        <div
          v-if="!visiblePersonReportUsers.length"
          class="text-muted-foreground py-4 text-center text-xs"
        >
          Nenhum colaborador ativo neste setor.
        </div>
        <div
          v-else
          class="grid max-h-[min(22rem,60vh)] grid-cols-1 gap-2 overflow-y-auto pr-0.5 sm:grid-cols-2"
        >
          <button
            v-for="u in visiblePersonReportUsers"
            :key="u.id"
            type="button"
            :class="
              cn(
                'border-input bg-card focus-visible:ring-ring/40 flex min-h-[2.75rem] items-center rounded-md border px-2.5 py-2 text-left text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none',
                filterState.reportPersonUserIds.length === 0
                  ? 'hover:bg-muted/50'
                  : filterState.reportPersonUserIds.includes(u.id)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:bg-muted/50',
              )
            "
            :aria-pressed="
              filterState.reportPersonUserIds.length > 0 && filterState.reportPersonUserIds.includes(u.id)
            "
            @click="toggleReportPersonUser(u.id)"
          >
            <span class="line-clamp-2 font-medium">{{ u.name }}</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>

    <Popover v-if="filterState.reportKind === 'directorate'">
      <PopoverTrigger as-child>
        <Button type="button" variant="outline" :class="cn(filterTriggerClass, 'border-border/80')">
          <span class="flex min-w-0 flex-col items-start text-left">
            <span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
              Diretorias
            </span>
            <span class="line-clamp-2 text-sm font-medium leading-snug">{{ directoratesReportSummary }}</span>
          </span>
          <ChevronDown class="text-muted-foreground size-4 shrink-0 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        class="w-[min(22rem,calc(100vw-2rem))] gap-3 rounded-md border border-border/60 p-3 shadow-lg"
      >
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p class="text-muted-foreground text-xs font-medium">Quais diretorias</p>
            <p class="text-muted-foreground mt-1 text-[11px] leading-relaxed">
              Sem seleção = todas. Toque para incluir ou excluir da lista do relatório.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" class="h-8 shrink-0 px-2 text-xs" @click="clearReportDirectorates">
            Todas
          </Button>
        </div>
        <div class="grid max-h-[min(22rem,60vh)] grid-cols-1 gap-2 overflow-y-auto pr-0.5 sm:grid-cols-2">
          <button
            v-for="d in org.directorates"
            :key="d.id"
            type="button"
            :class="
              cn(
                'border-input bg-card focus-visible:ring-ring/40 flex min-h-[2.75rem] flex-col items-start justify-center rounded-md border px-2.5 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none',
                filterState.reportDirectorateIds.length === 0
                  ? 'hover:bg-muted/50'
                  : filterState.reportDirectorateIds.includes(d.id)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:bg-muted/50',
              )
            "
            :aria-pressed="
              filterState.reportDirectorateIds.length > 0 && filterState.reportDirectorateIds.includes(d.id)
            "
            @click="toggleReportDirectorate(d.id)"
          >
            <span class="text-xs font-medium leading-tight">{{ d.name }}</span>
            <span
              :class="
                filterState.reportDirectorateIds.length > 0 && filterState.reportDirectorateIds.includes(d.id)
                  ? 'text-primary-foreground/80'
                  : 'text-muted-foreground'
              "
              class="font-mono text-[10px]"
            >
              {{ d.code }}
            </span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  </div>
</template>
