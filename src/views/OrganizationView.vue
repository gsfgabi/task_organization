<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
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
import { useAuditStore } from '@/stores/audit'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import { useRolesStore } from '@/stores/roles'
import type { Directorate, ID, Sector, User } from '@/types'
import { LogIn, Plus } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

const org = useOrgStore()
const rolesStore = useRolesStore()
const auth = useAuthStore()
const audit = useAuditStore()
const router = useRouter()
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
    ? { ...u, managedSectorIds: u.managedSectorIds ? [...u.managedSectorIds] : undefined }
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

const sectorsForManagedEditor = computed(() => {
  if (dlg.value !== 'user' || !editing.value) return [] as Sector[]
  const u = editing.value as User
  return org.sectors.filter((s) => s.directorateId === u.directorateId)
})

function managedSectorIdsList(u: User): ID[] {
  return u.managedSectorIds?.length ? [...u.managedSectorIds] : [u.sectorId]
}

function managedSectorChecked(secId: ID): boolean {
  if (dlg.value !== 'user' || !editing.value) return false
  return managedSectorIdsList(editing.value as User).includes(secId)
}

function setManagedSector(secId: ID, checked: boolean) {
  if (dlg.value !== 'user' || !editing.value) return
  const u = editing.value as User
  const next = new Set(managedSectorIdsList(u))
  if (checked) next.add(secId)
  else next.delete(secId)
  if (next.size === 0) next.add(u.sectorId)
  u.managedSectorIds = [...next]
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

function accessAsUser(u: User) {
  if (!can('admin.users')) {
    toast.error('Sem permissão para aceder como outro utilizador.')
    return
  }
  if (!auth.user) return
  if (auth.user.id === u.id) {
    toast.info('Já está nesta conta.')
    return
  }
  if (!u.active) {
    toast.error('Utilizador inativo.')
    return
  }
  if (
    !confirm(
      `Entrar como «${u.name}»?\n\nA sua sessão actual fica guardada. Use o aviso no topo ou o menu para regressar.`,
    )
  ) {
    return
  }
  audit.add({
    action: 'auth.impersonate',
    message: `Personificação iniciada: ${auth.user.name} → ${u.name}`,
    level: 'warning',
    marked: true,
    detail: { fromUserId: auth.user.id, toUserId: u.id },
  })
  auth.startImpersonation(u)
  toast.success(`Sessão como ${u.name}.`)
  router.push({ name: 'dashboard' })
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

watch(primaryRole, (rid) => {
  if (dlg.value !== 'user' || !editing.value) return
  const u = editing.value as User
  if (rid === 'role-manager' || rid === 'role-supervisor') {
    if (!u.managedSectorIds?.length) u.managedSectorIds = [u.sectorId]
  } else {
    u.managedSectorIds = undefined
  }
})
</script>

<template>
  <div class="space-y-8 pb-1">
    <header class="space-y-2">
      <p class="text-primary text-[11px] font-semibold tracking-wider uppercase sm:text-xs">
        Estrutura
      </p>
      <h1 class="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
        Organização
      </h1>
      <p class="text-muted-foreground max-w-2xl text-sm leading-relaxed sm:text-base">
        Diretorias, setores e pessoas. Criar ou editar depende das suas permissões de gestão ou administração.
      </p>
    </header>

    <Tabs default-value="dir" class="w-full space-y-4">
      <TabsList
        class="bg-muted/40 ring-border/60 h-auto w-full max-w-full flex-wrap justify-stretch gap-1 rounded-xl p-1 ring-1 sm:w-fit sm:flex-nowrap"
      >
        <TabsTrigger
          class="data-[state=active]:bg-card data-[state=active]:shadow-sm min-h-11 flex-1 rounded-lg sm:flex-none sm:px-5"
          value="dir"
        >
          Diretorias
        </TabsTrigger>
        <TabsTrigger
          class="data-[state=active]:bg-card data-[state=active]:shadow-sm min-h-11 flex-1 rounded-lg sm:flex-none sm:px-5"
          value="sec"
        >
          Setores
        </TabsTrigger>
        <TabsTrigger
          class="data-[state=active]:bg-card data-[state=active]:shadow-sm min-h-11 flex-1 rounded-lg sm:flex-none sm:px-5"
          value="usr"
        >
          Usuários
        </TabsTrigger>
      </TabsList>

      <TabsContent value="dir" class="space-y-3">
        <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            v-if="can('org.manage')"
            type="button"
            size="lg"
            class="min-h-12 w-full shadow-sm sm:min-h-11 sm:w-auto"
            @click="openDir()"
          >
            <Plus class="size-4" />
            Nova diretoria
          </Button>
        </div>
        <div class="space-y-3 lg:hidden">
          <Card v-for="d in org.directorates" :key="d.id" class="rounded-2xl border-border/80 shadow-sm">
            <CardContent class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div class="min-w-0">
                <p class="text-muted-foreground font-mono text-xs">
                  {{ d.code }}
                </p>
                <p class="font-medium leading-snug">
                  {{ d.name }}
                </p>
              </div>
              <Button
                v-if="can('org.manage')"
                variant="secondary"
                type="button"
                class="min-h-11 w-full shrink-0 sm:min-h-9 sm:w-auto"
                @click="openDir(d)"
              >
                Editar
              </Button>
            </CardContent>
          </Card>
        </div>
        <div class="hidden overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-sm lg:block">
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

      <TabsContent value="sec" class="space-y-3">
        <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            v-if="can('org.manage')"
            type="button"
            size="lg"
            class="min-h-12 w-full shadow-sm sm:min-h-11 sm:w-auto"
            @click="openSector()"
          >
            <Plus class="size-4" />
            Novo setor
          </Button>
        </div>
        <div class="space-y-3 lg:hidden">
          <Card v-for="s in org.sectors" :key="s.id" class="rounded-2xl border-border/80 shadow-sm">
            <CardContent class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div class="min-w-0 space-y-1">
                <p class="text-muted-foreground font-mono text-xs">
                  {{ s.code }}
                </p>
                <p class="font-medium leading-snug">
                  {{ s.name }}
                </p>
                <p class="text-muted-foreground text-sm">
                  {{ org.directorateName(s.directorateId) }}
                </p>
              </div>
              <Button
                v-if="can('org.manage')"
                variant="secondary"
                type="button"
                class="min-h-11 w-full shrink-0 sm:min-h-9 sm:w-auto"
                @click="openSector(s)"
              >
                Editar
              </Button>
            </CardContent>
          </Card>
        </div>
        <div class="hidden overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-sm lg:block">
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

      <TabsContent value="usr" class="space-y-3">
        <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            v-if="can('org.manage') || can('admin.users')"
            type="button"
            size="lg"
            class="min-h-12 w-full shadow-sm sm:min-h-11 sm:w-auto"
            @click="openUser()"
          >
            <Plus class="size-4" />
            Novo usuário
          </Button>
        </div>
        <div class="space-y-3 lg:hidden">
          <Card v-for="u in org.users" :key="u.id" class="rounded-2xl border-border/80 shadow-sm">
            <CardContent class="flex flex-col gap-4 p-4">
              <div class="min-w-0 space-y-2">
                <p class="font-medium leading-snug">
                  {{ u.name }}
                </p>
                <p class="text-muted-foreground break-all text-sm">
                  {{ u.email }}
                </p>
                <p class="text-muted-foreground text-sm text-pretty">
                  {{ papelLabels(u) }}
                </p>
                <div class="text-sm">
                  <span class="text-muted-foreground">Setor: </span>{{ org.sectorName(u.sectorId) }}
                </div>
                <div class="text-sm">
                  <span class="text-muted-foreground">Diretoria: </span>{{ org.directorateName(u.directorateId) }}
                </div>
              </div>
              <div class="flex flex-col gap-2 sm:flex-row">
                <Button
                  v-if="can('org.manage') || can('admin.users')"
                  variant="secondary"
                  type="button"
                  class="min-h-11 flex-1 sm:min-h-9"
                  @click="openUser(u)"
                >
                  Editar
                </Button>
                <Button
                  v-if="can('admin.users')"
                  type="button"
                  variant="outline"
                  class="min-h-11 flex-1 gap-2 border-dashed sm:min-h-9"
                  @click="accessAsUser(u)"
                >
                  <LogIn class="size-4 shrink-0" />
                  Acessar como
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <div class="hidden overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-sm lg:block">
          <Table class="min-w-[52rem]">
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Diretoria</TableHead>
                <TableHead class="min-w-[10rem] text-right">
                  Ações
                </TableHead>
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
                  <div class="flex flex-wrap justify-end gap-1">
                    <Button
                      v-if="can('org.manage') || can('admin.users')"
                      variant="ghost"
                      size="sm"
                      type="button"
                      class="min-h-9"
                      @click="openUser(u)"
                    >
                      Editar
                    </Button>
                    <Button
                      v-if="can('admin.users')"
                      variant="outline"
                      size="sm"
                      type="button"
                      class="min-h-9 gap-1 border-dashed px-2"
                      @click="accessAsUser(u)"
                    >
                      <LogIn class="size-3.5 shrink-0" />
                      Acessar como
                    </Button>
                  </div>
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
              <NativeSelectOption v-for="r in rolesStore.roles" :key="r.id" :value="r.id">
                {{ r.name }}
              </NativeSelectOption>
            </NativeSelect>
          </div>
          <div
            v-if="primaryRole === 'role-manager' || primaryRole === 'role-supervisor'"
            class="grid gap-2"
          >
            <Label>Setores geridos</Label>
            <p class="text-muted-foreground text-xs leading-relaxed">
              Marque os setores desta diretoria que este utilizador coordena (vazio usa só o setor principal).
            </p>
            <div class="flex max-h-40 flex-col gap-2 overflow-y-auto rounded-lg border p-3">
              <label
                v-for="s in sectorsForManagedEditor"
                :key="s.id"
                class="flex cursor-pointer items-center gap-2 text-sm"
              >
                <Checkbox
                  :checked="managedSectorChecked(s.id)"
                  class="shrink-0"
                  @update:checked="(v: boolean) => setManagedSector(s.id, v)"
                />
                <span>{{ s.name }}</span>
              </label>
            </div>
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
