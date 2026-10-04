import type { FieldDef, FilterItem, GroupByState, RowData, SortItem } from './table.ts'
import { convertValue, defaultValue, isTimestampField, newId, reconcileRows } from './table.ts'

export interface TableView {
  name: string
  pinnedFieldId: string
  filters: FilterItem[]
  sorts: SortItem[]
  groupBy: GroupByState
  hiddenFields: Set<string>
  highlightDupes: Set<string>
  colStats: Record<string, string>
}
export interface TableDocument {
  fields: FieldDef[]
  rows: RowData[]
  view: TableView
}
export const emptyView = (): TableView => ({
  name: '表格视图',
  pinnedFieldId: '',
  filters: [],
  sorts: [],
  groupBy: { fieldId: '', collapsed: new Set() },
  hiddenFields: new Set(),
  highlightDupes: new Set(),
  colStats: {},
})
export const initialDocument = (): TableDocument => ({
  fields: [
    { id: 'f1', label: '文本', type: 'text' },
    {
      id: 'f2',
      label: '单选',
      type: 'select',
      options: [
        { id: 'o1', label: '待开始', color: '#e8f8f0', textColor: '#0a6640' },
        { id: 'o2', label: '进行中', color: '#fef3d0', textColor: '#7a5800' },
        { id: 'o3', label: '已完成', color: '#e8f0fe', textColor: '#1a3a8f' },
      ],
    },
    { id: 'f3', label: '日期', type: 'date' },
  ],
  rows: [
    { id: 'r1', f1: '任务 A', f2: '进行中', f3: new Date('2024-03-15T00:00:00') },
    { id: 'r2', f1: '', f2: '', f3: null },
    { id: 'r3', f1: '', f2: '', f3: null },
  ],
  view: emptyView(),
})

export type TableCommand =
  | { type: 'document/replace'; document: TableDocument }
  | { type: 'field/save'; field: FieldDef; index?: number }
  | { type: 'field/delete'; id: string }
  | { type: 'field/duplicate'; id: string; newId: string }
  | { type: 'field/reorder'; fields: FieldDef[] }
  | { type: 'field/resize'; id: string; width: number }
  | { type: 'rows/change'; before: RowData[]; after: RowData[] }
  | { type: 'rows/add'; row: RowData }
  | { type: 'rows/move'; from: number; to: number }
  | { type: 'view/change'; update: (view: TableView) => TableView }

function withNewTimestamps(row: RowData, fields: FieldDef[], now: string): RowData {
  const next = { ...row }
  for (const field of fields) if (isTimestampField(field.type)) next[field.id] = now
  return next
}

function sameValue(a: unknown, b: unknown): boolean {
  return a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : Object.is(a, b)
}

export function applyCommand(doc: TableDocument, command: TableCommand): TableDocument {
  switch (command.type) {
    case 'document/replace':
      return command.document
    case 'field/save': {
      const old = doc.fields.find((field) => field.id === command.field.id)
      const fields = [...doc.fields]
      const now = new Date().toISOString()
      if (old) fields[fields.indexOf(old)] = command.field
      else fields.splice(command.index ?? fields.length, 0, command.field)
      const needsConversion =
        !old ||
        old.type !== command.field.type ||
        ((old.type === 'select' || old.type === 'multi_select') &&
          old.options?.some((option) =>
            command.field.options?.some((next) => next.id === option.id && next.label !== option.label),
          ))
      return {
        ...doc,
        fields,
        rows: needsConversion
          ? doc.rows.map((row) => {
              const value = old
                ? convertValue(row[old.id], old, command.field)
                : isTimestampField(command.field.type)
                  ? now
                  : defaultValue(command.field.type)
              return old && sameValue(value, row[old.id]) ? row : { ...row, [command.field.id]: value }
            })
          : doc.rows,
      }
    }
    case 'field/delete': {
      if (!doc.fields.some((field) => field.id === command.id)) return doc
      const { id } = command
      const remove = (set: Set<string>) => new Set([...set].filter((item) => item !== id))
      const colStats = { ...doc.view.colStats }
      delete colStats[id]
      return {
        fields: doc.fields.filter((field) => field.id !== id),
        rows: doc.rows.map((row) => {
          const next = { ...row }
          delete next[id]
          return next
        }),
        view: {
          ...doc.view,
          filters: doc.view.filters.filter((item) => item.fieldId !== id),
          sorts: doc.view.sorts.filter((item) => item.fieldId !== id),
          groupBy: doc.view.groupBy.fieldId === id ? { fieldId: '', collapsed: new Set() } : doc.view.groupBy,
          pinnedFieldId: doc.view.pinnedFieldId === id ? '' : doc.view.pinnedFieldId,
          hiddenFields: remove(doc.view.hiddenFields),
          highlightDupes: remove(doc.view.highlightDupes),
          colStats,
        },
      }
    }
    case 'field/duplicate': {
      const index = doc.fields.findIndex((field) => field.id === command.id)
      if (index < 0) return doc
      const source = doc.fields[index]
      const fields = [...doc.fields]
      fields.splice(index + 1, 0, {
        ...source,
        id: command.newId,
        label: `${source.label} 副本`,
        options: source.options?.map((option) => ({ ...option })),
      })
      return { ...doc, fields, rows: doc.rows.map((row) => ({ ...row, [command.newId]: row[command.id] })) }
    }
    case 'field/reorder':
      return { ...doc, fields: command.fields }
    case 'field/resize': {
      const field = doc.fields.find((item) => item.id === command.id)
      if (!field || field.width === command.width) return doc
      return {
        ...doc,
        fields: doc.fields.map((item) => (item.id === command.id ? { ...item, width: command.width } : item)),
      }
    }
    case 'rows/change': {
      const rows = reconcileRows(doc.rows, command.before, command.after)
      if (rows === doc.rows) return doc
      const originals = new Map(doc.rows.map((row) => [row.id, row]))
      const editableFields = doc.fields.filter((field) => !isTimestampField(field.type))
      const timestamps = doc.fields.filter((field) => isTimestampField(field.type))
      const now = new Date().toISOString()
      const updated = rows.map((row) => {
        const original = originals.get(row.id)
        if (!original) return withNewTimestamps(row, timestamps, now)
        const changed = editableFields.some((field) => !sameValue(row[field.id], original[field.id]))
        if (!changed) return original
        const next = { ...row }
        for (const field of timestamps) {
          if (field.type === 'created_time') next[field.id] = original[field.id]
          else {
            const previous = Date.parse(String(original[field.id] ?? ''))
            next[field.id] = new Date(
              Math.max(Date.parse(now), Number.isNaN(previous) ? 0 : previous + 1),
            ).toISOString()
          }
        }
        return next
      })
      return updated.length === doc.rows.length && updated.every((row, index) => row === doc.rows[index])
        ? doc
        : { ...doc, rows: updated }
    }
    case 'rows/add':
      return { ...doc, rows: [...doc.rows, withNewTimestamps(command.row, doc.fields, new Date().toISOString())] }
    case 'rows/move': {
      const { from, to } = command
      if (from === to || from < 0 || to < 0 || from >= doc.rows.length || to >= doc.rows.length) return doc
      const rows = [...doc.rows]
      const [row] = rows.splice(from, 1)
      rows.splice(to, 0, row)
      return { ...doc, rows }
    }
    case 'view/change':
      return { ...doc, view: command.update(doc.view) }
  }
}

export interface HistoryState {
  past: TableDocument[]
  present: TableDocument
  future: TableDocument[]
  group?: string
  time?: number
}
export type HistoryAction =
  | { type: 'commit'; command: TableCommand; group?: string; time: number }
  | { type: 'undo' }
  | { type: 'redo' }
export const HISTORY_LIMIT = 50
export const historyState = (present: TableDocument): HistoryState => ({ past: [], present, future: [] })

export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  if (action.type === 'undo') {
    if (!state.past.length) return state
    return {
      past: state.past.slice(0, -1),
      present: state.past[state.past.length - 1],
      future: [state.present, ...state.future],
    }
  }
  if (action.type === 'redo') {
    if (!state.future.length) return state
    return {
      past: [...state.past, state.present].slice(-HISTORY_LIMIT),
      present: state.future[0],
      future: state.future.slice(1),
    }
  }
  const present = applyCommand(state.present, action.command)
  if (present === state.present) return state
  const merge =
    action.group && action.group === state.group && action.time - (state.time ?? 0) < 750 && !state.future.length
  return {
    past: merge ? state.past : [...state.past, state.present].slice(-HISTORY_LIMIT),
    present,
    future: [],
    group: action.group,
    time: action.time,
  }
}

export function newField(doc: Pick<TableDocument, 'fields'>, anchor: string, offset: number): TableCommand | null {
  const index = doc.fields.findIndex((field) => field.id === anchor)
  return index < 0
    ? null
    : { type: 'field/save', field: { id: newId(), label: '文本', type: 'text' }, index: index + offset }
}
