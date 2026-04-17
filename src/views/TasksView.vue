<script setup lang="ts">
import KanbanBoard from '@/components/tasks/KanbanBoard.vue'
import TaskDetailSheet from '@/components/tasks/TaskDetailSheet.vue'
import TaskStatusBadge from '@/components/tasks/TaskStatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePermissions } from '@/composables/usePermissions'
import { taskDifficultyLabels, taskPriorityLabels } from '@/lib/labels'
import { useOrgStore } from '@/stores/org'
import { useTasksStore } from '@/stores/tasks'
import type { TaskItem } from '@/types'
import { Plus, Search } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'

const org = useOrgStore()
const tasks = useTasksStore()
const { can } = usePermissions()

const q = ref('')
const sheetOpen = ref(false)
const sheetMode = ref<'create' | 'edit'>('create')
const activeId = ref<string | null>(null)

onMounted(() => tasks.load())

const filtered = computed(() => {
  const s = q.value.trim().toLowerCase()
  if (!s) return tasks.tasks
  return tasks.tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(s) ||
      t.description.toLowerCase().includes(s) ||
      t.tags.some((x) => x.toLowerCase().includes(s)),
  )
})

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
  if (!can('tasks.delete')) {
    toast.error('Sem permissão para excluir.')
    return
  }
  if (!confirm(`Excluir "${t.title}"?`)) return
  tasks.remove(t.id)
  toast.success('Tarefa removida.')
}
</script>

<template>
  <div class="space-y-4 sm:space-y-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <p class="text-muted-foreground text-sm leading-relaxed sm:max-w-xl sm:text-base">
        Lista e quadro Kanban. No celular, deslize o Kanban na horizontal; no desktop, você pode arrastar cartões.
      </p>
      <Button
        v-if="can('tasks.create')"
        type="button"
        class="min-h-11 w-full shrink-0 sm:min-h-9 sm:w-auto"
        @click="openCreate"
      >
        <Plus class="size-4" />
        Nova tarefa
      </Button>
    </div>

    <div class="relative w-full max-w-full sm:max-w-md">
      <Search
        class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
      />
      <Input
        v-model="q"
        class="min-h-11 pl-10 sm:min-h-9"
        placeholder="Buscar por título, descrição ou tag…"
      />
    </div>

    <Tabs default-value="list" class="w-full">
      <TabsList class="h-auto w-full max-w-full flex-wrap justify-stretch gap-1 sm:w-fit sm:flex-nowrap">
        <TabsTrigger class="min-h-11 flex-1 sm:flex-none" value="list">
          Lista
        </TabsTrigger>
        <TabsTrigger class="min-h-11 flex-1 sm:flex-none" value="kanban">
          Kanban
        </TabsTrigger>
      </TabsList>

      <TabsContent value="list" class="mt-4">
        <div
          v-if="tasks.loading"
          class="space-y-2"
        >
          <Skeleton class="h-10 w-full" />
          <Skeleton class="h-10 w-full" />
        </div>
        <div
          v-else
          class="-mx-1 overflow-x-auto rounded-xl border sm:mx-0"
        >
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
              <TableRow v-for="t in filtered" :key="t.id">
                <TableCell class="font-medium">
                  {{ t.title }}
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
                    v-if="can('tasks.update')"
                    variant="ghost"
                    size="sm"
                    type="button"
                    class="min-h-9 min-w-[4.5rem]"
                    @click="openEdit(t)"
                  >
                    Editar
                  </Button>
                  <Button
                    v-if="can('tasks.delete')"
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
          <p
            v-if="!filtered.length"
            class="text-muted-foreground p-6 text-center text-sm"
          >
            Nenhuma tarefa encontrada. Ajuste a busca ou crie uma nova.
          </p>
        </div>
      </TabsContent>

      <TabsContent value="kanban" class="mt-4">
        <KanbanBoard
          :tasks="filtered"
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
