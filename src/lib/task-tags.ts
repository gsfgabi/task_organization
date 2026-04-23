export const TASK_TAG_PRESETS = [
  { id: 'discovery', label: 'Discovery / levantamento' },
  { id: 'prioridade', label: 'Alta prioridade' },
  { id: 'frontend', label: 'Frontend' },
  { id: 'backend', label: 'Backend' },
  { id: 'infra', label: 'Infraestrutura' },
  { id: 'seguranca', label: 'Segurança' },
  { id: 'documentacao', label: 'Documentação' },
  { id: 'dados', label: 'Dados / BI' },
  { id: 'ux', label: 'UX / UI' },
  { id: 'integracao', label: 'Integração' },
  { id: 'relatorios', label: 'Relatórios' },
  { id: 'operacoes', label: 'Operações' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'rh', label: 'RH' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'cliente', label: 'Cliente / suporte' },
  { id: 'inventario', label: 'Inventário' },
  { id: 'bugfix', label: 'Correção (bugfix)' },
  { id: 'melhoria', label: 'Melhoria contínua' },
] as const

export type PresetTaskTagId = (typeof TASK_TAG_PRESETS)[number]['id']

const PRESET_IDS = new Set<string>(TASK_TAG_PRESETS.map((p) => p.id))

export function isPresetTaskTag(id: string): boolean {
  return PRESET_IDS.has(id)
}

export function labelForPresetTag(id: string): string {
  const p = TASK_TAG_PRESETS.find((x) => x.id === id)
  return p?.label ?? id
}
