<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePermissions } from '@/composables/usePermissions'
import { useOrgStore } from '@/stores/org'
import { useRolesStore } from '@/stores/roles'
import type { Directorate, Sector, User } from '@/types'
import { Plus } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

const org = useOrgStore()
const rolesStore = useRolesStore()
const { can } = usePermissions()

function papelLabels(u: User) {
  const names = u.roleIds
    .map((id) => rolesStore.roleById(id)?.name)
    .filter((n): n is string => !!n)
  return names.length ? names.join(', ') : '—'
}

function shortId() {
  return crypto.randomUUID().replaceAll('-', '').slice(0, 10)
}

const dlg = ref<'dir' | 'sector' | 'user' | null>(null)
const editing = ref<Directorate | Sector | User | null>(null)

const primaryRole = computed({
  get() {
    if (!editing.value || dlg.value !== 'user') return ''
    return (editing.value as User).roleIds[0] ?? ''
  },
  set(v: string | number) {
    if (!editing.value || dlg.value !== 'user') return
    const s = typeof v === 'string' ? v : String(v)
    ;(editing.value as User).roleIds = s ? [s] : []
  },
})

function openDir(d?: Directorate) {
  editing.value = d
    ? { ...d }
    : { id: `dir-${shortId()}`, name: '', code: '' }
  dlg.value = 'dir'
}

function openSector(s?: Sector) {
  editing.value = s
    ? { ...s }
    : {
        id: `sec-${shortId()}`,
        name: '',
        code: '',
        directorateId: org.directorates[0]?.id ?? '',
      }
  dlg.value = 'sector'
}

function openUser(u?: User) {
  editing.value = u
    ? { ...u }
    : {
        id: `u-${shortId()}`,
        name: '',
        email: '',
        roleIds: ['role-member'],
        sectorId: org.sectors[0]?.id ?? '',
        directorateId: org.directorates[0]?.id ?? '',
        active: true,
      }
  dlg.value = 'user'
}

function saveDir() {
  if (!can('org.manage')) return
  const d = editing.value as Directorate
  if (!d.name.trim() || !d.code.trim()) {
    toast.error('Preencha nome e código.')
    return
  }
  org.upsertDirectorate(d)
  toast.success('Diretoria salva.')
  dlg.value = null
}

function saveSector() {
  if (!can('org.manage')) return
  const s = editing.value as Sector
  if (!s.name.trim() || !s.code.trim()) {
    toast.error('Preencha nome e código.')
    return
  }
  org.upsertSector(s)
  toast.success('Setor salvo.')
  dlg.value = null
}

function saveUser() {
  if (!can('org.manage') && !can('admin.users')) {
    toast.error('Sem permissão.')
    return
  }
  const u = editing.value as User
  if (!u.name.trim() || !u.email.trim()) {
    toast.error('Preencha nome e e-mail.')
    return
  }
  org.upsertUser(u)
  toast.success('Usuário salvo.')
  dlg.value = null
}

watch(
  () =>
    dlg.value === 'user' && editing.value
      ? (editing.value as User).directorateId
      : null,
  (nid) => {
    if (!nid || dlg.value !== 'user' || !editing.value) return
    const u = editing.value as User
    const ok = org.sectors.some(
      (s) => s.id === u.sectorId && s.directorateId === nid,
    )
    if (ok) return
    const first = org.sectors.find((s) => s.directorateId === nid)
    if (first) u.sectorId = first.id
  },
)
</script>

<template>
  <div class="space-y-4 sm:space-y-6">
    <p class="text-muted-foreground text-sm leading-relaxed sm:text-base">
      Diretorias, setores e pessoas. Alterações exigem permissão de gestão.
    </p>

    <Tabs default-value="dir" class="w-full">
      <TabsList class="h-auto w-full max-w-full flex-wrap justify-start gap-1 sm:w-fit sm:flex-nowrap">
        <TabsTrigger class="min-h-10 flex-1 sm:flex-none" value="dir">
          Diretorias
        </TabsTrigger>
        <TabsTrigger class="min-h-10 flex-1 sm:flex-none" value="sec">
          Setores
        </TabsTrigger>
        <TabsTrigger class="min-h-10 flex-1 sm:flex-none" value="usr">
          Usuários
        </TabsTrigger>
      </TabsList>

      <TabsContent value="dir" class="mt-4 space-y-3">
        <div class="flex justify-end">
          <Button
            v-if="can('org.manage')"
            type="button"
            @click="openDir()"
          >
            <Plus class="size-4" />
            Diretoria
          </Button>
        </div>
        <div class="-mx-1 overflow-x-auto rounded-xl border sm:mx-0">
          <Table class="min-w-[320px]">
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead class="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="d in org.directorates" :key="d.id">
                <TableCell>{{ d.code }}</TableCell>
                <TableCell>{{ d.name }}</TableCell>
                <TableCell class="text-right">
                  <Button
                    v-if="can('org.manage')"
                    variant="ghost"
                    size="sm"
                    type="button"
                    @click="openDir(d)"
                  >
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="sec" class="mt-4 space-y-3">
        <div class="flex justify-end">
          <Button
            v-if="can('org.manage')"
            type="button"
            @click="openSector()"
          >
            <Plus class="size-4" />
            Setor
          </Button>
        </div>
        <div class="-mx-1 overflow-x-auto rounded-xl border sm:mx-0">
          <Table class="min-w-[360px]">
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Diretoria</TableHead>
                <TableHead class="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="s in org.sectors" :key="s.id">
                <TableCell>{{ s.code }}</TableCell>
                <TableCell>{{ s.name }}</TableCell>
                <TableCell>{{ org.directorateName(s.directorateId) }}</TableCell>
                <TableCell class="text-right">
                  <Button
                    v-if="can('org.manage')"
                    variant="ghost"
                    size="sm"
                    type="button"
                    @click="openSector(s)"
                  >
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="usr" class="mt-4 space-y-3">
        <div class="flex justify-end">
          <Button
            v-if="can('org.manage') || can('admin.users')"
            type="button"
            @click="openUser()"
          >
            <Plus class="size-4" />
            Usuário
          </Button>
        </div>
        <div class="-mx-1 overflow-x-auto rounded-xl border sm:mx-0">
          <Table class="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Diretoria</TableHead>
                <TableHead class="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="u in org.users" :key="u.id">
                <TableCell>{{ u.name }}</TableCell>
                <TableCell class="max-w-[200px] truncate sm:max-w-none">{{ u.email }}</TableCell>
                <TableCell class="text-muted-foreground max-w-[180px] text-sm sm:max-w-[220px]">
                  <span class="line-clamp-2 sm:line-clamp-none">{{ papelLabels(u) }}</span>
                </TableCell>
                <TableCell>{{ org.sectorName(u.sectorId) }}</TableCell>
                <TableCell>{{ org.directorateName(u.directorateId) }}</TableCell>
                <TableCell class="text-right">
                  <Button
                    v-if="can('org.manage') || can('admin.users')"
                    variant="ghost"
                    size="sm"
                    type="button"
                    @click="openUser(u)"
                  >
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>

    <Dialog :open="dlg === 'dir'" @update:open="(v) => !v && (dlg = null)">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Diretoria</DialogTitle>
        </DialogHeader>
        <div v-if="editing && dlg === 'dir'" class="grid gap-3 py-2">
          <div class="grid gap-2">
            <Label for="dc">Código</Label>
            <Input id="dc" v-model="(editing as Directorate).code" />
          </div>
          <div class="grid gap-2">
            <Label for="dn">Nome</Label>
            <Input id="dn" v-model="(editing as Directorate).name" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" class="min-h-11 sm:min-h-9" @click="dlg = null">
            Cancelar
          </Button>
          <Button type="button" class="min-h-11 sm:min-h-9" @click="saveDir">
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="dlg === 'sector'" @update:open="(v) => !v && (dlg = null)">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Setor</DialogTitle>
        </DialogHeader>
        <div v-if="editing && dlg === 'sector'" class="grid gap-3 py-2">
          <div class="grid gap-2">
            <Label for="sc">Código</Label>
            <Input id="sc" v-model="(editing as Sector).code" />
          </div>
          <div class="grid gap-2">
            <Label for="sn">Nome</Label>
            <Input id="sn" v-model="(editing as Sector).name" />
          </div>
          <div class="grid gap-2">
            <Label>Diretoria</Label>
            <NativeSelect v-model="(editing as Sector).directorateId" class="w-full max-w-full">
              <NativeSelectOption
                v-for="d in org.directorates"
                :key="d.id"
                :value="d.id"
              >
                {{ d.name }}
              </NativeSelectOption>
            </NativeSelect>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" class="min-h-11 sm:min-h-9" @click="dlg = null">
            Cancelar
          </Button>
          <Button type="button" class="min-h-11 sm:min-h-9" @click="saveSector">
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="dlg === 'user'" @update:open="(v) => !v && (dlg = null)">
      <DialogContent
        class="flex max-h-[min(92dvh,40rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-h-[min(92dvh,48rem)] sm:p-6"
      >
        <DialogHeader class="shrink-0 border-b px-4 py-3 text-left sm:border-0 sm:px-0 sm:py-0">
          <DialogTitle>Usuário</DialogTitle>
        </DialogHeader>
        <div v-if="editing && dlg === 'user'" class="grid max-h-[min(70dvh,28rem)] gap-3 overflow-y-auto px-4 py-4 sm:max-h-none sm:px-0 sm:py-2">
          <div class="grid gap-2">
            <Label for="un">Nome</Label>
            <Input id="un" v-model="(editing as User).name" autocomplete="name" />
          </div>
          <div class="grid gap-2">
            <Label for="ue">E-mail</Label>
            <Input id="ue" v-model="(editing as User).email" type="email" autocomplete="email" />
          </div>
          <div class="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div class="grid gap-2">
              <Label>Diretoria</Label>
              <NativeSelect v-model="(editing as User).directorateId" class="w-full max-w-full">
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
              <NativeSelect v-model="(editing as User).sectorId" class="w-full max-w-full">
              <NativeSelectOption
                v-for="s in org.sectors.filter(
                  (x) => x.directorateId === (editing as User).directorateId,
                )"
                :key="s.id"
                :value="s.id"
              >
                {{ s.name }}
              </NativeSelectOption>
              </NativeSelect>
            </div>
          </div>
          <div class="grid gap-2">
            <Label>Papel (principal)</Label>
            <NativeSelect v-model="primaryRole" class="w-full max-w-full">
              <NativeSelectOption value="role-admin">Administrador</NativeSelectOption>
              <NativeSelectOption value="role-manager">Gestor</NativeSelectOption>
              <NativeSelectOption value="role-member">Colaborador</NativeSelectOption>
              <NativeSelectOption value="role-viewer">Visualizador</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>
        <DialogFooter class="bg-muted/40 mt-0 shrink-0 rounded-b-xl border-t px-4 py-3 sm:px-6">
          <Button type="button" variant="outline" class="min-h-11 sm:min-h-9" @click="dlg = null">
            Cancelar
          </Button>
          <Button type="button" class="min-h-11 sm:min-h-9" @click="saveUser">
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
