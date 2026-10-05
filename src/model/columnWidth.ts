import { cellText, type FieldDef, parseLinkValue, parseMultiValue, type RowData } from './table.ts'

const MIN_WIDTH = 60
const MAX_AUTO_WIDTH = 360
const MAX_SAMPLED_ROWS = 200

const baseWidths: Partial<Record<FieldDef['type'], number>> = {
  checkbox: 80,
  date: 140,
  created_time: 190,
  modified_time: 190,
  email: 180,
  link: 160,
  multi_select: 160,
  progress: 150,
  rating: 175,
  select: 120,
}

function textWidth(text: string): number {
  let width = 0
  for (const char of text) {
    if (char === ' ') width += 4
    else if (char.charCodeAt(0) < 128) width += 7
    else width += 14
  }
  return width
}

function contentWidth(field: FieldDef, value: unknown): number {
  if (field.type === 'checkbox') return 32
  if (field.type === 'rating') return 124
  if (field.type === 'progress') return 135
  if (field.type === 'multi_select') {
    return parseMultiValue(value).reduce((width, label) => width + textWidth(label) + 16, 16)
  }
  if (field.type === 'link') {
    const { text, link } = parseLinkValue(value)
    return textWidth(text || link) + 64
  }
  return textWidth(cellText(value, field)) + (field.type === 'select' ? 36 : 24)
}

export function columnWidth(field: FieldDef, rows: RowData[]): number {
  if (field.width !== undefined) return field.width

  let width = Math.max(baseWidths[field.type] ?? 120, textWidth(field.label) + 76)
  const step = Math.max(1, Math.ceil(rows.length / MAX_SAMPLED_ROWS))
  for (let index = 0; index < rows.length; index += step) {
    width = Math.max(width, contentWidth(field, rows[index][field.id]))
    if (width >= MAX_AUTO_WIDTH) break
  }
  return Math.min(MAX_AUTO_WIDTH, Math.max(MIN_WIDTH, Math.ceil(width)))
}
