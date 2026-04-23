<script setup lang="ts">
import KanbanBoard from '@/components/tasks/KanbanBoard.vue'
import TaskDetailSheet from '@/components/tasks/TaskDetailSheet.vue'
import TaskStatusBadge from '@/components/tasks/TaskStatusBadge.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePermissions } from '@/composables/usePermissions'
import { useTaskScope } from '@/composables/useTaskScope'
import { cn } from '@/lib/utils'
import { taskDifficultyLabels, taskPriorityLabels } from '@/lib/labels'
import { labelForPresetTag } from '@/lib/task-tags'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import { useTasksStore } from '@/stores/tasks'
import type { TaskItem } from '@/types'
import { Plus, Search } from 'lucide-vue-next'
import { refDebounced } from '@vueuse/core'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

function tagMatchesQuery(tag: string, q: string) {
  if (tag.toLowerCase().includes(q)) return true
  return labelForPresetTag(tag).toLowerCase().includes(q)
}

const org = useOrgStore()
const tasks = useTasksStore()
const auth = useAuthStore()
const { can, canUpdateTask, canDeleteTask } = usePermissions()
const { visibleTasks, isTaskVisible } = useTaskScope()
const route = useRoute()
const router = useRouter()

const q = ref('')
const qDebounced = refDebounced(q, 280)
const taskQuickFilter = ref<'all' | 'mine' | 'overdue' | 'priority' | 'no_due'>('all')
const sheetOpen = ref(false)
const sheetMode = ref<'create' | 'edit'>('create')
const activeId = ref<string | null>(null)
const listPage = ref(1)
const listPageSize = 25

onMounted(() => tasks.load())

const scopedTasks = computed(() => visibleTasks(tasks.tasks))

const searchedTasks = computed(() => {
  const s = qDebounced.value.trim().toLowerCase()
  if (!s) return scopedTasks.value
  return scopedTasks.value.filter(
    (t) =>
      t.title.toLowerCase().includes(s) ||
      t.description.toLowerCase().includes(s) ||
      t.tags.some((x) => tagMatchesQuery(x, s)) ||
      t.checklist.some((c) => c.label.toLowerCase().includes(s)),
  )
})

const displayedTasks = computed(() => {
  const list = searchedTasks.value
  const uid = auth.user?.id
  const today = new Date().toISOString().slice(0, 10)
  switch (taskQuickFilter.value) {
    case 'mine':
      if (!uid) return []
      return list.filter((t) => t.assigneeId === uid)
    case 'overdue':
      return list.filter(
        (t) =>
          t.dueDate &&
          t.dueDate < today &&
          t.status !== 'done' &&
          t.status !== 'cancelled',
      )
    case 'priority':
      return list.filter((t) => t.priority === 'urgent' || t.priority === 'high')
    case 'no_due':
      return list.filter(
        (t) => !t.dueDate && t.status !== 'done' && t.status !== 'cancelled',
      )
    default:
      return list
  }
})

watch([displayedTasks, qDebounced, taskQuickFilter], () => {
  listPage.value = 1
})

const listTotalPages = computed(() =>
  Math.max(1, Math.ceil(displayedTasks.value.length / listPageSize)),
)

const pagedTasks = computed(() => {
  const list = displayedTasks.value
  const start = (listPage.value - 1) * listPageSize
  return list.slice(start, start + listPageSize)
})

function openTaskFromQuery(taskId: string) {
  const row = tasks.getById(taskId)
  if (!row || !isTaskVisible(row)) return
  sheetMode.value = 'edit'
  activeId.value = taskId
  sheetOpen.value = true
  const q = { ...route.query }
  delete q.task
  void router.replace({ query: q })
}

watch(
  [() => route.query.task, () => tasks.tasks.length],
  () => {
    const tid = route.query.task
    if (typeof tid !== 'string' || !tid) return
    const row = tasks.getById(tid)
    if (!row || !isTaskVisible(row)) return
    openTaskFromQuery(tid)
  },
  { immediate: true },
)

function taskChecklistSummary(t: TaskItem) {
  const n = t.checklist.length
  if (!n) return null
  const d = t.checklist.filter((x) => x.done).length
  return `${d}/${n}`
}

function openCreate() {
  sheetMode.value = 'create'
  activeId.value = null
  sheetOpen.value = true
}

function openEdit(t: TaskItem) {
  sheetMode.value = 'edit'
  activeId.value = t.id
  sheetOpen.value = true
}

function onDelete(t: TaskItem) {
  if (!canDeleteTask(t)) {
    toast.error('Sem permissão para excluir esta tarefa.')
    return
  }
  if (!confirm(`Excluir "${t.title}"?`)) return
  tasks.remove(t.id)
  toast.success('Tarefa removida.')
}

const quickChipClass =
  'min-h-10 rounded-xl px-3 text-xs font-medium transition-[transform,box-shadow] active:scale-[0.98] sm:min-h-9 sm:text-sm'
</script>

<template>
  <div class="space-y-8 pb-1">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="space-y-2">
        <p class="text-primary text-[11px] font-semibold tracking-wider uppercase sm:text-xs">
          Operação
        </p>
        <h1 class="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
          Tarefas
        </h1>
        <p class="text-muted-foreground max-w-xl text-sm leading-relaxed">
          Use a busca e os atalhos abaixo; ambos funcionam em conjunto. No telemóvel, deslize o Kanban na horizontal; no
          computador, pode arrastar cartões entre colunas.
        </p>
      </div>
      <Button
        v-if="can('tasks.create')"
        type="button"
        size="lg"
        class="min-h-12 w-full shrink-0 shadow-sm sm:min-h-11 sm:w-auto"
        @click="openCreate"
      >
        <Plus class="size-4" />
        Nova tarefa
      </Button>
    </header>

    <div
      v-if="tasks.error"
      class="border-destructive/40 bg-destructive/10 text-destructive flex flex-col gap-3 rounded-lg border p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <span>{{ tasks.error }}</span>
      <Button type="button" variant="outline" size="sm" class="shrink-0 border-destructive/40" @click="tasks.load()">
        Tentar novamente
      </Button>
    </div>

    <article
      class="space-y-5 rounded-2xl border border-border/80 bg-gradient-to-b from-muted/50 to-card p-5 shadow-sm ring-1 ring-black/[0.02] sm:p-6 dark:from-muted/10 dark:to-card dark:ring-white/[0.04]"
    >
      <div class="space-y-1">
        <h2 class="text-foreground text-base font-semibold tracking-tight">
          Busca e vista rápida
        </h2>
        <p class="text-muted-foreground text-xs leading-relaxed sm:text-sm">
          Filtra a lista sem apagar o que escreveu na caixa de pesquisa.
        </p>
      </div>

      <div class="relative w-full max-w-full sm:max-w-md">
        <Search
          class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          v-model="q"
          class="min-h-12 border-border/80 pl-10 shadow-sm sm:min-h-11"
          placeholder="Título, descrição, tag ou item de checklist…"
          aria-label="Buscar tarefas"
        />
      </div>

      <div class="flex flex-col gap-3">
        <span class="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
          Vista rápida
        </span>
        <div class="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            :variant="taskQuickFilter === 'all' ? 'default' : 'outline'"
            :class="cn(quickChipClass, taskQuickFilter !== 'all' && 'border-dashed')"
            @click="taskQuickFilter = 'all'"
          >
            Todas
          </Button>
          <Button
            type="button"
            size="sm"
            :variant="taskQuickFilter === 'mine' ? 'default' : 'outline'"
            :class="cn(quickChipClass, taskQuickFilter !== 'mine' && 'border-dashed')"
            @click="taskQuickFilter = 'mine'"
          >
            Minhas
          </Button>
          <Button
            type="button"
            size="sm"
            :variant="taskQuickFilter === 'overdue' ? 'default' : 'outline'"
            :class="cn(quickChipClass, taskQuickFilter !== 'overdue' && 'border-dashed')"
            @click="taskQuickFilter = 'overdue'"
          >
            Atrasadas
          </Button>
          <Button
            type="button"
            size="sm"
            :variant="taskQuickFilter === 'priority' ? 'default' : 'outline'"
            :class="cn(quickChipClass, taskQuickFilter !== 'priority' && 'border-dashed')"
            @click="taskQuickFilter = 'priority'"
          >
            Urgente / alta
          </Button>
          <Button
            type="button"
            size="sm"
            :variant="taskQuickFilter === 'no_due' ? 'default' : 'outline'"
            :class="cn(quickChipClass, taskQuickFilter !== 'no_due' && 'border-dashed')"
            @click="taskQuickFilter = 'no_due'"
          >
            Sem prazo
          </Button>
        </div>
      </div>
    </article>

    <Tabs default-value="list" class="w-full space-y-4">
      <TabsList
        class="bg-muted/40 ring-border/60 h-auto w-full max-w-full flex-wrap justify-stretch gap-1 rounded-xl p-1 ring-1 sm:w-fit sm:flex-nowrap"
      >
        <TabsTrigger
          class="data-[state=active]:bg-card data-[state=active]:shadow-sm min-h-11 flex-1 rounded-lg sm:flex-none sm:px-5"
          value="list"
        >
          Lista
        </TabsTrigger>
        <TabsTrigger
          class="data-[state=active]:bg-card data-[state=active]:shadow-sm min-h-11 flex-1 rounded-lg sm:flex-none sm:px-5"
          value="kanban"
        >
          Kanban
        </TabsTrigger>
      </TabsList>

      <TabsContent value="list">
        <div v-if="tasks.loading" class="space-y-2">
          <Skeleton class="h-24 w-full lg:h-10" />
          <Skeleton class="h-24 w-full lg:h-10" />
        </div>
        <template v-else>
          <p
            v-if="!displayedTasks.length"
            class="text-muted-foreground py-10 text-center text-sm"
          >
            Nenhuma tarefa encontrada. Ajuste a busca ou crie uma nova.
          </p>
          <template v-else-if="displayedTasks.length">
            <div
              v-if="displayedTasks.length > listPageSize"
              class="text-muted-foreground mb-3 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm"
            >
              <span>Página {{ listPage }} de {{ listTotalPages }} ({{ displayedTasks.length }} tarefas)</span>
              <div class="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="min-h-9"
                  :disabled="listPage <= 1"
                  @click="listPage--"
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="min-h-9"
                  :disabled="listPage >= listTotalPages"
                  @click="listPage++"
                >
                  Seguinte
                </Button>
              </div>
            </div>
            <div class="space-y-3 lg:hidden">
              <Card
                v-for="t in pagedTasks"
              :key="t.id"
              class="overflow-hidden shadow-sm"
            >
              <CardHeader class="gap-2 pb-2">
                <CardTitle class="text-base leading-snug font-semibold">
                  {{ t.title }}
                </CardTitle>
                <div class="flex flex-wrap gap-2">
                  <TaskStatusBadge :status="t.status" />
                </div>
                <div v-if="t.tags.length" class="flex flex-wrap gap-1.5">
                  <Badge
                    v-for="tag in t.tags.slice(0, 6)"
                    :key="tag"
                    variant="outline"
                    class="max-w-full truncate text-xs font-normal"
                    :title="tag"
                  >
                    {{ labelForPresetTag(tag) }}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent class="grid gap-2 text-sm">
                <dl class="grid grid-cols-2 gap-x-3 gap-y-2">
                  <div v-if="taskChecklistSummary(t)" class="col-span-2">
                    <dt class="text-muted-foreground text-xs">Checklist</dt>
                    <dd class="tabular-nums">{{ taskChecklistSummary(t) }}</dd>
                  </div>
                  <div v-if="t.attachments.length" class="col-span-2">
                    <dt class="text-muted-foreground text-xs">Anexos</dt>
                    <dd>{{ t.attachments.length }} arquivo(s)</dd>
                  </div>
                  <div>
                    <dt class="text-muted-foreground text-xs">Dificuldade</dt>
                    <dd>{{ taskDifficultyLabels[t.difficulty] }}</dd>
                  </div>
                  <div>
                    <dt class="text-muted-foreground text-xs">Prioridade</dt>
                    <dd>{{ taskPriorityLabels[t.priority] }}</dd>
                  </div>
                  <div class="col-span-2">
                    <dt class="text-muted-foreground text-xs">Responsável</dt>
                    <dd class="truncate">{{ org.userName(t.assigneeId) }}</dd>
                  </div>
                  <div>
                    <dt class="text-muted-foreground text-xs">Estimativa</dt>
                    <dd class="tabular-nums">{{ t.estimatedHours }}h</dd>
                  </div>
                  <div>
                    <dt class="text-muted-foreground text-xs">Registrado</dt>
                    <dd class="tabular-nums">{{ t.loggedHours }}h</dd>
                  </div>
                </dl>
              </CardContent>
              <CardFooter
                v-if="canUpdateTask(t) || canDeleteTask(t)"
                class="flex flex-wrap gap-2 border-t bg-muted/30 pt-3"
              >
                <Button
                  v-if="canUpdateTask(t)"
                  variant="secondary"
                  type="button"
                  class="min-h-11 flex-1 sm:min-h-10"
                  @click="openEdit(t)"
                >
                  Editar
                </Button>
                <Button
                  v-if="canDeleteTask(t)"
                  variant="outline"
                  type="button"
                  class="text-destructive hover:text-destructive min-h-11 flex-1 border-destructive/30 sm:min-h-10"
                  @click="onDelete(t)"
                >
                  Excluir
                </Button>
              </CardFooter>
              </Card>
            </div>
            <div class="hidden overflow-x-auto rounded-xl border lg:block">
            <Table class="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dificuldade</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead class="text-right">Estimativa</TableHead>
                  <TableHead class="text-right">Registrado</TableHead>
                  <TableHead class="w-[120px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="t in pagedTasks" :key="t.id">
                  <TableCell class="max-w-[min(100vw,22rem)] font-medium lg:max-w-md">
                    <div class="leading-snug">
                      {{ t.title }}
                    </div>
                    <div
                      v-if="t.tags.length"
                      class="text-muted-foreground mt-1.5 flex flex-wrap gap-1 text-xs font-normal"
                    >
                      <Badge
                        v-for="tag in t.tags.slice(0, 4)"
                        :key="tag"
                        variant="secondary"
                        class="max-w-[10rem] truncate font-normal"
                        :title="tag"
                      >
                        {{ labelForPresetTag(tag) }}
                      </Badge>
                      <span v-if="t.tags.length > 4" class="self-center text-[11px]">+{{ t.tags.length - 4 }}</span>
                    </div>
                    <p
                      v-if="taskChecklistSummary(t)"
                      class="text-muted-foreground mt-1 text-xs font-normal"
                    >
                      Checklist {{ taskChecklistSummary(t) }}
                      <span v-if="t.attachments.length"> · {{ t.attachments.length }} anexo(s)</span>
                    </p>
                    <p
                      v-else-if="t.attachments.length"
                      class="text-muted-foreground mt-1 text-xs font-normal"
                    >
                      {{ t.attachments.length }} anexo(s)
                    </p>
                  </TableCell>
                  <TableCell>
                    <TaskStatusBadge :status="t.status" />
                  </TableCell>
                  <TableCell>{{ taskDifficultyLabels[t.difficulty] }}</TableCell>
                  <TableCell>{{ taskPriorityLabels[t.priority] }}</TableCell>
                  <TableCell>{{ org.userName(t.assigneeId) }}</TableCell>
                  <TableCell class="text-right tabular-nums">
                    {{ t.estimatedHours }}h
                  </TableCell>
                  <TableCell class="text-right tabular-nums">
                    {{ t.loggedHours }}h
                  </TableCell>
                  <TableCell class="text-right whitespace-nowrap">
                    <Button
                      v-if="canUpdateTask(t)"
                      variant="ghost"
                      size="sm"
                      type="button"
                      class="min-h-9 min-w-[4.5rem]"
                      @click="openEdit(t)"
                    >
                      Editar
                    </Button>
                    <Button
                      v-if="canDeleteTask(t)"
                      variant="ghost"
                      size="sm"
                      class="text-destructive min-h-9 min-w-[4.5rem]"
                      type="button"
                      @click="onDelete(t)"
                    >
                      Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            </div>
          </template>
        </template>
      </TabsContent>

      <TabsContent value="kanban">
        <KanbanBoard
          :tasks="displayedTasks"
          :assignee-name="(id) => org.userName(id)"
          @select="openEdit"
        />
      </TabsContent>
    </Tabs>

    <TaskDetailSheet
      v-model:open="sheetOpen"
      :task-id="activeId"
      :mode="sheetMode"
      @saved="tasks.load()"
    />
  </div>
</template>
