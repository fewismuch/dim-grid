import { Button, DatePicker, Progress, Rate, Select } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import React, { useLayoutEffect, useRef } from 'react'
import type { CellProps } from 'react-datasheet-grid'
import { checkboxColumn, createTextColumn, floatColumn, intColumn, keyColumn, textColumn } from 'react-datasheet-grid'
import s from './buildDsgCol.module.css'
import LinkPopup from './components/LinkPopup'
import { type FieldDef, type FieldOption, Ic } from './constants'

/* ── Select cell component (antd Select) ── */

type SelectColData = { options: FieldOption[]; fieldId: string }

const SelectCell = React.memo(
  ({ active, rowData, setRowData, focus, stopEditing, columnData }: CellProps<any, SelectColData>) => {
    const ref = useRef<any>(null)
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
          onChange={(val) => {
            setRowData({ ...rowData, [fieldId]: val })
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
          labelRender={(props: any) => {
            const o = options.find((x) => x.label === props.value)
            if (!o) return <span className={s.selectPlaceholder}> </span>
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
  ({ active, rowData, setRowData, focus, stopEditing, columnData }: CellProps<any, MultiSelectColData>) => {
    const ref = useRef<any>(null)
    const { options, fieldId } = columnData

    useLayoutEffect(() => {
      if (focus) {
        ref.current?.focus()
      } else {
        ref.current?.blur()
      }
    }, [focus])

    const selected: string[] = (() => {
      try {
        return JSON.parse(rowData?.[fieldId] || '[]')
      } catch {
        return []
      }
    })()

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
          tagRender={(props: any) => {
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

function createDateCell(fieldId: string) {
  const C = React.memo(({ active, rowData, setRowData, focus, stopEditing }: CellProps<any, any>) => {
    const ref = useRef<any>(null)
    const raw = rowData?.[fieldId] as Date | null | undefined
    const value: Dayjs | null = raw ? dayjs(raw) : null

    useLayoutEffect(() => {
      if (focus) {
        ref.current?.focus()
      } else {
        ref.current?.blur()
      }
    }, [focus])

    const handleChange = (d: Dayjs | null) => {
      setRowData({ ...rowData, [fieldId]: d ? d.toDate() : null })
      setTimeout(() => stopEditing({ nextRow: false }), 0)
    }

    if (active) {
      return (
        <div className={focus ? s.cellFull : s.cellFullNoPointer}>
          <DatePicker
            ref={ref}
            open={focus}
            value={value}
            onBlur={() => stopEditing({ nextRow: false })}
            onChange={handleChange}
            getPopupContainer={() => document.body}
            variant="borderless"
            allowClear={false}
            suffixIcon={null}
            placeholder=""
            className={s.cellFull}
          />
        </div>
      )
    }

    return (
      <span className={`${s.dateCell} ${value ? s.dateCellValue : s.dateCellEmpty}`}>
        {value ? value.format('YYYY-MM-DD') : ''}
      </span>
    )
  })
  C.displayName = 'DateCell'
  return C
}

export default function buildDsgCol(field: FieldDef) {
  const common = { title: field.label, minWidth: 140 }
  switch (field.type) {
    case 'number':
      return { ...keyColumn(field.id, intColumn), ...common }
    case 'float':
      return { ...keyColumn(field.id, floatColumn), ...common }
    case 'date':
      return {
        ...keyColumn(field.id, createTextColumn()),
        ...common,
        component: createDateCell(field.id),
        keepFocus: true,
        disableKeys: true,
      }
    case 'checkbox':
      return { ...keyColumn(field.id, checkboxColumn), ...common, minWidth: 80, width: 80 }
    case 'select':
      return {
        ...keyColumn(field.id, createTextColumn()),
        ...common,
        component: SelectCell,
        columnData: { options: field.options || [], fieldId: field.id },
        keepFocus: true,
        disableKeys: true,
        deleteValue: () => null,
        copyValue: ({ rowData }: any) =>
          (field.options || []).find((o) => o.label === rowData[field.id])?.label ?? null,
        pasteValue: ({ value }: any) => (field.options || []).find((o) => o.label === value)?.label ?? null,
      }
    case 'multi_select':
      return {
        ...keyColumn(field.id, createTextColumn()),
        ...common,
        component: MultiSelectCell,
        columnData: { options: field.options || [], fieldId: field.id },
        keepFocus: true,
        disableKeys: true,
        deleteValue: () => null,
        copyValue: ({ rowData }: any) => {
          try {
            const selected: string[] = JSON.parse(rowData[field.id] || '[]')
            return selected.join(', ')
          } catch {
            return null
          }
        },
        pasteValue: ({ value }: any) => {
          const labels = value
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
          const matched = labels
            .map((l: string) => (field.options || []).find((o) => o.label === l)?.label)
            .filter(Boolean)
          return matched.length ? JSON.stringify(matched) : null
        },
      }
    case 'link':
      return {
        ...keyColumn(field.id, createTextColumn()),
        ...common,
        component: ({ rowData, setRowData }: any) => {
          const data: Record<string, string> = (() => {
            try {
              return JSON.parse(rowData[field.id] || '{}')
            } catch {
              return {}
            }
          })()
          const displayText = data.text || data.link || ''
          const linkUrl = data.link || ''
          return (
            <div className="link-cell">
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
              {displayText && (
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
        ...keyColumn(field.id, createTextColumn()),
        ...common,
        component: ({ rowData, setRowData, focus }: any) => {
          const val = parseInt(rowData[field.id], 10) || 0
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
        ...keyColumn(field.id, createTextColumn()),
        ...common,
        component: ({ rowData, setRowData, focus }: any) => {
          const val = Math.min(100, Math.max(0, parseInt(rowData[field.id], 10) || 0))
          if (focus) {
            return (
              <input
                defaultValue={val}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10)
                  if (!Number.isNaN(n)) setRowData({ ...rowData, [field.id]: String(Math.min(100, Math.max(0, n))) })
                }}
                className={s.progressInput}
              />
            )
          }
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
        },
      }
    default:
      return { ...keyColumn(field.id, textColumn), ...common }
  }
}
