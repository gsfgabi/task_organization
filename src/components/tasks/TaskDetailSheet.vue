<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import { useTasksStore } from '@/stores/tasks'
import type {
  TaskAttachment,
  TaskChecklistItem,
  TaskDifficulty,
  TaskPriority,
  TaskStatus,
} from '@/types'
import { taskDifficultyLabels, taskPriorityLabels, taskStatusLabels } from '@/lib/labels'
import { TASK_TAG_PRESETS, isPresetTaskTag } from '@/lib/task-tags'
import { Link2, Paperclip, Plus, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { usePermissions } from '@/composables/usePermissions'
import { taskMatchesScope, useTaskScope } from '@/composables/useTaskScope'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const MAX_TAGS_TOTAL = 8
const MAX_ATTACHMENTS = 5
const MAX_ATTACHMENT_BYTES = 400 * 1024
const MAX_ATTACHMENTS_TOTAL_BYTES = 1.5 * 1024 * 1024

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
const auth = useAuthStore()
const { scope, isTaskVisible, visibleUsers, sectorsManagedBy } = useTaskScope()
const { can, canUpdateTask } = usePermissions()
const router = useRouter()

const directorateChoices = computed(() => {
  const u = auth.user
  if (!u) return org.directorates
  if (scope.value === 'directorate' || scope.value === 'own') {
    return org.directorates.filter((d) => d.id === u.directorateId)
  }
  if (scope.value === 'sectors') {
    const dirIds = new Set(
      sectorsManagedBy()
        .map((sid) => org.sectors.find((s) => s.id === sid)?.directorateId)
        .filter((id): id is string => !!id),
    )
    return org.directorates.filter((d) => dirIds.has(d.id))
  }
  return org.directorates
})

const sectorChoices = computed(() =>
  org.sectors.filter((s) => {
    if (s.directorateId !== directorateId.value) return false
    if (scope.value === 'sectors') return sectorsManagedBy().includes(s.id)
    if (scope.value === 'own') return s.id === auth.user?.sectorId
    return true
  }),
)

const assigneeChoices = computed(() => {
  const active = org.users.filter((x) => x.active)
  const base = visibleUsers(active)
  if (props.mode === 'edit' && existing.value) {
    const cur = org.users.find((u) => u.id === existing.value!.assigneeId)
    if (cur && cur.active && !base.some((u) => u.id === cur.id)) return [...base, cur]
  }
  return base
})

function copyTaskDeepLink() {
  if (!props.taskId) return
  const href = router.resolve({ name: 'tasks', query: { task: props.taskId } }).href
  const url = new URL(href, window.location.origin).href
  void navigator.clipboard.writeText(url).then(() => {
    toast.success('Link copiado para a área de transferência.')
  })
}

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

const selectedPresetTags = ref<string[]>([])
const legacyTags = ref<string[]>([])
const checklistItems = ref<TaskChecklistItem[]>([])
const attachments = ref<TaskAttachment[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)

const existing = computed(() => (props.taskId ? tasks.getById(props.taskId) : null))

const attachmentsTotalBytes = computed(() =>
  attachments.value.reduce((s, a) => s + a.size, 0),
)

function newChecklistId() {
  return `cl-${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`
}

function newAttachmentId() {
  return `att-${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`
}

function mergedTagList(): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of selectedPresetTags.value) {
    if (seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  for (const id of legacyTags.value) {
    if (seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

function togglePresetTag(id: string) {
  const i = selectedPresetTags.value.indexOf(id)
  if (i !== -1) {
    selectedPresetTags.value.splice(i, 1)
    return
  }
  if (selectedPresetTags.value.length + legacyTags.value.length >= MAX_TAGS_TOTAL) {
    toast.error(`No máximo ${MAX_TAGS_TOTAL} etiquetas no total.`)
    return
  }
  selectedPresetTags.value.push(id)
}

function removeLegacyTag(tag: string) {
  legacyTags.value = legacyTags.value.filter((x) => x !== tag)
}

function addChecklistRow() {
  checklistItems.value.push({
    id: newChecklistId(),
    label: '',
    done: false,
  })
}

function removeChecklistRow(id: string) {
  checklistItems.value = checklistItems.value.filter((x) => x.id !== id)
}

function setChecklistDone(id: string, done: boolean) {
  const row = checklistItems.value.find((x) => x.id === id)
  if (row) row.done = done
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(new Error('leitura'))
    r.readAsDataURL(file)
  })
}

async function onPickFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const list = input.files
  if (!list?.length) return

  for (const file of Array.from(list)) {
    if (attachments.value.length >= MAX_ATTACHMENTS) {
      toast.error(`No máximo ${MAX_ATTACHMENTS} anexos por tarefa.`)
      break
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error(`“${file.name}” excede ${MAX_ATTACHMENT_BYTES / 1024} KB por ficheiro.`)
      continue
    }
    if (attachmentsTotalBytes.value + file.size > MAX_ATTACHMENTS_TOTAL_BYTES) {
      toast.error('Tamanho total dos anexos excede o limite permitido.')
      break
    }
    try {
      const dataUrl = await readFileAsDataUrl(file)
      attachments.value.push({
        id: newAttachmentId(),
        name: file.name,
        mime: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl,
      })
    } catch {
      toast.error(`Não foi possível ler “${file.name}”.`)
    }
  }
  input.value = ''
}

function removeAttachment(id: string) {
  attachments.value = attachments.value.filter((a) => a.id !== id)
}

function sanitizedChecklist(): TaskChecklistItem[] {
  return checklistItems.value
    .map((x) => ({
      id: x.id,
      label: x.label.trim(),
      done: x.done,
    }))
    .filter((x) => x.label.length > 0)
}

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
      const u = auth.user
      if (u && scope.value === 'own') {
        assigneeId.value = u.id
        directorateId.value = u.directorateId
        sectorId.value = u.sectorId
      } else if (u && scope.value === 'directorate') {
        directorateId.value = u.directorateId
        sectorId.value =
          org.sectors.find((s) => s.directorateId === u.directorateId)?.id ?? org.sectors[0]?.id ?? ''
        assigneeId.value =
          org.users.find((x) => x.active && x.directorateId === u.directorateId)?.id ?? u.id
      } else if (u && scope.value === 'sectors') {
        const mids = sectorsManagedBy()
        const firstS = org.sectors.find((s) => mids.includes(s.id))
        sectorId.value = firstS?.id ?? org.sectors[0]?.id ?? ''
        directorateId.value = firstS?.directorateId ?? org.directorates[0]?.id ?? ''
        assigneeId.value =
          org.users.find((x) => x.active && mids.includes(x.sectorId))?.id ?? u.id
      } else {
        assigneeId.value = org.users.find((x) => x.active)?.id ?? ''
        sectorId.value = org.sectors[0]?.id ?? ''
        directorateId.value = org.directorates[0]?.id ?? ''
      }
      estimatedHours.value = 8
      dueDate.value = ''
      selectedPresetTags.value = []
      legacyTags.value = []
      checklistItems.value = []
      attachments.value = []
      return
    }
    const t = existing.value
    if (!t) return
    if (!isTaskVisible(t)) {
      toast.error('Não tem acesso a esta tarefa.')
      emit('update:open', false)
      return
    }
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
    selectedPresetTags.value = t.tags.filter((x) => isPresetTaskTag(x))
    legacyTags.value = t.tags.filter((x) => !isPresetTaskTag(x))
    checklistItems.value = t.checklist.map((c) => ({ ...c }))
    attachments.value = t.attachments.map((a) => ({ ...a }))
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
  const u = auth.user
  if (!u) {
    toast.error('Sessão inválida.')
    return
  }
  const probe = {
    assigneeId: assigneeId.value,
    sectorId: sectorId.value,
    directorateId: directorateId.value,
  }
  if (!taskMatchesScope(probe, u, scope.value)) {
    toast.error('A tarefa ficaria fora do âmbito permitido para o seu papel.')
    return
  }
  if (props.mode === 'create' && !can('tasks.create')) {
    toast.error('Sem permissão para criar tarefas.')
    return
  }
  if (props.mode === 'edit' && props.taskId && existing.value) {
    if (!canUpdateTask({ assigneeId: assigneeId.value })) {
      toast.error('Sem permissão para alterar esta tarefa.')
      return
    }
  }
  const checklist = sanitizedChecklist()
  const att = attachments.value.map((a) => ({ ...a }))
  const tagList = mergedTagList()

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
      tags: tagList,
      checklist,
      attachments: att,
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
      tags: tagList,
      checklist,
      attachments: att,
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
      class="flex h-full max-h-[100dvh] w-full max-w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
    >
      <div class="flex min-h-0 flex-1 flex-col gap-0">
        <SheetHeader class="shrink-0 border-b px-4 py-4 sm:px-6">
          <SheetTitle class="pr-10 text-lg leading-snug">
            {{ mode === 'create' ? 'Nova tarefa' : 'Editar tarefa' }}
          </SheetTitle>
          <SheetDescription class="text-pretty">
            Etiquetas do catálogo, checklist e anexos. O registo de tempo faz-se na aba Tempo.
          </SheetDescription>
          <div v-if="mode === 'edit' && taskId" class="mt-3">
            <Button type="button" variant="outline" size="sm" class="gap-2" @click="copyTaskDeepLink">
              <Link2 class="size-4" />
              Copiar link da tarefa
            </Button>
          </div>
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

          <div class="bg-muted/40 space-y-3 rounded-xl border p-3 sm:p-4">
            <div class="flex flex-wrap items-end justify-between gap-2">
              <div>
                <Label class="text-sm font-medium">Etiquetas (catálogo)</Label>
                <p class="text-muted-foreground mt-0.5 max-w-xl text-xs leading-relaxed">
                  Valores fixos para filtros e exportação nos relatórios. Toque para marcar ou desmarcar.
                </p>
              </div>
              <span class="text-muted-foreground shrink-0 text-xs tabular-nums">
                {{ selectedPresetTags.length + legacyTags.length }}/{{ MAX_TAGS_TOTAL }}
              </span>
            </div>
            <div class="flex flex-wrap gap-2">
              <Button
                v-for="p in TASK_TAG_PRESETS"
                :key="p.id"
                type="button"
                size="sm"
                :variant="selectedPresetTags.includes(p.id) ? 'default' : 'outline'"
                class="h-auto min-h-9 max-w-full whitespace-normal px-2.5 py-1.5 text-left text-xs leading-snug"
                :aria-pressed="selectedPresetTags.includes(p.id)"
                @click="togglePresetTag(p.id)"
              >
                {{ p.label }}
              </Button>
            </div>
            <div
              v-if="legacyTags.length"
              class="space-y-2 rounded-lg border border-amber-500/35 bg-amber-500/8 p-3 text-xs"
            >
              <p class="text-muted-foreground leading-relaxed">
                Estas etiquetas não estão no catálogo. Remova-as para alinhar aos relatórios ou mantenha até substituir
                por valores do catálogo.
              </p>
              <div class="flex flex-wrap gap-1.5">
                <Badge
                  v-for="tag in legacyTags"
                  :key="tag"
                  variant="outline"
                  class="border-amber-600/40 gap-1 pr-1 font-mono text-[11px] font-normal"
                >
                  {{ tag }}
                  <button
                    type="button"
                    class="hover:bg-muted inline-flex size-5 items-center justify-center rounded-sm"
                    :aria-label="`Remover etiqueta legada ${tag}`"
                    @click="removeLegacyTag(tag)"
                  >
                    <X class="size-3" />
                  </button>
                </Badge>
              </div>
            </div>
          </div>

          <div class="bg-muted/40 space-y-3 rounded-xl border p-3 sm:p-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <Label class="text-sm font-medium">Checklist</Label>
              <Button type="button" variant="outline" size="sm" class="min-h-9" @click="addChecklistRow">
                <Plus class="size-4" />
                Item
              </Button>
            </div>
            <p v-if="!checklistItems.length" class="text-muted-foreground text-xs">
              Nenhum item. Use “Item” para adicionar passos ao checklist.
            </p>
            <ul v-else class="space-y-2">
              <li
                v-for="row in checklistItems"
                :key="row.id"
                class="flex items-start gap-2 rounded-lg border bg-background/80 p-2"
              >
                <Checkbox
                  class="mt-0.5"
                  :checked="row.done"
                  @update:checked="(v: boolean | 'indeterminate') => setChecklistDone(row.id, v === true)"
                />
                <Input
                  v-model="row.label"
                  class="min-h-9 flex-1 text-sm"
                  placeholder="Descreva o passo…"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  class="text-muted-foreground size-9 shrink-0"
                  :aria-label="'Remover item da checklist'"
                  @click="removeChecklistRow(row.id)"
                >
                  <X class="size-4" />
                </Button>
              </li>
            </ul>
          </div>

          <div class="bg-muted/40 space-y-3 rounded-xl border p-3 sm:p-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <Label class="text-sm font-medium">Anexos</Label>
              <span class="text-muted-foreground text-xs">
                {{ attachments.length }}/{{ MAX_ATTACHMENTS }} · máx. {{ MAX_ATTACHMENT_BYTES / 1024 }} KB cada
              </span>
            </div>
            <input
              ref="fileInputRef"
              type="file"
              class="sr-only"
              multiple
              accept=".pdf,.txt,.csv,.png,.jpg,.jpeg,.webp,.gif,application/pdf,text/plain,text/csv,image/*"
              @change="onPickFiles"
            />
            <Button
              type="button"
              variant="outline"
              class="min-h-11 w-full sm:min-h-9 sm:w-auto"
              :disabled="attachments.length >= MAX_ATTACHMENTS"
              @click="fileInputRef?.click()"
            >
              <Paperclip class="size-4" />
              Escolher arquivos
            </Button>
            <ul v-if="attachments.length" class="space-y-2 text-sm">
              <li
                v-for="a in attachments"
                :key="a.id"
                class="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background/80 px-3 py-2"
              >
                <a
                  :href="a.dataUrl"
                  :download="a.name"
                  class="text-primary min-w-0 flex-1 truncate underline-offset-2 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >{{ a.name }}</a>
                <span class="text-muted-foreground tabular-nums text-xs">{{ Math.round(a.size / 1024) }} KB</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="text-destructive min-h-8 px-2"
                  @click="removeAttachment(a.id)"
                >
                  Remover
                </Button>
              </li>
            </ul>
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
            <NativeSelect
              v-model="assigneeId"
              class="w-full max-w-full"
              :disabled="scope === 'own'"
            >
              <NativeSelectOption
                v-for="u in assigneeChoices"
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
              <NativeSelect
                v-model="directorateId"
                class="w-full max-w-full"
                :disabled="directorateChoices.length <= 1"
              >
                <NativeSelectOption
                  v-for="d in directorateChoices"
                  :key="d.id"
                  :value="d.id"
                >
                  {{ d.name }}
                </NativeSelectOption>
              </NativeSelect>
            </div>
            <div class="grid gap-2">
              <Label>Setor</Label>
              <NativeSelect
                v-model="sectorId"
                class="w-full max-w-full"
                :disabled="sectorChoices.length <= 1"
              >
                <NativeSelectOption
                  v-for="s in sectorChoices"
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
