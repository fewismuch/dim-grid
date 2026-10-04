import { RedoOutlined, UndoOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type Column, DynamicDataSheetGrid as DataSheetGrid } from 'react-datasheet-grid'
import 'react-datasheet-grid/dist/style.css'
import s from './App.module.css'
import buildDsgCol from './buildDsgCol'
import BackupControls from './components/BackupControls'
import ColumnMenu from './components/ColumnMenu'
import { ContextMenu } from './components/ContextMenu'
import FilterPanel from './components/FilterPanel/index'
import GroupPanel from './components/GroupPanel/index'
import SearchPanel from './components/SearchPanel/index'
import SortPanel from './components/SortPanel/index'
import StatsMenu from './components/StatsMenu/index'
import TableSettings from './components/TableSettings/index'
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
import useGroupWindow from './hooks/useGroupWindow'
import useTableDocument from './hooks/useTableDocument'
import { newField } from './model/document'
import { groupGridHeight } from './model/groupWindow'
import { cellText, createRow, duplicateRow, duplicateValues, processRows } from './model/table'

const FieldModal = lazy(() => import('./components/FieldModal'))

export default function App() {
  const {
    document: table,
    execute,
    setView,
    undo,
    redo,
    canUndo,
    canRedo,
    saveError,
    saved,
    recoveryRaw,
    replaceDocument,
  } = useTableDocument()
  const { fields, rows } = table
  const { filters, groupBy, sorts, colStats, hiddenFields, highlightDupes } = table.view
  const [modal, setModal] = useState<ModalState | null>(null)
  const [search, setSearch] = useState('')
  const [statsMenu, setStatsMenu] = useState<string | null>(null)
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
    const rowH = 36
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
  }, [isDragging, moveRow])

  const openAdd = useCallback(() => setModal({ mode: 'add' }), [])
  const openEdit = useCallback((fieldId: string) => setModal({ mode: 'edit', fieldId }), [])
  const closeModal = () => setModal(null)

  const handleSave = ({ label, type, options }: { label: string; type: FieldType; options?: FieldOption[] }) => {
    if (!modal) return
    execute({
      type: 'field/save',
      field: { id: modal.mode === 'add' ? newId() : (modal.fieldId ?? newId()), label, type, options },
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

  const groupRange = useGroupWindow(groups, groupBy.collapsed, gridAreaRef)

  const toggleGroup = (key: string) =>
    setGroupBy((g) => {
      const c = new Set(g.collapsed)
      c.has(key) ? c.delete(key) : c.add(key)
      return { ...g, collapsed: c }
    })

  const visibleFields = useMemo(() => fields.filter((f) => !hiddenFields.has(f.id)), [fields, hiddenFields])

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

  const dsgColumns = useMemo<Partial<Column<RowData>>[]>(
    () => [
      ...visibleFields.map((field) => ({
        ...buildDsgCol(field),
        title: (
          <div className="col-header">
            <span className="col-header-label-box">
              {React.createElement(FIELD_TYPES.find((f) => f.key === field.type)?.Icon || Ic.Text)}
              <span className="col-header-label">{field.label}</span>
            </span>
            <ColumnMenu
              fieldId={field.id}
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
            />
          </div>
        ),
      })),
      {
        id: '__add__',
        title: (
          <Button type="text" icon={<Ic.Plus />} className="add-col-th-btn" aria-label="添加列" onClick={openAdd} />
        ),
        component: () => <span />,
        width: 48,
        minWidth: 48,
        disabled: true,
      },
    ],
    [
      visibleFields,
      openEdit,
      openAdd,
      duplicateField,
      insertField,
      addFilterForField,
      addSortForField,
      toggleHighlight,
      deleteField,
      setGroupBy,
    ],
  )

  const gutterColumn = useMemo(
    () => ({
      component: ({ rowIndex }: { rowIndex: number }) => (
        <div className="dsg-gutter-cell">
          <span className="dsg-gutter-index">{rowIndex + 1}</span>
          <button
            type="button"
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
          >
            <Ic.GripVertical />
          </button>
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
      <div className={s.toolbar}>
        <div className={s.toolbarTitle}>
          <Ic.Table />
          <span>表格视图</span>
        </div>
        <div className={s.toolbarSep} />

        <TableSettings
          fields={fields}
          hiddenFields={hiddenFields}
          onReorder={handleFieldsReorder}
          onToggleHide={toggleFieldVisibility}
        />

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
        <div className={s.toolbarSep} />
        <Button
          type="text"
          size="small"
          disabled={!canUndo}
          icon={<UndoOutlined />}
          onClick={() => {
            undo()
            setModal(null)
            setStatsMenu(null)
          }}
          title="撤销（Ctrl / ⌘ Z）"
        >
          撤销
        </Button>
        <Button
          type="text"
          size="small"
          icon={<RedoOutlined />}
          disabled={!canRedo}
          onClick={redo}
          title="重做（Ctrl / ⌘ Shift Z）"
        >
          重做
        </Button>
        <BackupControls
          document={table}
          recoveryRaw={recoveryRaw}
          onImport={(document) => {
            replaceDocument(document)
            setSearch('')
          }}
        />
        <span className={s.saveStatus} role="status">
          {saveError ? '未保存' : saved ? '已保存到本机' : '保存中…'}
        </span>
      </div>

      {saveError && (
        <div className={s.saveError} role="alert">
          {saveError}
        </div>
      )}
      <div className={s.gridArea} ref={gridAreaRef}>
        {isDragging && (
          <div
            className="dsg-drag-indicator"
            style={{ top: 38 + (dragOverIndex >= dragFromRef.current ? dragOverIndex + 1 : dragOverIndex) * 36 }}
          />
        )}
        {groups ? (
          <>
            <div aria-hidden="true" style={{ height: groupRange.before }} />
            {groups.slice(groupRange.start, groupRange.end).map(({ key, rows: gRows }) => (
              <div key={key}>
                <button
                  type="button"
                  className="group-header-row"
                  aria-expanded={!groupBy.collapsed.has(key)}
                  onClick={() => toggleGroup(key)}
                >
                  {groupBy.collapsed.has(key) ? <Ic.ChevR /> : <Ic.ChevD />}
                  {getGroupBadge(key, groupBy.fieldId)}
                  <span className={s.groupRowCount}>{gRows.length} 条记录</span>
                </button>
                {!groupBy.collapsed.has(key) && (
                  <DataSheetGrid
                    height={groupGridHeight(gRows.length)}
                    value={gRows}
                    onChange={(newRows) => handleGridChange(gRows, newRows)}
                    rowKey="id"
                    createRow={() => ({ ...makeRow(), [groupBy.fieldId]: gRows[0][groupBy.fieldId] })}
                    duplicateRow={({ rowData }) => duplicateRow(rowData)}
                    contextMenuComponent={ContextMenu}
                    columns={dsgColumns}
                    cellClassName={getCellClass}
                    gutterColumn={gutterColumn}
                    addRowsComponent={false}
                    rowHeight={36}
                    headerRowHeight={groupBy.collapsed.has(key) ? 0 : 38}
                  />
                )}
              </div>
            ))}
            <div aria-hidden="true" style={{ height: groupRange.after }} />
          </>
        ) : (
          <DataSheetGrid
            value={processedRows}
            onChange={(newRows) => handleGridChange(processedRows, newRows)}
            rowKey="id"
            createRow={makeRow}
            duplicateRow={({ rowData }) => duplicateRow(rowData)}
            columns={dsgColumns}
            cellClassName={getCellClass}
            gutterColumn={gutterColumn}
            addRowsComponent={false}
            rowHeight={36}
            headerRowHeight={38}
            contextMenuComponent={ContextMenu}
          />
        )}
        {processedRows.length === 0 && (
          <div className={s.emptyHint}>
            {rows.length ? '没有匹配的记录，请调整筛选条件或搜索内容' : '暂无记录，点击下方添加记录'}
          </div>
        )}
        <Button type="text" className="add-row-btn" onClick={addRow} icon={<Ic.Plus />}>
          添加记录
        </Button>
      </div>

      <div className={s.footer}>
        <div className={s.footerScroll}>
          <div className={s.footerTotal}>
            {processedRows.length} / {rows.length} 条记录
          </div>
          {visibleFields.map((field, fi) => {
            const isFirst = fi === 0
            const stat = colStats[field.id] || (isFirst ? '记录总数' : '不展示')
            const val = calcStat(stat, processedRows, field)
            return (
              <button
                type="button"
                key={field.id}
                className={s.footerCol}
                aria-label={`${field.label}统计`}
                onClick={() => setStatsMenu(statsMenu === field.id ? null : field.id)}
              >
                <span className={s.footerField}>{field.label}</span>
                {val !== null ? (
                  <>
                    <span className={s.footerColLabel}>{stat}</span>
                    <span className={s.footerColVal}>{val}</span>
                  </>
                ) : (
                  <span className={`${s.footerColLabel} ${s.footerColLabelMuted}`}>统计</span>
                )}
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
              </button>
            )
          })}
          <div className={s.footerSpacer} />
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
