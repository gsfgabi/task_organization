<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { permissionLabels } from '@/lib/labels'
import { useRolesStore } from '@/stores/roles'
import { PERMISSIONS, type PermissionKey } from '@/types'
import { toast } from 'vue-sonner'

const roles = useRolesStore()

function toggle(roleId: string, key: PermissionKey, checked: boolean) {
  const r = roles.roleById(roleId)
  if (!r) return
  const set = new Set(r.permissionKeys)
  if (checked) set.add(key)
  else set.delete(key)
  roles.setRolePermissions(roleId, [...set])
  toast.success('Permissões atualizadas (mock).')
}
</script>

<template>
  <div class="space-y-5 sm:space-y-6">
    <p class="text-muted-foreground text-sm leading-relaxed sm:text-base">
      Matriz editável no front; o backend C# deve persistir e validar as mesmas chaves de permissão.
    </p>

    <div class="grid gap-3 sm:grid-cols-2">
      <Card v-for="r in roles.roles" :key="r.id">
        <CardHeader>
          <CardTitle class="text-base">{{ r.name }}</CardTitle>
          <CardDescription>{{ r.description }}</CardDescription>
        </CardHeader>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">Matriz permissão × papel</CardTitle>
        <CardDescription>
          Marque o que cada papel pode fazer. As chaves devem coincidir com a API.
        </CardDescription>
      </CardHeader>
      <CardContent class="p-0">
        <ScrollArea class="h-[min(65dvh,520px)] w-full sm:h-[min(70vh,560px)]">
          <Table class="min-w-[520px]">
            <TableHeader>
              <TableRow>
                <TableHead class="sticky left-0 z-10 min-w-[200px] bg-card">
                  Permissão
                </TableHead>
                <TableHead
                  v-for="r in roles.roles"
                  :key="r.id"
                  class="min-w-[100px] text-center"
                >
                  {{ r.name }}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="key in PERMISSIONS" :key="key">
                <TableCell class="bg-card sticky left-0 z-10">
                  <div class="font-medium">
                    {{ permissionLabels[key] ?? key }}
                  </div>
                  <div class="text-muted-foreground font-mono text-[10px]">
                    {{ key }}
                  </div>
                </TableCell>
                <TableCell
                  v-for="r in roles.roles"
                  :key="r.id"
                  class="p-2 text-center sm:p-4"
                >
                  <div class="flex min-h-11 items-center justify-center sm:min-h-9">
                    <Checkbox
                      :checked="r.permissionKeys.includes(key)"
                      @update:checked="(v: boolean) => toggle(r.id, key, v)"
                    />
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  </div>
</template>
