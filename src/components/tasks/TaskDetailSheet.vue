<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useOrgStore } from '@/stores/org'
import { useTasksStore } from '@/stores/tasks'
import type { TaskDifficulty, TaskPriority, TaskStatus } from '@/types'
import { taskDifficultyLabels, taskPriorityLabels, taskStatusLabels } from '@/lib/labels'
import { toast } from 'vue-sonner'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  taskId: string | null
  mode: 'create' | 'edit'
}>()

const emit = defineEmits<{
  'update:open': [v: boolean]
  saved: []
}>()

const org = useOrgStore()
const tasks = useTasksStore()

const title = ref('')
const description = ref('')
const status = ref<TaskStatus>('todo')
const difficulty = ref<TaskDifficulty>('medium')
const priority = ref<TaskPriority>('medium')
const assigneeId = ref('')
const sectorId = ref('')
const directorateId = ref('')
const estimatedHours = ref(8)
const dueDate = ref('')

const existing = computed(() => (props.taskId ? tasks.getById(props.taskId) : null))

watch(directorateId, (nid) => {
  const valid = org.sectors.some(
    (s) => s.id === sectorId.value && s.directorateId === nid,
  )
  if (valid) return
  const first = org.sectors.find((x) => x.directorateId === nid)
  if (first) sectorId.value = first.id
})

watch(
  () => [props.open, props.taskId, props.mode] as const,
  () => {
    if (!props.open) return
    if (props.mode === 'create') {
      title.value = ''
      description.value = ''
      status.value = 'todo'
      difficulty.value = 'medium'
      priority.value = 'medium'
      assigneeId.value = org.users[0]?.id ?? ''
      sectorId.value = org.sectors[0]?.id ?? ''
      directorateId.value = org.directorates[0]?.id ?? ''
      estimatedHours.value = 8
      dueDate.value = ''
      return
    }
    const t = existing.value
    if (!t) return
    title.value = t.title
    description.value = t.description
    status.value = t.status
    difficulty.value = t.difficulty
    priority.value = t.priority
    assigneeId.value = t.assigneeId
    sectorId.value = t.sectorId
    directorateId.value = t.directorateId
    estimatedHours.value = t.estimatedHours
    dueDate.value = t.dueDate ?? ''
  },
  { immediate: true },
)

function close() {
  emit('update:open', false)
}

function save() {
  if (!title.value.trim()) {
    toast.error('Informe um título para a tarefa.')
    return
  }
  if (props.mode === 'create') {
    tasks.create({
      title: title.value.trim(),
      description: description.value,
      status: status.value,
      difficulty: difficulty.value,
      priority: priority.value,
      assigneeId: assigneeId.value,
      sectorId: sectorId.value,
      directorateId: directorateId.value,
      tags: [],
      estimatedHours: Number(estimatedHours.value) || 0,
      dueDate: dueDate.value || null,
    })
    toast.success('Tarefa criada.')
  } else if (props.taskId) {
    tasks.patch(props.taskId, {
      title: title.value.trim(),
      description: description.value,
      status: status.value,
      difficulty: difficulty.value,
      priority: priority.value,
      assigneeId: assigneeId.value,
      sectorId: sectorId.value,
      directorateId: directorateId.value,
      estimatedHours: Number(estimatedHours.value) || 0,
      dueDate: dueDate.value || null,
    })
    toast.success('Tarefa atualizada.')
  }
  emit('saved')
  close()
}
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent
      side="right"
      class="flex h-full max-h-[100dvh] w-full max-w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
    >
      <div class="flex min-h-0 flex-1 flex-col gap-0">
        <SheetHeader class="shrink-0 border-b px-4 py-4 sm:px-6">
          <SheetTitle class="pr-10 text-lg leading-snug">
            {{ mode === 'create' ? 'Nova tarefa' : 'Editar tarefa' }}
          </SheetTitle>
          <SheetDescription class="text-pretty">
            Defina responsável, setor, dificuldade e estimativa. O tempo registrado é
            consolidado na aba Tempo.
          </SheetDescription>
        </SheetHeader>

        <div class="grid min-h-0 flex-1 auto-rows-min gap-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
          <div class="grid gap-2">
            <Label for="t-title">Título</Label>
            <Input id="t-title" v-model="title" placeholder="Resumo objetivo" class="min-h-11 sm:min-h-9" />
          </div>
          <div class="grid gap-2">
            <Label for="t-desc">Descrição</Label>
            <Textarea id="t-desc" v-model="description" rows="4" class="min-h-[100px] resize-y" />
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="grid gap-2">
              <Label>Status</Label>
              <NativeSelect v-model="status" class="w-full max-w-full">
                <NativeSelectOption
                  v-for="(label, key) in taskStatusLabels"
                  :key="key"
                  :value="key"
                >
                  {{ label }}
                </NativeSelectOption>
              </NativeSelect>
            </div>
            <div class="grid gap-2">
              <Label>Dificuldade</Label>
              <NativeSelect v-model="difficulty" class="w-full max-w-full">
                <NativeSelectOption
                  v-for="(label, key) in taskDifficultyLabels"
                  :key="key"
                  :value="key"
                >
                  {{ label }}
                </NativeSelectOption>
              </NativeSelect>
            </div>
          </div>
          <div class="grid gap-2">
            <Label>Prioridade</Label>
            <NativeSelect v-model="priority" class="w-full max-w-full">
              <NativeSelectOption
                v-for="(label, key) in taskPriorityLabels"
                :key="key"
                :value="key"
              >
                {{ label }}
              </NativeSelectOption>
            </NativeSelect>
          </div>
          <div class="grid gap-2">
            <Label>Responsável</Label>
            <NativeSelect v-model="assigneeId" class="w-full max-w-full">
              <NativeSelectOption
                v-for="u in org.users.filter((x) => x.active)"
                :key="u.id"
                :value="u.id"
              >
                {{ u.name }}
              </NativeSelectOption>
            </NativeSelect>
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="grid gap-2">
              <Label>Diretoria</Label>
              <NativeSelect v-model="directorateId" class="w-full max-w-full">
                <NativeSelectOption
                  v-for="d in org.directorates"
                  :key="d.id"
                  :value="d.id"
                >
                  {{ d.name }}
                </NativeSelectOption>
              </NativeSelect>
            </div>
            <div class="grid gap-2">
              <Label>Setor</Label>
              <NativeSelect v-model="sectorId" class="w-full max-w-full">
                <NativeSelectOption
                  v-for="s in org.sectors.filter((x) => x.directorateId === directorateId)"
                  :key="s.id"
                  :value="s.id"
                >
                  {{ s.name }}
                </NativeSelectOption>
              </NativeSelect>
            </div>
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="grid gap-2">
              <Label for="t-est">Estimativa (h)</Label>
              <Input
                id="t-est"
                v-model.number="estimatedHours"
                class="min-h-11 sm:min-h-9"
                min="0"
                step="0.5"
                type="number"
              />
            </div>
            <div class="grid gap-2">
              <Label for="t-due">Prazo</Label>
              <Input id="t-due" v-model="dueDate" class="min-h-11 sm:min-h-9" type="date" />
            </div>
          </div>
          <div
            v-if="mode === 'edit' && existing"
            class="bg-muted/50 rounded-lg border p-3 text-sm"
          >
            <p>
              Tempo registrado:
              <strong>{{ existing.loggedHours }}h</strong>
            </p>
          </div>
        </div>
      </div>

      <SheetFooter
        class="mt-0 shrink-0 gap-2 border-t bg-background px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-6"
      >
        <Button type="button" variant="outline" class="min-h-11 w-full sm:min-h-9 sm:w-auto" @click="close">
          Cancelar
        </Button>
        <Button type="button" class="min-h-11 w-full sm:min-h-9 sm:w-auto" @click="save">
          Salvar
        </Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
