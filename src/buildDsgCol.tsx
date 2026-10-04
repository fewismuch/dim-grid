import { Button, Progress, Rate, Select } from 'antd'
import dayjs from 'dayjs'
import React, { lazy, Suspense, useLayoutEffect, useRef } from 'react'
import type { CellProps, Column } from 'react-datasheet-grid'
import { checkboxColumn, createTextColumn, floatColumn, intColumn, keyColumn, textColumn } from 'react-datasheet-grid'
import s from './buildDsgCol.module.css'
import LinkPopup from './components/LinkPopup'
import { type FieldDef, type FieldOption, Ic, type RowData } from './constants'
import { cellText, isEmptyValue, normalizeEmail, parseLinkValue, parseMultiValue, safeLink } from './model/table'

// Field descriptors choose the scalar type; rows have dynamic keys, so adapt that
// boundary once while keeping all grid callbacks typed as whole records.
function scalarColumn<T>(fieldId: string, column: Partial<Column<T>>) {
  return keyColumn<RowData>(fieldId, column as Partial<Column<unknown>>)
}

/* ── Select cell component (antd Select) ── */

type SelectColData = { options: FieldOption[]; fieldId: string }

const SelectCell = React.memo(
  ({ active, rowData, setRowData, focus, stopEditing, columnData }: CellProps<RowData, SelectColData>) => {
    const ref = useRef<React.ComponentRef<typeof Select>>(null)
    const { options, fieldId } = columnData
    const value = (rowData?.[fieldId] || undefined) as string | undefined

    useLayoutEffect(() => {
      if (focus) {
        ref.current?.focus()
      } else {
        ref.current?.blur()
      }
    }, [focus])

    return (
      <div className={focus ? s.cellFull : s.cellFullNoPointer}>
        <Select
          ref={ref}
          open={focus}
          value={value}
          allowClear
          onChange={(val) => {
            setRowData({ ...rowData, [fieldId]: val ?? '' })
          }}
          onBlur={() => stopEditing({ nextRow: false })}
          getPopupContainer={() => document.body}
          popupMatchSelectWidth={false}
          variant="borderless"
          suffixIcon={active ? undefined : null}
          className={s.cellFull}
          options={options.map((o) => ({
            value: o.label,
            label: (
              <span
                className={s.selectTagRound}
                style={{ '--tag-bg': o.color, '--tag-color': o.textColor } as React.CSSProperties}
              >
                {o.label}
              </span>
            ),
          }))}
          labelRender={(props) => {
            const o = options.find((x) => x.label === props.value)
            if (!o) return <span>{props.value}</span>
            return (
              <span
                className={s.selectTag}
                style={{ '--tag-bg': o.color, '--tag-color': o.textColor } as React.CSSProperties}
              >
                {o.label}
              </span>
            )
          }}
        />
      </div>
    )
  },
)
SelectCell.displayName = 'SelectCell'

/* ── Multi-select cell component ── */

type MultiSelectColData = { options: FieldOption[]; fieldId: string }

const MultiSelectCell = React.memo(
  ({ active, rowData, setRowData, focus, stopEditing, columnData }: CellProps<RowData, MultiSelectColData>) => {
    const ref = useRef<React.ComponentRef<typeof Select>>(null)
    const { options, fieldId } = columnData

    useLayoutEffect(() => {
      if (focus) {
        ref.current?.focus()
      } else {
        ref.current?.blur()
      }
    }, [focus])

    const selected = parseMultiValue(rowData?.[fieldId])

    return (
      <div className={focus ? s.cellFull : s.cellFullNoPointer}>
        <Select
          ref={ref}
          open={focus}
          mode="multiple"
          value={selected}
          onChange={(vals) => {
            setRowData({ ...rowData, [fieldId]: JSON.stringify(vals) })
          }}
          onBlur={() => stopEditing({ nextRow: false })}
          getPopupContainer={() => document.body}
          popupMatchSelectWidth={false}
          variant="borderless"
          maxTagCount="responsive"
          suffixIcon={active ? undefined : null}
          className={s.cellFull}
          options={options.map((o) => ({
            value: o.label,
            label: (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span className={s.optionDot} style={{ '--dot-bg': o.color } as React.CSSProperties} />
                {o.label}
              </span>
            ),
          }))}
          tagRender={(props) => {
            const o = options.find((x) => x.label === props.value)
            return (
              <span
                className={s.selectTagSmall}
                style={
                  {
                    '--tag-bg': o?.color || 'var(--color-border)',
                    '--tag-color': o?.textColor || 'var(--color-text-secondary)',
                  } as React.CSSProperties
                }
              >
                {o?.label ?? props.value}
              </span>
            )
          }}
        />
      </div>
    )
  },
)
MultiSelectCell.displayName = 'MultiSelectCell'

/* ── DatePicker cell component ── */

const EmailEditor = lazy(() => import('./components/EmailEditor'))
const DateEditor = lazy(() => import('./components/DateEditor'))
function createDateCell(fieldId: string) {
  const DateCell = (props: CellProps<RowData, unknown>) => {
    const text = cellText(props.rowData[fieldId], { id: fieldId, label: '', type: 'date' })
    const display = <span className={`${s.dateCell} ${text ? s.dateCellValue : s.dateCellEmpty}`}>{text}</span>
    return props.focus ? (
      <Suspense fallback={display}>
        <DateEditor {...props} fieldId={fieldId} />
      </Suspense>
    ) : (
      display
    )
  }
  return DateCell
}

function ProgressCell({
  rowData,
  setRowData,
  focus,
  stopEditing,
  columnData,
}: CellProps<RowData, { fieldId: string }>) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { fieldId } = columnData
  const val = Math.min(100, Math.max(0, Number(rowData[fieldId]) || 0))
  useLayoutEffect(() => {
    if (focus) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [focus])
  if (focus)
    return (
      <input
        ref={inputRef}
        type="number"
        min={0}
        max={100}
        aria-label="进度百分比"
        value={val}
        onChange={(e) => {
          setRowData({
            ...rowData,
            [fieldId]: e.target.value === '' ? '' : String(Math.min(100, Math.max(0, Number(e.target.value) || 0))),
          })
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Escape') {
            e.preventDefault()
            e.stopPropagation()
            stopEditing({ nextRow: false })
          }
        }}
        onBlur={() => stopEditing({ nextRow: false })}
        className={s.progressInput}
      />
    )
  return (
    <div className={s.progressCell}>
      <Progress
        percent={val}
        size="small"
        showInfo={false}
        strokeColor="var(--color-primary)"
        className={s.progressBar}
      />
      <span className={s.progressPercent}>{val}%</span>
    </div>
  )
}

export default function buildDsgCol(field: FieldDef): Partial<Column<RowData>> {
  const common = {
    id: field.id,
    title: field.label,
    minWidth: 140,
    isCellEmpty: ({ rowData }: { rowData: RowData }) => isEmptyValue(rowData[field.id], field),
  }
  switch (field.type) {
    case 'email':
      return {
        ...scalarColumn(field.id, textColumn),
        ...common,
        keepFocus: true,
        disableKeys: true,
        component: (props) =>
          props.focus ? (
            <Suspense fallback={<span>{String(props.rowData[field.id] ?? '')}</span>}>
              <EmailEditor {...props} fieldId={field.id} />
            </Suspense>
          ) : (
            <span className={s.dateCell}>{String(props.rowData[field.id] ?? '')}</span>
          ),
        pasteValue: ({ rowData, value }) => {
          const email = normalizeEmail(value)
          return email === null ? rowData : { ...rowData, [field.id]: email }
        },
      }
    case 'number':
      return { ...scalarColumn(field.id, intColumn), ...common }
    case 'float':
      return { ...scalarColumn(field.id, floatColumn), ...common }
    case 'date': {
      const DateCell = createDateCell(field.id)
      return {
        ...scalarColumn(field.id, createTextColumn()),
        ...common,
        component: (props) => <DateCell {...props} />,
        copyValue: ({ rowData }: { rowData: RowData }) => cellText(rowData[field.id], field),
        deleteValue: ({ rowData }: { rowData: RowData }) => ({ ...rowData, [field.id]: null }),
        pasteValue: ({ rowData, value }) => {
          const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? dayjs(value) : null
          return {
            ...rowData,
            [field.id]: date?.isValid() && date.format('YYYY-MM-DD') === value ? date.toDate() : null,
          }
        },
        keepFocus: true,
        disableKeys: true,
      }
    }
    case 'checkbox':
      return { ...scalarColumn(field.id, checkboxColumn), ...common, minWidth: 80, width: 80 }
    case 'select':
      return {
        ...scalarColumn(field.id, createTextColumn()),
        ...common,
        component: (props) => <SelectCell {...props} />,
        columnData: { options: field.options || [], fieldId: field.id },
        keepFocus: true,
        disableKeys: true,
        deleteValue: ({ rowData }: { rowData: RowData }) => ({ ...rowData, [field.id]: '' }),
        copyValue: ({ rowData }) => (field.options || []).find((o) => o.label === rowData[field.id])?.label ?? null,
        pasteValue: ({ rowData, value }) => ({
          ...rowData,
          [field.id]: (field.options || []).find((o) => o.label === value)?.label ?? '',
        }),
      }
    case 'multi_select':
      return {
        ...scalarColumn(field.id, createTextColumn()),
        ...common,
        component: (props) => <MultiSelectCell {...props} />,
        columnData: { options: field.options || [], fieldId: field.id },
        keepFocus: true,
        disableKeys: true,
        deleteValue: ({ rowData }: { rowData: RowData }) => ({ ...rowData, [field.id]: '[]' }),
        copyValue: ({ rowData }: { rowData: RowData }) => parseMultiValue(rowData[field.id]).join(', '),
        pasteValue: ({ rowData, value }) => ({
          ...rowData,
          [field.id]: JSON.stringify([
            ...new Set(
              value
                .split(',')
                .map((s: string) => s.trim())
                .filter((label: string) => field.options?.some((option) => option.label === label)),
            ),
          ]),
        }),
      }
    case 'link':
      return {
        ...scalarColumn(field.id, createTextColumn()),
        ...common,
        deleteValue: ({ rowData }: { rowData: RowData }) => ({ ...rowData, [field.id]: '{}' }),
        copyValue: ({ rowData }: { rowData: RowData }) => {
          const data = parseLinkValue(rowData[field.id])
          return data.link || data.text
        },
        pasteValue: ({ rowData, value }) => ({
          ...rowData,
          [field.id]: JSON.stringify({ text: value, link: safeLink(value) ?? '' }),
        }),
        component: ({ rowData, setRowData, active }) => {
          const data = parseLinkValue(rowData[field.id])
          const displayText = data.text || data.link || ''
          const linkUrl = safeLink(data.link)
          return (
            <div className={`link-cell ${active ? 'link-cell-active' : ''}`}>
              <span className="link-cell-text" title={displayText}>
                {displayText || <span className={s.linkCellPlaceholder}> </span>}
              </span>
              <LinkPopup
                text={data.text || ''}
                link={data.link || ''}
                onSave={({ text, link }: { text: string; link: string }) => {
                  setRowData({ ...rowData, [field.id]: JSON.stringify({ text, link }) })
                }}
              >
                <Button
                  type="text"
                  icon={<Ic.ExtLink />}
                  className="link-cell-btn"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  title="编辑链接"
                />
              </LinkPopup>
              {linkUrl && (
                <a
                  href={linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-cell-open"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  title="打开链接"
                >
                  <Ic.Link />
                </a>
              )}
            </div>
          )
        },
      }
    case 'rating':
      return {
        ...scalarColumn(field.id, createTextColumn()),
        ...common,
        component: ({ rowData, setRowData, focus }) => {
          const val = Math.max(0, Math.min(5, parseInt(String(rowData[field.id] ?? ''), 10) || 0))
          return (
            <div className={focus ? s.ratingCell : s.ratingCellNoPointer}>
              <Rate
                value={val}
                onChange={(n) => setRowData({ ...rowData, [field.id]: String(n) })}
                count={5}
                className={s.ratingInner}
              />
            </div>
          )
        },
      }
    case 'progress':
      return {
        ...scalarColumn(field.id, createTextColumn()),
        ...common,
        columnData: { fieldId: field.id },
        component: ProgressCell,
        keepFocus: true,
        disableKeys: true,
        pasteValue: ({ rowData, value }) => ({
          ...rowData,
          [field.id]:
            value.trim() && Number.isFinite(Number(value)) ? String(Math.max(0, Math.min(100, Number(value)))) : '',
        }),
      }
    default:
      return { ...scalarColumn(field.id, textColumn), ...common }
  }
}
