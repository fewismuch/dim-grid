import { Alert, Button, Flex } from 'antd'
import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type Column,
  type ContextMenuComponentProps,
  DynamicDataSheetGrid as DataSheetGrid,
} from 'react-datasheet-grid'
import 'react-datasheet-grid/dist/style.css'
import s from './App.module.css'
import buildDsgCol from './buildDsgCol'
import BackupControls from './components/BackupControls'
import ColumnMenu from './components/ColumnMenu'
import { ContextMenu } from './components/ContextMenu'
import FilterPanel from './components/FilterPanel/index'
import GroupPanel from './components/GroupPanel/index'
import RowHeightMenu from './components/RowHeightMenu'
import SearchPanel from './components/SearchPanel/index'
import SortPanel from './components/SortPanel/index'
import StatsMenu from './components/StatsMenu/index'
import TableSettings from './components/TableSettings/index'
import ViewTitle from './components/ViewTitle'
import {
  calcStat,
  FIELD_TYPES,
  type FieldDef,
  type FieldOption,
  type FieldType,
  type FilterItem,
  type GroupByState,
  Ic,
  type ModalState,
  newId,
  type RowData,
  type SortItem,
} from './constants'
import useFooterLayout from './hooks/useFooterLayout'
import useGroupWindow from './hooks/useGroupWindow'
import useTableDocument from './hooks/useTableDocument'
import { newField } from './model/document'
import { groupGridHeight } from './model/groupWindow'
import { ROW_HEIGHT } from './model/rowHeight'
import { cellText, createRow, duplicateRow, duplicateValues, processRows } from './model/table'

const FieldModal = lazy(() => import('./components/FieldModal'))

export default function App() {
  const { document: table, execute, setView, saveError, recoveryRaw, replaceDocument } = useTableDocument()
  const { fields, rows } = table
  const { filters, groupBy, sorts, colStats, hiddenFields, highlightDupes, pinnedFieldId, rowHeight } = table.view
  const rowPixels = ROW_HEIGHT[rowHeight].pixels
  const visibleLines = ROW_HEIGHT[rowHeight].lines
  const [modal, setModal] = useState<ModalState | null>(null)
  const [search, setSearch] = useState('')
  const [statsMenu, setStatsMenu] = useState<string | null>(null)
  const [resizingColumnId, setResizingColumnId] = useState<string | null>(null)
  const [columnPreview, setColumnPreview] = useState<Record<string, number>>({})
  const resizeDrag = useRef<{ id: string; startX: number; startWidth: number; preview: number; min: number } | null>(
    null,
  )
  useEffect(() => {
    const move = (event: PointerEvent) => {
      const drag = resizeDrag.current
      if (!drag) return
      const width = Math.min(1200, Math.max(drag.min, Math.round(drag.startWidth + event.clientX - drag.startX)))
      drag.preview = width
      setColumnPreview((current) => (current[drag.id] === width ? current : { ...current, [drag.id]: width }))
    }
    const stop = () => {
      const drag = resizeDrag.current
      if (!drag) return
      resizeDrag.current = null
      setResizingColumnId(null)
      setColumnPreview((current) => {
        const next = { ...current }
        delete next[drag.id]
        return next
      })
      if (drag.preview !== drag.startWidth) execute({ type: 'field/resize', id: drag.id, width: drag.preview })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
    }
  }, [execute])
  const setFilters = useCallback((value: React.SetStateAction<FilterItem[]>) => setView('filters', value), [setView])
  const setSorts = useCallback((value: React.SetStateAction<SortItem[]>) => setView('sorts', value), [setView])
  const setGroupBy = useCallback((value: React.SetStateAction<GroupByState>) => setView('groupBy', value), [setView])
  const setHiddenFields = useCallback(
    (value: React.SetStateAction<Set<string>>) => setView('hiddenFields', value),
    [setView],
  )
  const setHighlightDupes = useCallback(
    (value: React.SetStateAction<Set<string>>) => setView('highlightDupes', value),
    [setView],
  )
  const setColStats = useCallback(
    (value: React.SetStateAction<Record<string, string>>) => setView('colStats', value),
    [setView],
  )

  const [isDragging, setIsDragging] = useState(false)
  const [dragOverIndex, setDragOverIndex] = useState(-1)
  const dragFromRef = useRef(-1)
  const dragOverRef = useRef(-1)
  const dragRowsLenRef = useRef(0)
  const gridAreaRef = useRef<HTMLDivElement>(null)
  const footerScrollRef = useRef<HTMLDivElement>(null)
  const horizontalScroll = useRef(0)
  const footerWidth = useFooterLayout(gridAreaRef, horizontalScroll)
  const syncHorizontalScroll = (left: number) => {
    horizontalScroll.current = left
    if (footerScrollRef.current && footerScrollRef.current.scrollLeft !== left)
      footerScrollRef.current.scrollLeft = left
    for (const grid of gridAreaRef.current?.querySelectorAll<HTMLElement>('.dsg-container') ?? []) {
      if (grid.scrollLeft !== left) grid.scrollLeft = left
    }
  }

  const canReorderRows =
    !groupBy.fieldId &&
    !search.trim() &&
    !sorts.length &&
    !filters.some((filter) => filter.fieldId && (filter.value || ['empty', 'not_empty'].includes(filter.op)))

  const moveRow = useCallback((from: number, to: number) => execute({ type: 'rows/move', from, to }), [execute])

  const toggleFieldVisibility = useCallback(
    (fieldId: string) => {
      setHiddenFields((prev) => {
        const next = new Set(prev)
        if (next.has(fieldId)) next.delete(fieldId)
        else next.add(fieldId)
        return next
      })
    },
    [setHiddenFields],
  )

  const handleFieldsReorder = useCallback((fields: FieldDef[]) => execute({ type: 'field/reorder', fields }), [execute])
  const duplicateField = useCallback(
    (id: string) => execute({ type: 'field/duplicate', id, newId: newId() }),
    [execute],
  )
  const insertField = useCallback(
    (id: string, offset: number) => {
      const command = newField({ fields }, id, offset)
      if (command) execute(command)
    },
    [fields, execute],
  )

  const toggleHighlight = useCallback(
    (fieldId: string) => {
      setHighlightDupes((prev) => {
        const next = new Set(prev)
        if (next.has(fieldId)) next.delete(fieldId)
        else next.add(fieldId)
        return next
      })
    },
    [setHighlightDupes],
  )

  const addFilterForField = useCallback(
    (fieldId: string) => {
      setFilters((f) => [...f, { id: newId(), fieldId, op: 'contains', value: '' }])
    },
    [setFilters],
  )

  const addSortForField = useCallback(
    (fieldId: string, dir: 'asc' | 'desc') => {
      setSorts((s) => {
        const existing = s.findIndex((x) => x.fieldId === fieldId)
        if (existing !== -1) return s.map((x, i) => (i === existing ? { ...x, dir } : x))
        return [...s, { id: newId(), fieldId, dir }]
      })
    },
    [setSorts],
  )

  const deleteField = useCallback(
    (id: string) => {
      execute({ type: 'field/delete', id })
      setStatsMenu((current) => (current === id ? null : current))
    },
    [execute],
  )

  const handleGutterMouseDown = useCallback(
    (rowIndex: number, e: React.MouseEvent) => {
      if (!canReorderRows || e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()
      dragFromRef.current = rowIndex
      dragOverRef.current = rowIndex
      dragRowsLenRef.current = rows.length
      setIsDragging(true)
      setDragOverIndex(rowIndex)
    },
    [canReorderRows, rows.length],
  )

  useEffect(() => {
    if (!isDragging) return
    const rowH = rowPixels
    const headerH = 38
    const onMove = (e: MouseEvent) => {
      const el = gridAreaRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const scrollTop = (el.querySelector('.dsg-container') as HTMLElement | null)?.scrollTop ?? el.scrollTop
      const relY = e.clientY - rect.top + scrollTop - headerH
      const index = Math.max(0, Math.min(Math.floor(relY / rowH), dragRowsLenRef.current - 1))
      dragOverRef.current = index
      setDragOverIndex(index)
    }
    const onUp = () => {
      const from = dragFromRef.current
      const over = dragOverRef.current
      if (from !== -1 && over !== -1 && from !== over) {
        moveRow(from, over)
      }
      setIsDragging(false)
      setDragOverIndex(-1)
    }
    const onCancel = () => {
      setIsDragging(false)
      setDragOverIndex(-1)
    }
    window.addEventListener('blur', onCancel)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('blur', onCancel)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [isDragging, moveRow, rowPixels])

  const openAdd = useCallback(() => setModal({ mode: 'add' }), [])
  const openEdit = useCallback((fieldId: string) => setModal({ mode: 'edit', fieldId }), [])
  const closeModal = () => setModal(null)

  const handleSave = ({ label, type, options }: { label: string; type: FieldType; options?: FieldOption[] }) => {
    if (!modal) return
    const previousWidth = fields.find((field) => field.id === modal.fieldId)?.width
    execute({
      type: 'field/save',
      field: {
        id: modal.mode === 'add' ? newId() : (modal.fieldId ?? newId()),
        label,
        type,
        options,
        ...(previousWidth === undefined ? {} : { width: previousWidth }),
      },
    })
    closeModal()
  }
  const handleDelete = () => {
    if (modal?.fieldId) deleteField(modal.fieldId)
  }

  const processedRows = useMemo(
    () => processRows(rows, fields, filters, sorts, search),
    [rows, fields, filters, sorts, search],
  )

  const groups: { key: string; rows: RowData[] }[] | null = useMemo(() => {
    if (!groupBy.fieldId) return null
    const field = fields.find((field) => field.id === groupBy.fieldId)
    const map = new Map<string, RowData[]>()
    processedRows.forEach((row) => {
      const key = cellText(row[groupBy.fieldId], field)
      if (!map.has(key)) map.set(key, [])
      map.get(key)?.push(row)
    })
    return [...map.entries()].map(([key, rows]) => ({ key, rows }))
  }, [processedRows, groupBy.fieldId, fields])

  const groupRange = useGroupWindow(groups, groupBy.collapsed, gridAreaRef, rowPixels)

  const toggleGroup = (key: string) =>
    setGroupBy((g) => {
      const c = new Set(g.collapsed)
      c.has(key) ? c.delete(key) : c.add(key)
      return { ...g, collapsed: c }
    })

  const visibleFields = useMemo(() => fields.filter((f) => !hiddenFields.has(f.id)), [fields, hiddenFields])
  const pinnedField = visibleFields.find((field) => field.id === pinnedFieldId)
  const scrollFields = useMemo(
    () => visibleFields.filter((field) => field.id !== pinnedFieldId),
    [visibleFields, pinnedFieldId],
  )
  const orderedFields = useMemo(
    () => (pinnedField ? [pinnedField, ...scrollFields] : scrollFields),
    [pinnedField, scrollFields],
  )
  const togglePin = useCallback(
    (id: string) => setView('pinnedFieldId', (current) => (current === id ? '' : id)),
    [setView],
  )
  const renderFieldMenu = useCallback(
    (field: FieldDef, alwaysVisible = false) => (
      <ColumnMenu
        alwaysVisible={alwaysVisible || resizingColumnId === field.id}
        onEdit={() => openEdit(field.id)}
        onDuplicate={() => duplicateField(field.id)}
        onInsertLeft={() => insertField(field.id, 0)}
        onInsertRight={() => insertField(field.id, 1)}
        onGroupBy={() => setGroupBy({ fieldId: field.id, collapsed: new Set() })}
        onFilter={() => addFilterForField(field.id)}
        onSortAsc={() => addSortForField(field.id, 'asc')}
        onSortDesc={() => addSortForField(field.id, 'desc')}
        onToggleHighlight={() => toggleHighlight(field.id)}
        onDelete={() => deleteField(field.id)}
        onPin={() => togglePin(field.id)}
        pinned={pinnedFieldId === field.id}
        highlighted={highlightDupes.has(field.id)}
      />
    ),
    [
      openEdit,
      duplicateField,
      insertField,
      setGroupBy,
      addFilterForField,
      addSortForField,
      toggleHighlight,
      deleteField,
      togglePin,
      pinnedFieldId,
      resizingColumnId,
      highlightDupes,
    ],
  )

  const duplicates = useMemo(() => duplicateValues(rows, fields, highlightDupes), [rows, fields, highlightDupes])

  const getCellClass = useCallback(
    ({ rowData, columnId }: { rowData: unknown; columnId?: string }) => {
      const field = fields.find((item) => item.id === columnId)
      return field && duplicates.get(field.id)?.has(cellText((rowData as RowData)[field.id], field))
        ? 'dsg-cell-dupe'
        : ''
    },
    [fields, duplicates],
  )

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
        basis: columnPreview[field.id] ?? field.width ?? (field.type === 'checkbox' ? 80 : 180),
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
              onPointerDown={(event) => {
                if (event.button !== 0) return
                event.preventDefault()
                event.stopPropagation()
                resizeDrag.current = {
                  id: field.id,
                  startX: event.clientX,
                  startWidth: event.currentTarget.closest('.dsg-cell-header')?.getBoundingClientRect().width ?? 140,
                  preview: event.currentTarget.closest('.dsg-cell-header')?.getBoundingClientRect().width ?? 140,
                  min: 60,
                }
                setResizingColumnId(field.id)
              }}
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
  }, [orderedFields, pinnedField, columnPreview, renderFieldMenu, execute, visibleLines])

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

  const renderContextMenu = (viewRows: RowData[]) => (props: ContextMenuComponentProps) => {
    const row = viewRows[props.cursorIndex.row]
    const field = orderedFields[props.cursorIndex.col]
    return (
      <ContextMenu
        {...props}
        textColor={row?.__cellColors?.[field?.id] ?? null}
        onTextColorChange={
          row && field
            ? (color) => execute({ type: 'cell/text-color', rowId: row.id, fieldId: field.id, color })
            : undefined
        }
      />
    )
  }

  const gutterColumn = useMemo(
    () => ({
      component: ({ rowIndex }: { rowIndex: number }) => (
        <div className="dsg-gutter-cell">
          <span className="dsg-gutter-index">{rowIndex + 1}</span>
          <Button
            type="text"
            size="small"
            icon={<Ic.GripVertical />}
            aria-label={`拖动记录 ${rowIndex + 1}`}
            className="dsg-gutter-grip"
            style={{ display: canReorderRows ? undefined : 'none' }}
            onKeyDown={(e) => {
              if (canReorderRows && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                e.preventDefault()
                e.stopPropagation()
                moveRow(rowIndex, rowIndex + (e.key === 'ArrowUp' ? -1 : 1))
              }
            }}
            onMouseDown={(e: React.MouseEvent) => handleGutterMouseDown(rowIndex, e)}
          />
        </div>
      ),
    }),
    [handleGutterMouseDown, canReorderRows, moveRow],
  )

  const makeRow = useCallback(() => createRow(fields), [fields])
  const addRow = () => execute({ type: 'rows/add', row: makeRow() })
  const handleGridChange = (before: RowData[], after: RowData[]) => {
    const changed = after.filter((row, index) => row !== before[index])
    const edited = changed.length === 1 ? changed[0] : null
    const original = edited ? before.find((row) => row.id === edited.id) : null
    const keys =
      edited && original
        ? fields
            .filter((field) => edited[field.id] !== original[field.id])
            .map((field) => field.id)
            .join(',')
        : ''
    const group = before.length === after.length && edited && keys ? `cell:${edited.id}:${keys}` : undefined
    execute({ type: 'rows/change', before, after }, group)
  }

  const getGroupBadge = (groupKey: string, fieldId: string) => {
    const field = fields.find((f) => f.id === fieldId)
    if (field?.type === 'select' && groupKey) {
      const opt = (field.options || []).find((o) => o.label === groupKey)
      if (opt)
        return (
          <span className="select-tag" style={{ background: opt.color, color: opt.textColor }}>
            {groupKey}
          </span>
        )
    }
    return <span className="group-badge group-badge-default">{groupKey || '（空）'}</span>
  }

  return (
    <div className={s.app}>
      <Flex className={s.toolbar} align="center" justify="space-between" gap="small" wrap>
        <ViewTitle name={table.view.name} onRename={(name) => setView('name', name)} />
        <Flex className={s.toolbarActions} align="center" justify="flex-end" gap="0" wrap>
          <TableSettings
            fields={fields}
            hiddenFields={hiddenFields}
            onReorder={handleFieldsReorder}
            onToggleHide={toggleFieldVisibility}
            pinnedFieldId={pinnedFieldId}
            onTogglePin={togglePin}
            renderMenu={(field) => renderFieldMenu(field, true)}
          />
          <RowHeightMenu value={rowHeight} onChange={(value) => setView('rowHeight', value)} />

          <FilterPanel
            fields={fields}
            filters={filters}
            onAdd={() =>
              setFilters((f) => [...f, { id: newId(), fieldId: fields[0]?.id || '', op: 'contains', value: '' }])
            }
            onUpdate={(id: string, key: string, val: string) =>
              setFilters((f) => f.map((x: FilterItem) => (x.id === id ? { ...x, [key]: val } : x)))
            }
            onDelete={(id: string) => setFilters((f) => f.filter((x: FilterItem) => x.id !== id))}
          />

          <GroupPanel
            fields={fields}
            groupBy={groupBy}
            onChange={setGroupBy}
            onSortAsc={() => groupBy.fieldId && addSortForField(groupBy.fieldId, 'asc')}
            onSortDesc={() => groupBy.fieldId && addSortForField(groupBy.fieldId, 'desc')}
          />

          <SortPanel
            fields={fields}
            sorts={sorts}
            onAdd={() => setSorts((s) => [...s, { id: newId(), fieldId: fields[0]?.id || '', dir: 'asc' as const }])}
            onUpdate={(id: string, key: string, val: string) =>
              setSorts((s) => s.map((x: SortItem) => (x.id === id ? { ...x, [key]: val } : x)))
            }
            onDelete={(id: string) => setSorts((s) => s.filter((x: SortItem) => x.id !== id))}
          />

          <SearchPanel onSearch={setSearch} />
          <BackupControls
            document={table}
            recoveryRaw={recoveryRaw}
            onImport={(document) => {
              replaceDocument(document)
              setSearch('')
            }}
          />
        </Flex>
      </Flex>

      {saveError && <Alert type="error" showIcon title={saveError} role="alert" />}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Prevent the grid's decorative add-column cells from being selected. */}
      <div
        className={s.gridArea}
        ref={gridAreaRef}
        onMouseDown={(event) => {
          if ((event.target as HTMLElement).closest('.dsg-cell-add-column')) event.stopPropagation()
        }}
        onContextMenu={(event) => event.preventDefault()}
        onScrollCapture={(event) => {
          if ((event.target as HTMLElement).classList.contains('dsg-container'))
            syncHorizontalScroll((event.target as HTMLElement).scrollLeft)
        }}
      >
        {isDragging && (
          <div
            className="dsg-drag-indicator"
            style={{ top: 38 + (dragOverIndex >= dragFromRef.current ? dragOverIndex + 1 : dragOverIndex) * rowPixels }}
          />
        )}
        {groups ? (
          <>
            <div aria-hidden="true" style={{ height: groupRange.before }} />
            {groups.slice(groupRange.start, groupRange.end).map(({ key, rows: gRows }) => (
              <div key={key}>
                <Button
                  type="text"
                  block
                  icon={groupBy.collapsed.has(key) ? <Ic.ChevR /> : <Ic.ChevD />}
                  className="group-header-row"
                  aria-expanded={!groupBy.collapsed.has(key)}
                  onClick={() => toggleGroup(key)}
                >
                  {getGroupBadge(key, groupBy.fieldId)}
                  <span className={s.groupRowCount}>{gRows.length} 条记录</span>
                </Button>
                {!groupBy.collapsed.has(key) && (
                  <DataSheetGrid
                    height={groupGridHeight(gRows.length, groupRange.gridMaxHeight, rowPixels)}
                    value={gRows}
                    onChange={(newRows) => handleGridChange(gRows, newRows)}
                    rowKey="id"
                    createRow={() => ({ ...makeRow(), [groupBy.fieldId]: gRows[0][groupBy.fieldId] })}
                    duplicateRow={({ rowData }) => duplicateRow(rowData)}
                    contextMenuComponent={renderContextMenu(gRows)}
                    columns={gridColumns}
                    cellClassName={getCellClass}
                    gutterColumn={gutterColumn}
                    addRowsComponent={false}
                    rowHeight={rowPixels}
                    headerRowHeight={groupBy.collapsed.has(key) ? 0 : 38}
                  />
                )}
              </div>
            ))}
            <div aria-hidden="true" style={{ height: groupRange.after }} />
          </>
        ) : (
          <DataSheetGrid
            height={groupRange.gridMaxHeight}
            value={processedRows}
            onChange={(newRows) => handleGridChange(processedRows, newRows)}
            rowKey="id"
            createRow={makeRow}
            duplicateRow={({ rowData }) => duplicateRow(rowData)}
            columns={gridColumns}
            cellClassName={getCellClass}
            gutterColumn={gutterColumn}
            addRowsComponent={false}
            rowHeight={rowPixels}
            headerRowHeight={38}
            contextMenuComponent={renderContextMenu(processedRows)}
          />
        )}
        {processedRows.length === 0 && (
          <div className={s.emptyHint}>
            {rows.length ? '没有匹配的记录，请调整筛选条件或搜索内容' : '暂无记录，点击下方添加记录'}
          </div>
        )}
        <Button type="text" block onClick={addRow} icon={<Ic.Plus />}>
          添加记录
        </Button>
      </div>

      <div className={s.footer}>
        <div
          className={s.footerScroll}
          ref={footerScrollRef}
          onScroll={(event) => syncHorizontalScroll(event.currentTarget.scrollLeft)}
        >
          <div
            className={s.footerColumns}
            style={{
              width: footerWidth,
              minWidth:
                88 +
                orderedFields.reduce(
                  (width, field) =>
                    width + (columnPreview[field.id] ?? field.width ?? (field.type === 'checkbox' ? 80 : 180)),
                  0,
                ),
            }}
          >
            <div className={s.footerGutter} aria-hidden="true" />
            {orderedFields.map((field) => {
              const isFirst = field.id === orderedFields[0]?.id
              const stat = colStats[field.id] || (isFirst ? '记录总数' : '不展示')
              const val = calcStat(stat, processedRows, field)
              return (
                <React.Fragment key={field.id}>
                  <Button
                    type="text"
                    className={`${s.footerCol} ${val === null ? s.footerColEmpty : ''} ${pinnedField?.id === field.id ? s.footerPinned : ''}`}
                    style={{
                      flex: `0 0 ${columnPreview[field.id] ?? field.width ?? (field.type === 'checkbox' ? 80 : 180)}px`,
                      minWidth: 60,
                      fontSize: 12,
                    }}
                    aria-label={`${field.label}统计`}
                    onClick={() => setStatsMenu(statsMenu === field.id ? null : field.id)}
                  >
                    <span className={s.footerContent}>
                      {val !== null ? (
                        <>
                          <span className={s.footerColLabel}>{stat}</span>
                          <span className={s.footerColVal}>{val}</span>
                        </>
                      ) : (
                        <span className={s.footerAddStat}>+ 统计</span>
                      )}
                    </span>
                    {statsMenu === field.id && (
                      <StatsMenu
                        current={stat}
                        onSelect={(stat) => {
                          setColStats((c) => ({ ...c, [field.id]: stat }))
                          setStatsMenu(null)
                        }}
                        onClose={() => setStatsMenu(null)}
                      />
                    )}
                  </Button>
                </React.Fragment>
              )
            })}
            <div className={s.footerAdd} aria-hidden="true" />
          </div>
        </div>
      </div>

      {modal && (
        <Suspense
          fallback={
            <div role="status" className={s.loading}>
              正在加载…
            </div>
          }
        >
          <FieldModal
            field={modal.mode === 'edit' ? fields.find((f) => f.id === modal.fieldId) || null : null}
            onSave={handleSave}
            onDelete={handleDelete}
            onClose={closeModal}
          />
        </Suspense>
      )}
    </div>
  )
}
