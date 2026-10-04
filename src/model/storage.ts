import type { TableDocument } from './document.ts'
import { emptyView } from './document.ts'
import type { FieldDef, FieldOption, FieldType, RowData } from './table.ts'
import { cellText, defaultValue, parseLinkValue, parseMultiValue } from './table.ts'

export const STORAGE_KEY = 'dim-grid.document'
export const STORAGE_VERSION = 2
const fieldTypes = new Set([
  'text',
  'number',
  'float',
  'select',
  'multi_select',
  'link',
  'date',
  'checkbox',
  'email',
  'rating',
  'progress',
  'created_time',
  'modified_time',
])
const reserved = new Set(['id', '__cellColors', '__proto__', 'prototype', 'constructor'])
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)
const fail = (): never => {
  throw new Error('保存的数据格式无效，请先导出备份。')
}
const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

export function serializeDocument(doc: TableDocument): string {
  return JSON.stringify({
    version: STORAGE_VERSION,
    fields: doc.fields,
    rows: doc.rows.map((row) =>
      Object.fromEntries([
        ['id', row.id],
        ...(row.__cellColors ? [['__cellColors', row.__cellColors]] : []),
        ...doc.fields.map((field) => {
          const value = row[field.id]
          return [
            field.id,
            field.type === 'date'
              ? cellText(value, field) || null
              : field.type === 'multi_select'
                ? parseMultiValue(value)
                : field.type === 'link'
                  ? parseLinkValue(value)
                  : (value ?? defaultValue(field.type)),
          ]
        }),
      ]),
    ),
    view: {
      ...doc.view,
      hiddenFields: [...doc.view.hiddenFields],
      highlightDupes: [...doc.view.highlightDupes],
      groupBy: { fieldId: doc.view.groupBy.fieldId, collapsed: [...doc.view.groupBy.collapsed] },
    },
  })
}

export function deserializeDocument(raw: string): TableDocument {
  const data: unknown = JSON.parse(raw)
  if (!record(data)) return fail()
  if (data.version !== 1 && data.version !== STORAGE_VERSION)
    throw new Error('此备份的版本暂不支持，请导出保留原文件。')
  if (!Array.isArray(data.fields) || !Array.isArray(data.rows)) return fail()
  const ids = new Set<string>()
  const fields: FieldDef[] = data.fields.map((field) => {
    if (
      !record(field) ||
      typeof field.id !== 'string' ||
      !field.id ||
      reserved.has(field.id) ||
      ids.has(field.id) ||
      typeof field.label !== 'string' ||
      !field.label.trim() ||
      typeof field.type !== 'string' ||
      !fieldTypes.has(field.type) ||
      (field.width !== undefined &&
        (typeof field.width !== 'number' || !Number.isInteger(field.width) || field.width < 60 || field.width > 1200))
    )
      return fail()
    ids.add(field.id)
    const optionIds = new Set<string>()
    const labels = new Set<string>()
    const options: FieldOption[] | undefined = Array.isArray(field.options)
      ? field.options.map((option, index) => {
          if (
            !record(option) ||
            typeof option.label !== 'string' ||
            !option.label ||
            labels.has(option.label) ||
            typeof option.color !== 'string' ||
            typeof option.textColor !== 'string'
          )
            return fail()
          const id = typeof option.id === 'string' && option.id ? option.id : `${field.id}-option-${index}`
          if (optionIds.has(id)) return fail()
          optionIds.add(id)
          labels.add(option.label)
          return { id, label: option.label, color: option.color, textColor: option.textColor }
        })
      : undefined
    return {
      id: field.id,
      label: field.label,
      type: field.type as FieldType,
      ...(options ? { options } : {}),
      ...(field.width !== undefined ? { width: field.width } : {}),
    }
  })
  const rowIds = new Set<string>()
  const rows: RowData[] = data.rows.map((source, index) => {
    if (!record(source)) return fail()
    const id =
      typeof source.id === 'string' && source.id ? source.id : data.version === 1 ? `migrated-row-${index}` : fail()
    if (rowIds.has(id)) return fail()
    rowIds.add(id)
    const row: RowData = { id }
    if (source.__cellColors !== undefined) {
      if (!record(source.__cellColors)) return fail()
      const colors: Record<string, string> = {}
      for (const [fieldId, color] of Object.entries(source.__cellColors)) {
        if (!ids.has(fieldId) || typeof color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(color)) return fail()
        colors[fieldId] = color
      }
      if (Object.keys(colors).length) row.__cellColors = colors
    }
    for (const field of fields) {
      const value = source[field.id] ?? defaultValue(field.type)
      if (field.type === 'date') {
        if (value === null || value === '') row[field.id] = null
        else {
          if (typeof value !== 'string') return fail()
          const dateOnly = data.version === 1 && value.includes('T') ? cellText(new Date(value)) : value
          const date = new Date(`${dateOnly}T00:00:00`)
          if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly) || cellText(date) !== dateOnly) return fail()
          row[field.id] = date
        }
      } else if (field.type === 'multi_select') {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value
        if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) return fail()
        row[field.id] = JSON.stringify([...new Set(parsed)])
      } else if (field.type === 'link') {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value
        if (
          !record(parsed) ||
          (parsed.text !== undefined && typeof parsed.text !== 'string') ||
          (parsed.link !== undefined && typeof parsed.link !== 'string')
        )
          return fail()
        row[field.id] = JSON.stringify(parseLinkValue(parsed))
      } else if (field.type === 'checkbox') {
        if (typeof value !== 'boolean') return fail()
        row[field.id] = value
      } else if (field.type === 'created_time' || field.type === 'modified_time') {
        if (
          value !== null &&
          (typeof value !== 'string' || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value)
        )
          return fail()
        row[field.id] = value
      } else if (['number', 'float'].includes(field.type)) {
        if (value !== null && (typeof value !== 'number' || !Number.isFinite(value))) return fail()
        row[field.id] = value
      } else {
        if (typeof value !== 'string' && typeof value !== 'number') return fail()
        row[field.id] = String(value)
      }
    }
    return row
  })
  const view = emptyView()
  const saved = record(data.view) ? data.view : {}
  if (typeof saved.name === 'string' && saved.name.trim()) view.name = saved.name.trim().slice(0, 60)
  if (saved.rowHeight === 'low' || saved.rowHeight === 'medium' || saved.rowHeight === 'high')
    view.rowHeight = saved.rowHeight
  view.pinnedFieldId =
    typeof saved.pinnedFieldId === 'string' && ids.has(saved.pinnedFieldId) ? saved.pinnedFieldId : ''
  view.hiddenFields = new Set(strings(saved.hiddenFields).filter((id) => ids.has(id)))
  view.highlightDupes = new Set(strings(saved.highlightDupes).filter((id) => ids.has(id)))
  if (record(saved.groupBy) && typeof saved.groupBy.fieldId === 'string' && ids.has(saved.groupBy.fieldId)) {
    view.groupBy = { fieldId: saved.groupBy.fieldId, collapsed: new Set(strings(saved.groupBy.collapsed)) }
  }
  if (Array.isArray(saved.filters))
    view.filters = saved.filters.flatMap((item) =>
      record(item) &&
      typeof item.id === 'string' &&
      typeof item.fieldId === 'string' &&
      ids.has(item.fieldId) &&
      typeof item.op === 'string' &&
      ['contains', 'not_contains', 'equals', 'not_equals', 'empty', 'not_empty'].includes(item.op) &&
      typeof item.value === 'string'
        ? [{ id: item.id, fieldId: item.fieldId, op: item.op, value: item.value }]
        : [],
    )
  if (Array.isArray(saved.sorts))
    view.sorts = saved.sorts.flatMap((item) =>
      record(item) &&
      typeof item.id === 'string' &&
      typeof item.fieldId === 'string' &&
      ids.has(item.fieldId) &&
      (item.dir === 'asc' || item.dir === 'desc')
        ? [{ id: item.id, fieldId: item.fieldId, dir: item.dir }]
        : [],
    )
  if (record(saved.colStats))
    view.colStats = Object.fromEntries(
      Object.entries(saved.colStats).filter(([id, value]) => ids.has(id) && typeof value === 'string'),
    ) as Record<string, string>
  return { fields, rows, view }
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}
export type LoadResult = {
  document: TableDocument
  error: string | null
  writable: boolean
  recoveryRaw: string | null
}
export function loadDocument(storage: StorageLike, fallback: TableDocument): LoadResult {
  let raw: string | null = null
  try {
    raw = storage.getItem(STORAGE_KEY)
    return { document: raw ? deserializeDocument(raw) : fallback, error: null, writable: true, recoveryRaw: null }
  } catch (error) {
    return {
      document: fallback,
      error: error instanceof Error ? error.message : '无法读取本地保存。',
      writable: false,
      recoveryRaw: raw,
    }
  }
}

export function saveDocument(storage: StorageLike, document: TableDocument): string | null {
  try {
    storage.setItem(STORAGE_KEY, serializeDocument(document))
    return null
  } catch {
    return '本地保存失败（可能是空间不足或浏览器限制），请导出备份。'
  }
}
