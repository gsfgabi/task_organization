import type {
  Directorate,
  PermissionKey,
  Role,
  Sector,
  TaskItem,
  TimeEntry,
  User,
} from '@/types'

const emptyTaskExtras = {
  checklist: [] as TaskItem['checklist'],
  attachments: [] as TaskItem['attachments'],
}

const allPerms: PermissionKey[] = [
  'tasks.read',
  'tasks.create',
  'tasks.update',
  'tasks.delete',
  'time.read',
  'time.create',
  'time.update',
  'time.delete',
  'org.read',
  'org.manage',
  'admin.users',
  'admin.roles',
  'reports.read',
  'reports.export',
  'audit.read',
]

const directorPerms: PermissionKey[] = allPerms.filter(
  (k) => k !== 'admin.roles' && k !== 'admin.users',
)

const managerPerms: PermissionKey[] = [
  'tasks.read',
  'tasks.create',
  'tasks.update',
  'tasks.delete',
  'time.read',
  'time.create',
  'time.update',
  'org.read',
  'reports.read',
  'reports.export',
]

export const seedRoles: Role[] = [
  {
    id: 'role-admin',
    name: 'Administrador',
    description: 'Acesso total ao sistema.',
    permissionKeys: [...allPerms],
  },
  {
    id: 'role-director',
    name: 'Diretor',
    description:
      'Visão global: organização, auditoria e relatórios relativos à diretoria à qual está associado.',
    permissionKeys: [...directorPerms],
  },
  {
    id: 'role-manager',
    name: 'Gerente',
    description:
      'Gere os setores vinculados a si, tarefas, tempo e exportação de relatórios nesse âmbito.',
    permissionKeys: [...managerPerms],
  },
  {
    id: 'role-supervisor',
    name: 'Supervisor',
    description:
      'Acompanha execução e relatórios no setor a que está vinculado; pode criar e editar tarefas, sem eliminar.',
    permissionKeys: [
      'tasks.read',
      'tasks.create',
      'tasks.update',
      'time.read',
      'time.create',
      'time.update',
      'org.read',
      'reports.read',
      'reports.export',
    ],
  },
  {
    id: 'role-member',
    name: 'Colaborador',
    description:
      'Cria, edita e elimina apenas as tarefas atribuídas a si; regista tempo sobre elas. Respeita a hierarquia (coordenação acima na estrutura).',
    permissionKeys: [
      'tasks.read',
      'tasks.create',
      'tasks.update',
      'tasks.delete',
      'time.read',
      'time.create',
      'time.update',
      'org.read',
      'reports.read',
    ],
  },
  {
    id: 'role-viewer',
    name: 'Visualizador',
    description: 'Somente leitura de tarefas e relatórios.',
    permissionKeys: ['tasks.read', 'time.read', 'org.read', 'reports.read'],
  },
]

export const seedDirectorates: Directorate[] = [
  { id: 'dir-tech', name: 'Diretoria de Tecnologia', code: 'DTI' },
  { id: 'dir-ops', name: 'Diretoria de Operações', code: 'DO' },
]

export const seedSectors: Sector[] = [
  { id: 'sec-dev', name: 'Desenvolvimento', code: 'DEV', directorateId: 'dir-tech' },
  { id: 'sec-qa', name: 'Qualidade', code: 'QA', directorateId: 'dir-tech' },
  { id: 'sec-log', name: 'Logística', code: 'LOG', directorateId: 'dir-ops' },
  { id: 'sec-fin', name: 'Financeiro', code: 'FIN', directorateId: 'dir-ops' },
]

export const SEED_DEMO_LOGIN_PASSWORD = 'Demo123!'

export const seedUsers: User[] = [
  {
    id: 'u-1',
    name: 'Ana Silva',
    email: 'ana.silva@empresa.com',
    roleIds: ['role-admin'],
    sectorId: 'sec-dev',
    directorateId: 'dir-tech',
    active: true,
  },
  {
    id: 'u-2',
    name: 'Bruno Costa',
    email: 'bruno.costa@empresa.com',
    roleIds: ['role-manager'],
    sectorId: 'sec-dev',
    managedSectorIds: ['sec-dev', 'sec-qa'],
    directorateId: 'dir-tech',
    active: true,
  },
  {
    id: 'u-3',
    name: 'Carla Mendes',
    email: 'carla.mendes@empresa.com',
    roleIds: ['role-member'],
    sectorId: 'sec-qa',
    directorateId: 'dir-tech',
    active: true,
  },
  {
    id: 'u-4',
    name: 'Diego Lima',
    email: 'diego.lima@empresa.com',
    roleIds: ['role-viewer'],
    sectorId: 'sec-log',
    directorateId: 'dir-ops',
    active: true,
  },
  {
    id: 'u-5',
    name: 'Elena Ribeiro',
    email: 'elena.ribeiro@empresa.com',
    roleIds: ['role-director'],
    sectorId: 'sec-fin',
    directorateId: 'dir-ops',
    active: true,
  },
  {
    id: 'u-6',
    name: 'Francisco Alves',
    email: 'francisco.alves@empresa.com',
    roleIds: ['role-supervisor'],
    sectorId: 'sec-dev',
    managedSectorIds: ['sec-dev'],
    directorateId: 'dir-tech',
    active: true,
  },
]

const now = new Date().toISOString()

export const seedTasks: TaskItem[] = [
  {
    id: 't-1',
    title: 'Mapear requisitos do módulo de tempo',
    description: 'Levantar regras de negócio com stakeholders.',
    status: 'in_progress',
    difficulty: 'medium',
    priority: 'high',
    assigneeId: 'u-2',
    sectorId: 'sec-dev',
    directorateId: 'dir-tech',
    tags: ['discovery', 'prioridade', 'documentacao'],
    checklist: [
      { id: 'cl-t1-a', label: 'Agendar workshop com stakeholders', done: true },
      { id: 'cl-t1-b', label: 'Documentar regras de negócio', done: false },
      { id: 'cl-t1-c', label: 'Validar escopo com gestor', done: false },
    ],
    attachments: [],
    estimatedHours: 16,
    loggedHours: 6,
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 't-2',
    title: 'Implementar exportação CSV de relatórios',
    description: 'Front gera CSV; backend pode assinar URL depois.',
    status: 'todo',
    difficulty: 'easy',
    priority: 'medium',
    assigneeId: 'u-3',
    sectorId: 'sec-qa',
    directorateId: 'dir-tech',
    tags: ['frontend'],
    ...emptyTaskExtras,
    estimatedHours: 8,
    loggedHours: 0,
    dueDate: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 't-3',
    title: 'Revisar política de permissões RBAC',
    description: 'Alinhar matriz com equipe de segurança.',
    status: 'review',
    difficulty: 'hard',
    priority: 'urgent',
    assigneeId: 'u-1',
    sectorId: 'sec-dev',
    directorateId: 'dir-tech',
    tags: ['seguranca', 'compliance'],
    ...emptyTaskExtras,
    estimatedHours: 12,
    loggedHours: 10,
    dueDate: new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10),
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 't-4',
    title: 'Auditoria de inventário Q1',
    description: 'Conferência física x sistema.',
    status: 'done',
    difficulty: 'epic',
    priority: 'low',
    assigneeId: 'u-4',
    sectorId: 'sec-log',
    directorateId: 'dir-ops',
    tags: ['inventario', 'operacoes'],
    ...emptyTaskExtras,
    estimatedHours: 40,
    loggedHours: 38,
    dueDate: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
    createdAt: now,
    updatedAt: now,
  },
]

export const seedTimeEntries: TimeEntry[] = [
  {
    id: 'te-1',
    taskId: 't-1',
    userId: 'u-2',
    date: new Date().toISOString().slice(0, 10),
    hours: 4,
    note: 'Workshop com stakeholders',
    createdAt: now,
  },
  {
    id: 'te-2',
    taskId: 't-1',
    userId: 'u-2',
    date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    hours: 2,
    note: 'Documentação inicial',
    createdAt: now,
  },
  {
    id: 'te-3',
    taskId: 't-3',
    userId: 'u-1',
    date: new Date().toISOString().slice(0, 10),
    hours: 6,
    note: 'Revisão de matriz',
    createdAt: now,
  },
]
