export interface FieldOption {
  id?: string
  label: string
  color: string
  textColor: string
}

export type FieldType =
  | 'text'
  | 'number'
  | 'float'
  | 'select'
  | 'multi_select'
  | 'link'
  | 'date'
  | 'checkbox'
  | 'email'
  | 'rating'
  | 'progress'
export interface FieldDef {
  id: string
  label: string
  type: FieldType
  options?: FieldOption[]
}
export interface RowData {
  id: string
  [key: string]: unknown
}
export interface SortItem {
  id: string
  fieldId: string
  dir: 'asc' | 'desc'
}
export interface FilterItem {
  id: string
  fieldId: string
  op: string
  value: string
}
export interface GroupByState {
  fieldId: string
  collapsed: Set<string>
}
export interface ModalState {
  mode: 'add' | 'edit'
  fieldId?: string
}

export const newId = (): string => crypto.randomUUID()

export function parseMultiValue(value: unknown): string[] {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

export function parseLinkValue(value: unknown): { text: string; link: string } {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return {
      text: typeof parsed?.text === 'string' ? parsed.text : '',
      link: typeof parsed?.link === 'string' ? parsed.link : '',
    }
  } catch {
    return { text: '', link: '' }
  }
}

export function safeLink(value: string): string | null {
  try {
    const url = new URL(value)
    return ['https:', 'http:', 'mailto:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

export function cellText(value: unknown, field?: FieldDef): string {
  if (value == null) return ''
  if (field?.type === 'multi_select') return [...new Set(parseMultiValue(value))].sort().join(', ')
  if (field?.type === 'link') {
    const { text, link } = parseLinkValue(value)
    return [text, link].filter(Boolean).join(' ')
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
  }
  return String(value)
}

export function isEmptyValue(value: unknown, field?: FieldDef): boolean {
  return value == null || value === '' || value === false || cellText(value, field) === ''
}

export function defaultValue(type: FieldType): unknown {
  if (type === 'checkbox') return false
  if (type === 'multi_select') return '[]'
  if (type === 'link') return '{}'
  if (['date', 'number', 'float'].includes(type)) return null
  return ''
}

export function createRow(fields: FieldDef[]): RowData {
  return Object.fromEntries([
    ['id', newId()],
    ...fields.map((field) => [field.id, defaultValue(field.type)]),
  ]) as RowData
}

export function duplicateRow(row: RowData): RowData {
  return { ...row, id: newId() }
}

// Reconcile a filtered, sorted or grouped view by identity, never by its display index.
export function reconcileRows(allRows: RowData[], before: RowData[], after: RowData[]): RowData[] {
  const beforeIds = new Set(before.map((row) => row.id))
  const afterMap = new Map(after.map((row) => [row.id, row]))
  const existingIds = new Set(allRows.map((row) => row.id))
  const result = allRows
    .filter((row) => !beforeIds.has(row.id) || afterMap.has(row.id))
    .map((row) => afterMap.get(row.id) ?? row)
  const insertions = new Map<string | undefined, RowData[]>()
  let anchor: string | undefined
  for (const row of after) {
    if (existingIds.has(row.id)) anchor = row.id
    else {
      const bucket = insertions.get(anchor) ?? []
      bucket.push(row)
      insertions.set(anchor, bucket)
    }
  }
  const merged = [...(insertions.get(undefined) ?? [])]
  for (const row of result) merged.push(row, ...(insertions.get(row.id) ?? []))
  return merged.length === allRows.length && merged.every((row, index) => row === allRows[index]) ? allRows : merged
}

export function processRows(
  rows: RowData[],
  fields: FieldDef[],
  filters: FilterItem[],
  sorts: SortItem[],
  search: string,
): RowData[] {
  const fieldMap = new Map(fields.map((field) => [field.id, field]))
  const query = search.trim().toLocaleLowerCase()
  const result = rows.filter((row) => {
    for (const { fieldId, op, value } of filters) {
      const field = fieldMap.get(fieldId)
      if (!field) continue
      const empty = isEmptyValue(row[fieldId], field)
      if (op === 'empty') {
        if (!empty) return false
        continue
      }
      if (op === 'not_empty') {
        if (empty) return false
        continue
      }
      if (!value) continue
      const text = cellText(row[fieldId], field).toLocaleLowerCase()
      const target = value.toLocaleLowerCase()
      if (op === 'contains' && !text.includes(target)) return false
      if (op === 'not_contains' && text.includes(target)) return false
      if (op === 'equals' && text !== target) return false
      if (op === 'not_equals' && text === target) return false
    }
    return !query || fields.some((field) => cellText(row[field.id], field).toLocaleLowerCase().includes(query))
  })
  if (sorts.length)
    result.sort((a, b) => {
      for (const { fieldId, dir } of sorts) {
        const field = fieldMap.get(fieldId)
        if (!field) continue
        const va = a[fieldId]
        const vb = b[fieldId]
        const emptyA = isEmptyValue(va, field)
        const emptyB = isEmptyValue(vb, field)
        if (emptyA !== emptyB) return emptyA ? 1 : -1
        if (emptyA) continue
        let cmp: number
        if (['number', 'float', 'rating', 'progress'].includes(field.type)) cmp = Number(va) - Number(vb)
        else if (field.type === 'date') cmp = new Date(va as string).getTime() - new Date(vb as string).getTime()
        else cmp = cellText(va, field).localeCompare(cellText(vb, field), 'zh', { numeric: true })
        if (cmp && Number.isFinite(cmp)) return dir === 'asc' ? cmp : -cmp
      }
      return 0
    })
  return result
}

export function convertValue(value: unknown, from: FieldDef, to: FieldDef): unknown {
  const renameOption = (label: string) => {
    const oldOption = from.options?.find((option) => option.label === label)
    return (oldOption?.id && to.options?.find((option) => option.id === oldOption.id)?.label) || label
  }
  if (from.type === to.type) {
    if (to.type === 'select') return renameOption(String(value ?? ''))
    if (to.type === 'multi_select') return JSON.stringify(parseMultiValue(value).map(renameOption))
    return value
  }
  const text = cellText(value, from)
  if (!text) return defaultValue(to.type)
  switch (to.type) {
    case 'number':
    case 'float':
    case 'rating':
    case 'progress': {
      const n = Number(text)
      if (!Number.isFinite(n)) return defaultValue(to.type)
      if (to.type === 'rating') return String(Math.max(0, Math.min(5, Math.round(n))))
      if (to.type === 'progress') return String(Math.max(0, Math.min(100, Math.round(n))))
      return to.type === 'number' ? Math.trunc(n) : n
    }
    case 'date': {
      const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00` : text)
      return Number.isNaN(date.getTime()) || (/^\d{4}-\d{2}-\d{2}$/.test(text) && cellText(date) !== text) ? null : date
    }
    case 'checkbox':
      return ['true', '1', '是'].includes(text.toLowerCase())
    case 'multi_select':
      return JSON.stringify(
        text
          .split(',')
          .map((s) => s.trim())
          .filter((s) => to.options?.some((o) => o.label === s)),
      )
    case 'select':
      return to.options?.some((o) => o.label === text) ? text : ''
    case 'link':
      return JSON.stringify({ text, link: safeLink(text) ?? '' })
    default:
      return text
  }
}

export function duplicateValues(rows: RowData[], fields: FieldDef[], enabled: Set<string>): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>()
  for (const field of fields) {
    if (!enabled.has(field.id)) continue
    const seen = new Set<string>()
    const duplicates = new Set<string>()
    for (const row of rows) {
      if (isEmptyValue(row[field.id], field)) continue
      const value = cellText(row[field.id], field)
      if (seen.has(value)) duplicates.add(value)
      seen.add(value)
    }
    result.set(field.id, duplicates)
  }
  return result
}

export function calcStat(stat: string, rows: RowData[], field: FieldDef): number | string | null {
  const filled = rows.filter((row) => !isEmptyValue(row[field.id], field))
  const unique = new Set(filled.map((row) => cellText(row[field.id], field))).size
  const pct = (n: number) => `${rows.length ? Math.round((n / rows.length) * 100) : 0}%`
  switch (stat) {
    case '记录总数':
      return rows.length
    case '已填写数':
      return filled.length
    case '未填写数':
      return rows.length - filled.length
    case '唯一数':
      return unique
    case '已填写占比':
      return pct(filled.length)
    case '未填写占比':
      return pct(rows.length - filled.length)
    case '唯一数占比':
      return pct(unique)
    default:
      return null
  }
}

export function normalizeEmail(value: string): string | null {
  const email = value.trim()
  return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) ? email : null
}
