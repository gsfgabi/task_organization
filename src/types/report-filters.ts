export type ReportKindId = 'person' | 'month' | 'semester' | 'sector' | 'directorate'

export interface ReportFiltersModel {
  reportKind: ReportKindId
  start: string
  end: string
  sectorFilter: string
  reportPersonUserIds: string[]
  reportDirectorateIds: string[]
  reportTagFilters: string[]
}

export interface ReportFiltersSnapshot extends ReportFiltersModel {}

export interface ReportPreset {
  id: string
  name: string
  snapshot: ReportFiltersSnapshot
}

export const REPORT_TYPE_OPTIONS: { id: ReportKindId; title: string; hint: string }[] = [
  { id: 'person', title: 'Por pessoa', hint: 'Colaborador' },
  { id: 'month', title: 'Por mês', hint: 'Agregado mensal' },
  { id: 'semester', title: 'Por semestre', hint: 'S1 / S2' },
  { id: 'sector', title: 'Por setor', hint: 'Tarefa' },
  { id: 'directorate', title: 'Por diretoria', hint: 'Tarefa' },
]
