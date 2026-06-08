import { Button } from 'antd'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DataSheetGrid } from 'react-datasheet-grid'
import 'react-datasheet-grid/dist/style.css'
import s from './App.module.css'
import buildDsgCol from './buildDsgCol'
import ColumnMenu from './components/ColumnMenu'
import { ContextMenu } from './components/ContextMenu'
import FieldModal from './components/FieldModal/index'
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
  type FilterItem,
  type GroupByState,
  Ic,
  type ModalState,
  newId,
  type RowData,
  type SortItem,
} from './constants'

const initFields: FieldDef[] = [
  { id: 'f1', label: '文本', type: 'text' },
  {
    id: 'f2',
    label: '单选',
    type: 'select',
    options: [
      { label: '待开始', color: '#e8f8f0', textColor: '#0a6640' },
      { label: '进行中', color: '#fef3d0', textColor: '#7a5800' },
      { label: '已完成', color: '#e8f0fe', textColor: '#1a3a8f' },
    ],
  },
  { id: 'f3', label: '日期', type: 'date' },
]
const initRows: RowData[] = [
  { f1: '任务 A', f2: '进行中', f3: new Date('2024-03-15') },
  { f1: '', f2: '', f3: null },
  { f1: '', f2: '', f3: null },
]

export default function App() {
  const [fields, setFields] = useState<FieldDef[]>(initFields)
  const [rows, setRows] = useState<RowData[]>(initRows)
  const [modal, setModal] = useState<ModalState | null>(null)

  const [filters, setFilters] = useState<FilterItem[]>([])
  const [groupBy, setGroupBy] = useState<GroupByState>({ fieldId: '', collapsed: new Set() })
  const [sorts, setSorts] = useState<SortItem[]>([])
  const [search, setSearch] = useState('')
  const [colStats, setColStats] = useState<Record<string, string>>({})
  const [statsMenu, setStatsMenu] = useState<string | null>(null)
  const [hiddenFields, setHiddenFields] = useState<Set<string>>(new Set())
  const [highlightDupes, setHighlightDupes] = useState<Set<string>>(new Set())

  const [isDragging, setIsDragging] = useState(false)
  const [dragOverIndex, setDragOverIndex] = useState(-1)
  const dragFromRef = useRef(-1)
  const dragOverRef = useRef(-1)
  const dragRowsLenRef = useRef(0)
  const gridAreaRef = useRef<HTMLDivElement>(null)

  const toggleFieldVisibility = useCallback((fieldId: string) => {
    setHiddenFields((prev) => {
      const next = new Set(prev)
      if (next.has(fieldId)) next.delete(fieldId)
      else next.add(fieldId)
      return next
    })
  }, [])

  const handleFieldsReorder = useCallback((newFields: FieldDef[]) => {
    setFields(newFields)
  }, [])

  const duplicateField = useCallback(
    (fieldId: string) => {
      const idx = fields.findIndex((f) => f.id === fieldId)
      if (idx === -1) return
      const src = fields[idx]
      const id = newId()
      setFields((f) => [...f.slice(0, idx + 1), { ...src, id, label: `${src.label} 副本` }, ...f.slice(idx + 1)])
      setRows((r) => r.map((row) => ({ ...row, [id]: row[fieldId] })))
    },
    [fields],
  )

  const insertField = useCallback(
    (fieldId: string, offset: number) => {
      const idx = fields.findIndex((f) => f.id === fieldId)
      if (idx === -1) return
      const id = newId()
      setFields((f) => [
        ...f.slice(0, idx + offset),
        { id, label: '新列', type: 'text' as const },
        ...f.slice(idx + offset),
      ])
      setRows((r) => r.map((row) => ({ ...row, [id]: '' })))
    },
    [fields],
  )

  const toggleHighlight = useCallback((fieldId: string) => {
    setHighlightDupes((prev) => {
      const next = new Set(prev)
      if (next.has(fieldId)) next.delete(fieldId)
      else next.add(fieldId)
      return next
    })
  }, [])

  const addFilterForField = useCallback((fieldId: string) => {
    setFilters((f) => [...f, { id: newId(), fieldId, op: 'contains', value: '' }])
  }, [])

  const addSortForField = useCallback((fieldId: string, dir: 'asc' | 'desc') => {
    setSorts((s) => {
      const existing = s.findIndex((x) => x.fieldId === fieldId)
      if (existing !== -1) return s.map((x, i) => (i === existing ? { ...x, dir } : x))
      return [...s, { id: newId(), fieldId, dir }]
    })
  }, [])

  const deleteField = useCallback((fieldId: string) => {
    setFields((f) => f.filter((x) => x.id !== fieldId))
    setRows((r) =>
      r.map((row) => {
        const n = { ...row }
        delete n[fieldId]
        return n
      }),
    )
  }, [])

  const handleGutterMouseDown = useCallback(
    (rowIndex: number, e: React.MouseEvent) => {
      if (groupBy.fieldId) return
      e.preventDefault()
      e.stopPropagation()
      dragFromRef.current = rowIndex
      dragOverRef.current = rowIndex
      dragRowsLenRef.current = rows.length
      setIsDragging(true)
      setDragOverIndex(rowIndex)
    },
    [groupBy.fieldId, rows.length],
  )

  useEffect(() => {
    if (!isDragging) return
    const rowH = 36
    const headerH = 38
    const onMove = (e: MouseEvent) => {
      const el = gridAreaRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const scrollTop = el.scrollTop
      const relY = e.clientY - rect.top + scrollTop - headerH
      const index = Math.max(0, Math.min(Math.floor(relY / rowH), dragRowsLenRef.current - 1))
      dragOverRef.current = index
      setDragOverIndex(index)
    }
    const onUp = () => {
      const from = dragFromRef.current
      const over = dragOverRef.current
      if (from !== -1 && over !== -1 && from !== over) {
        setRows((prev) => {
          const next = [...prev]
          const [moved] = next.splice(from, 1)
          next.splice(over, 0, moved)
          return next
        })
      }
      setIsDragging(false)
      setDragOverIndex(-1)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [isDragging])

  const openAdd = useCallback(() => setModal({ mode: 'add' }), [])
  const openEdit = useCallback((fieldId: string) => setModal({ mode: 'edit', fieldId }), [])
  const closeModal = () => setModal(null)

  const handleSave = ({ label, type, options }: { label: string; type: string; options?: FieldOption[] }) => {
    if (modal?.mode === 'add') {
      const id = newId()
      setFields((f) => [...f, { id, label, type, options }])
      setRows((r) =>
        r.map((row) => ({
          ...row,
          [id]:
            type === 'checkbox'
              ? false
              : type === 'multi_select'
                ? '[]'
                : type === 'link'
                  ? '{}'
                  : type === 'date' || type === 'number' || type === 'float'
                    ? null
                    : '',
        })),
      )
    } else {
      setFields((f) => f.map((field) => (field.id === modal?.fieldId ? { ...field, label, type, options } : field)))
    }
    closeModal()
  }
  const handleDelete = () => {
    const id = modal?.fieldId!
    setFields((f) => f.filter((field) => field.id !== id))
    setRows((r) =>
      r.map((row) => {
        const n = { ...row }
        delete n[id]
        return n
      }),
    )
  }

  const processedRows = useMemo(() => {
    let result = [...rows]
    filters.forEach(({ fieldId, op, value }) => {
      if (!fieldId || !value) return
      result = result.filter((row) => {
        const v = String(row[fieldId] || '').toLowerCase()
        const val = value.toLowerCase()
        if (op === 'contains') return v.includes(val)
        if (op === 'not_contains') return !v.includes(val)
        if (op === 'equals') return v === val
        if (op === 'not_equals') return v !== val
        if (op === 'empty') return !row[fieldId] || row[fieldId] === ''
        if (op === 'not_empty') return !!row[fieldId] && row[fieldId] !== ''
        return true
      })
    })
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((row) =>
        fields.some((f) =>
          String(row[f.id] || '')
            .toLowerCase()
            .includes(q),
        ),
      )
    }
    if (sorts.length) {
      result.sort((a, b) => {
        for (const { fieldId, dir } of sorts) {
          const va = String(a[fieldId] || '')
          const vb = String(b[fieldId] || '')
          const cmp = va.localeCompare(vb, 'zh')
          if (cmp !== 0) return dir === 'asc' ? cmp : -cmp
        }
        return 0
      })
    }
    return result
  }, [rows, filters, sorts, search, fields])

  const groups: { key: string; rows: RowData[] }[] | null = useMemo(() => {
    if (!groupBy.fieldId) return null
    const map = new Map<string, RowData[]>()
    processedRows.forEach((row) => {
      const key = String(row[groupBy.fieldId] || '')
      if (!map.has(key)) map.set(key, [])
      map.get(key)?.push(row)
    })
    return [...map.entries()].map(([key, rows]) => ({ key, rows }))
  }, [processedRows, groupBy.fieldId])

  const toggleGroup = (key: string) =>
    setGroupBy((g) => {
      const c = new Set(g.collapsed)
      c.has(key) ? c.delete(key) : c.add(key)
      return { ...g, collapsed: c }
    })

  const visibleFields = useMemo(() => fields.filter((f) => !hiddenFields.has(f.id)), [fields, hiddenFields])

  const dupeCellClass = useMemo(() => {
    if (!highlightDupes.size) return null
    return (fieldId: string, rowData: RowData) => {
      const val = String(rowData[fieldId] ?? '')
      return val && rows.filter((r) => String(r[fieldId] ?? '') === val).length > 1 ? 'dsg-cell-dupe' : ''
    }
  }, [highlightDupes, rows])

  const dsgColumns = useMemo<any[]>(
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
        cellClassName: highlightDupes.has(field.id)
          ? ({ rowData }: { rowData: RowData }) => dupeCellClass?.(field.id, rowData)
          : undefined,
      })),
      {
        id: '__add__',
        title: <Button type="text" icon={<Ic.Plus />} className="add-col-th-btn" onClick={openAdd} />,
        component: () => null,
        width: 48,
        minWidth: 48,
        disabled: true,
      },
    ],
    [
      visibleFields,
      openEdit,
      openAdd,
      highlightDupes,
      duplicateField,
      insertField,
      addFilterForField,
      addSortForField,
      toggleHighlight,
      deleteField,
      dupeCellClass,
    ],
  )

  const gutterColumn = useMemo(
    () => ({
      component: ({ rowIndex }: { rowIndex: number }) => (
        <div className="dsg-gutter-cell">
          <span className="dsg-gutter-index">{rowIndex + 1}</span>
          <span className="dsg-gutter-grip" onMouseDown={(e: React.MouseEvent) => handleGutterMouseDown(rowIndex, e)}>
            <Ic.GripVertical />
          </span>
        </div>
      ),
    }),
    [handleGutterMouseDown],
  )

  const addRow = () => {
    const row: RowData = {}
    fields.forEach((f) => {
      if (f.type === 'checkbox') row[f.id] = false
      else if (f.type === 'multi_select') row[f.id] = '[]'
      else if (f.type === 'link') row[f.id] = '{}'
      else if (f.type === 'date') row[f.id] = null
      else if (f.type === 'number' || f.type === 'float') row[f.id] = null
      else row[f.id] = ''
    })
    setRows((r) => [...r, row])
  }

  const activeFilters = filters.filter((f) => f.fieldId && (f.op === 'empty' || f.op === 'not_empty' || f.value))

  const handleGridChange = (newProcessed: RowData[]) => {
    const isFiltered = activeFilters.length > 0 || search.trim() || sorts.length > 0
    if (!isFiltered) {
      setRows(newProcessed)
      return
    }
    const updateMap = new Map<RowData, RowData>()
    processedRows.forEach((orig, i) => {
      updateMap.set(orig, newProcessed[i])
    })
    setRows((prev) => prev.map((row) => (updateMap.has(row) ? updateMap.get(row)! : row)))
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
      </div>

      <div className={s.gridArea} ref={gridAreaRef}>
        {isDragging && (
          <div
            className="dsg-drag-indicator"
            style={{ top: 38 + (dragOverIndex >= dragFromRef.current ? dragOverIndex + 1 : dragOverIndex) * 36 }}
          />
        )}
        {groups ? (
          groups.map(({ key, rows: gRows }) => (
            <div key={key}>
              <div className="group-header-row" onClick={() => toggleGroup(key)}>
                {groupBy.collapsed.has(key) ? <Ic.ChevR /> : <Ic.ChevD />}
                {getGroupBadge(key, groupBy.fieldId)}
                <span className={s.groupRowCount}>{gRows.length} 条记录</span>
              </div>
              {!groupBy.collapsed.has(key) && (
                <DataSheetGrid
                  key={
                    visibleFields
                      .map((f) => f.id + f.label + f.type + (f.options ? JSON.stringify(f.options) : ''))
                      .join('|') +
                    '_hl_' +
                    [...highlightDupes].sort().join(',') +
                    '_' +
                    key
                  }
                  value={gRows}
                  onChange={(newRows) => {
                    setRows((prev) => {
                      const updated = [...prev]
                      gRows.forEach((orig, i) => {
                        const idx = prev.indexOf(orig)
                        if (idx !== -1) updated[idx] = newRows[i]
                      })
                      return updated
                    })
                  }}
                  columns={dsgColumns}
                  gutterColumn={gutterColumn}
                  addRowsComponent={false}
                  rowHeight={36}
                  headerRowHeight={groupBy.collapsed.has(key) ? 0 : 38}
                />
              )}
            </div>
          ))
        ) : (
          <DataSheetGrid
            key={
              visibleFields
                .map((f) => f.id + f.label + f.type + (f.options ? JSON.stringify(f.options) : ''))
                .join('|') +
              '_hl_' +
              [...highlightDupes].sort().join(',')
            }
            value={processedRows}
            onChange={handleGridChange}
            columns={dsgColumns}
            gutterColumn={gutterColumn}
            addRowsComponent={false}
            rowHeight={36}
            headerRowHeight={38}
            contextMenuComponent={ContextMenu}
          />
        )}
        <Button type="text" className="add-row-btn" onClick={addRow} icon={<Ic.Plus />}>
          添加记录
        </Button>
      </div>

      <div className={s.footer}>
        <div className={s.footerScroll}>
          <div className={s.footerTotal}></div>
          {visibleFields.map((field, fi) => {
            const isFirst = fi === 0
            const stat = colStats[field.id] || (isFirst ? '记录总数' : '不展示')
            const val = calcStat(stat, processedRows, field.id)
            return (
              <div
                key={field.id}
                className={s.footerCol}
                onClick={() => setStatsMenu(statsMenu === field.id ? null : field.id)}
              >
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
                    onSelect={(s) => setColStats((c) => ({ ...c, [field.id]: s }))}
                    onClose={() => setStatsMenu(null)}
                  />
                )}
              </div>
            )
          })}
          <div className={s.footerSpacer} />
        </div>
      </div>

      {modal && (
        <FieldModal
          field={modal.mode === 'edit' ? fields.find((f) => f.id === modal.fieldId) || null : null}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
