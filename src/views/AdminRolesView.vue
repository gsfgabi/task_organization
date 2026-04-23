<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
  toast.success('Permissões atualizadas.')
}
</script>

<template>
  <div class="space-y-8 pb-1">
    <header class="space-y-2">
      <p class="text-primary text-[11px] font-semibold tracking-wider uppercase sm:text-xs">
        Administração
      </p>
      <h1 class="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
        Papéis e permissões
      </h1>
      <p class="text-muted-foreground max-w-2xl text-sm leading-relaxed sm:text-base">
        Marque ou desmarque as permissões de cada papel.
      </p>
    </header>

    <Card class="overflow-hidden rounded-2xl border-border/80 shadow-sm">
      <CardHeader class="space-y-1 pb-4">
        <CardTitle class="text-lg">Permissões</CardTitle>
        <CardDescription class="text-pretty leading-relaxed">
          Uma linha por permissão; marque ou desmarque por coluna (papel).
        </CardDescription>
      </CardHeader>
      <CardContent class="p-0">
        <ScrollArea class="h-[min(65dvh,520px)] w-full sm:h-[min(70vh,560px)]">
          <div class="overflow-x-auto p-2 sm:p-4">
            <table class="caption-bottom w-full min-w-[520px] text-sm">
              <TableHeader
                class="bg-card sticky top-0 z-20 shadow-[0_1px_0_0_hsl(var(--border))]"
              >
                <TableRow class="bg-card hover:bg-transparent">
                  <TableHead
                    class="bg-card sticky top-0 left-0 z-30 min-w-[11rem] border-b sm:min-w-[200px]"
                  >
                    Permissão
                  </TableHead>
                  <TableHead
                    v-for="r in roles.roles"
                    :key="r.id"
                    class="bg-card sticky top-0 z-20 min-w-[100px] border-b text-center"
                  >
                    {{ r.name }}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="key in PERMISSIONS" :key="key">
                  <TableCell class="bg-card sticky left-0 z-10 border-b border-border/60">
                    <span class="font-medium">{{ permissionLabels[key] ?? key }}</span>
                  </TableCell>
                  <TableCell
                    v-for="r in roles.roles"
                    :key="r.id"
                    class="border-b border-border/60 p-2 text-center sm:p-4"
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
            </table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  </div>
</template>
