import { Button } from 'antd'
import React, { type ReactNode, useMemo } from 'react'
import type { Column } from 'react-datasheet-grid'
import buildDsgCol from '../components/buildDsgCol'
import { FIELD_TYPES, type FieldDef, Ic, type RowData } from '../constants'
import type useTableDocument from './useTableDocument'

type Options = {
  orderedFields: FieldDef[]
  columnWidths: Record<string, number>
  pinnedFieldId: string
  columnPreview: Record<string, number>
  visibleLines: 1 | 2 | 5
  renderFieldMenu: (field: FieldDef) => ReactNode
  startResize: (id: string, event: React.PointerEvent) => void
  execute: ReturnType<typeof useTableDocument>['execute']
  openAdd: () => void
}

export default function useGridColumns({
  orderedFields,
  columnWidths,
  pinnedFieldId,
  columnPreview,
  visibleLines,
  renderFieldMenu,
  startResize,
  execute,
  openAdd,
}: Options) {
  const pinnedField = orderedFields.find((field) => field.id === pinnedFieldId)
  const dsgColumns = useMemo(() => {
    const buildFieldColumn = (field: FieldDef): Partial<Column<RowData>> => {
      const column = buildDsgCol(field, visibleLines)
      const Cell = column.component
      return {
        ...column,
        component: Cell
          ? (props) => (
              <div style={{ display: 'contents', color: props.rowData.__cellColors?.[field.id] }}>
                <Cell {...props} />
              </div>
            )
          : undefined,
        headerClassName: field.id === pinnedField?.id ? 'dsg-cell-pinned-left' : undefined,
        cellClassName: field.id === pinnedField?.id ? 'dsg-cell-pinned-left' : undefined,
        basis: columnPreview[field.id] ?? columnWidths[field.id],
        grow: 0,
        shrink: 0,
        minWidth: 60,
        title: (
          <div className="col-header">
            <span className="col-header-label-box">
              {React.createElement(FIELD_TYPES.find((f) => f.key === field.type)?.Icon || Ic.Text)}
              <span className="col-header-label">{field.label}</span>
            </span>
            {renderFieldMenu(field)}
            <button
              type="button"
              className="col-resize-handle"
              aria-label={`调整${field.label}列宽`}
              title="拖动调整列宽，方向键微调"
              onPointerDown={(event) => startResize(field.id, event)}
              onMouseDown={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
                event.preventDefault()
                event.stopPropagation()
                const current = event.currentTarget.closest('.dsg-cell-header')?.getBoundingClientRect().width ?? 140
                execute({
                  type: 'field/resize',
                  id: field.id,
                  width: Math.min(1200, Math.max(60, Math.round(current + (event.key === 'ArrowRight' ? 16 : -16)))),
                })
              }}
            />
          </div>
        ),
      }
    }
    return orderedFields.map((field) => buildFieldColumn(field))
  }, [orderedFields, pinnedField, columnPreview, columnWidths, renderFieldMenu, execute, visibleLines, startResize])

  const addColumn = useMemo<Partial<Column<RowData>>>(
    () => ({
      id: 'add-column',
      title: (
        <Button
          type="text"
          block
          icon={<Ic.Plus />}
          aria-label="添加列"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={openAdd}
        />
      ),
      component: () => (
        <Button
          type="text"
          block
          aria-label="添加列"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={openAdd}
        />
      ),
      headerClassName: 'dsg-cell-add-column',
      cellClassName: 'dsg-cell-add-column',
      isCellEmpty: () => true,
      disableKeys: true,
      basis: 48,
      grow: 1,
      shrink: 0,
      minWidth: 48,
    }),
    [openAdd],
  )
  const gridColumns = useMemo(() => [...dsgColumns, addColumn], [dsgColumns, addColumn])

  return gridColumns
}
