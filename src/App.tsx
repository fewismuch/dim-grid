import { Alert, Button, ConfigProvider, type ThemeConfig } from 'antd'
import type React from 'react'
import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react'
import type { ContextMenuComponentProps } from 'react-datasheet-grid'
import 'react-datasheet-grid/dist/style.css'
import s from './App.module.css'
import ColumnMenu from './components/ColumnMenu'
import { ContextMenu } from './components/ContextMenu'
import GridBody from './components/GridBody'
import GridFooter from './components/GridFooter'
import GridToolbar from './components/GridToolbar'
import {
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
import useColumnResize from './hooks/useColumnResize'
import useFooterLayout from './hooks/useFooterLayout'
import useGridColumns from './hooks/useGridColumns'
import useGroupWindow from './hooks/useGroupWindow'
import useRowReorder from './hooks/useRowReorder'
import useTableDocument from './hooks/useTableDocument'
import { antLocales, type GridLocale, LocaleContext, useGridLocale, useT } from './locale'
import { columnWidth } from './model/columnWidth'
import type { TableDocument } from './model/document'
import { newField } from './model/document'
import { ROW_HEIGHT } from './model/rowHeight'
import { cellText, createRow, duplicateValues, processRows, textColorTarget } from './model/table'

const FieldModal = lazy(() => import('./components/FieldModal'))

export interface DimGridProps {
  /** UI language; defaults to Simplified Chinese. */
  locale?: GridLocale
  /** Ant Design theme tokens for controls rendered by the grid. */
  theme?: ThemeConfig
  /** Data used on first mount when this storage key has no saved document. */
  initialData?: Pick<TableDocument, 'fields' | 'rows'> & { view?: TableDocument['view'] }
  /** Read and save data in localStorage; defaults to true. */
  enableLocalStorage?: boolean
  /** A unique key is recommended when several grids share the same origin. */
  storageKey?: string
  /** Height of the grid container; defaults to 100%. */
  height?: React.CSSProperties['height']
  className?: string
  style?: React.CSSProperties
}

function Grid({
  initialData,
  enableLocalStorage = true,
  storageKey,
  height = '100%',
  className,
  style,
  theme,
}: DimGridProps) {
  const t = useT()
  const locale = useGridLocale()
  const rootRef = useRef<HTMLDivElement>(null)
  const {
    document: table,
    execute,
    setView,
    saveError,
    recoveryRaw,
    replaceDocument,
  } = useTableDocument(storageKey, rootRef, initialData, enableLocalStorage)
  const { fields, rows } = table
  const { filters, groupBy, sorts, colStats, hiddenFields, highlightDupes, pinnedFieldId, rowHeight } = table.view
  const rowPixels = ROW_HEIGHT[rowHeight].pixels
  const visibleLines = ROW_HEIGHT[rowHeight].lines
  const [modal, setModal] = useState<ModalState | null>(null)
  const [search, setSearch] = useState('')
  const [statsMenu, setStatsMenu] = useState<string | null>(null)
  const { resizingColumnId, columnPreview, startResize } = useColumnResize(execute)
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

  const { isDragging, dragOverIndex, dragFromRef, moveRow, handleGutterMouseDown } = useRowReorder(
    execute,
    gridAreaRef,
    canReorderRows,
    rows.length,
    rowPixels,
  )

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
    (id: string) => execute({ type: 'field/duplicate', id, newId: newId(), suffix: t('副本') }),
    [execute, t],
  )
  const insertField = useCallback(
    (id: string, offset: number) => {
      const command = newField({ fields }, id, offset, t('文本'))
      if (command) execute(command)
    },
    [fields, execute, t],
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
    () => processRows(rows, fields, filters, sorts, search, locale),
    [rows, fields, filters, sorts, search, locale],
  )
  const columnWidths = useMemo(
    () => Object.fromEntries(fields.map((field) => [field.id, columnWidth(field, rows)])),
    [fields, rows],
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

  const gridColumns = useGridColumns({
    orderedFields,
    columnWidths,
    pinnedFieldId,
    columnPreview,
    visibleLines,
    renderFieldMenu,
    startResize,
    execute,
    openAdd,
  })

  const renderContextMenu = (viewRows: RowData[]) => (props: ContextMenuComponentProps) => {
    const target = textColorTarget(viewRows, orderedFields, props.cursorIndex)
    return (
      <ContextMenu
        {...props}
        textColor={target?.row.__cellColors?.[target.field.id] ?? null}
        onTextColorChange={
          target
            ? (color) => execute({ type: 'cell/text-color', rowId: target.row.id, fieldId: target.field.id, color })
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
            aria-label={`${t('拖动记录')} ${rowIndex + 1}`}
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
    [handleGutterMouseDown, canReorderRows, moveRow, t],
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

  return (
    <div
      ref={rootRef}
      className={`${s.app} dim-grid${className ? ` ${className}` : ''}`}
      style={{ ...style, height, '--color-primary': theme?.token?.colorPrimary ?? '#00b96b' } as React.CSSProperties}
    >
      <GridToolbar
        table={table}
        recoveryRaw={recoveryRaw}
        setView={setView}
        setFilters={setFilters}
        setSorts={setSorts}
        setGroupBy={setGroupBy}
        onReorder={handleFieldsReorder}
        onToggleHide={toggleFieldVisibility}
        onTogglePin={togglePin}
        onAddSortForField={addSortForField}
        onSearch={setSearch}
        onImport={(document) => {
          replaceDocument(document)
          setSearch('')
        }}
        renderFieldMenu={renderFieldMenu}
      />

      {saveError && <Alert type="error" showIcon title={t(saveError)} role="alert" />}
      <GridBody
        gridAreaRef={gridAreaRef}
        syncHorizontalScroll={syncHorizontalScroll}
        isDragging={isDragging}
        dragOverIndex={dragOverIndex}
        dragFromIndex={dragFromRef.current}
        rowPixels={rowPixels}
        groups={groups}
        groupRange={groupRange}
        groupBy={groupBy}
        fields={fields}
        rows={rows}
        processedRows={processedRows}
        toggleGroup={toggleGroup}
        handleGridChange={handleGridChange}
        makeRow={makeRow}
        renderContextMenu={renderContextMenu}
        gridColumns={gridColumns}
        getCellClass={getCellClass}
        gutterColumn={gutterColumn}
        addRow={addRow}
      />

      <GridFooter
        orderedFields={orderedFields}
        columnWidths={columnWidths}
        pinnedFieldId={pinnedFieldId}
        columnPreview={columnPreview}
        processedRows={processedRows}
        colStats={colStats}
        setColStats={setColStats}
        statsMenu={statsMenu}
        setStatsMenu={setStatsMenu}
        footerScrollRef={footerScrollRef}
        footerWidth={footerWidth}
        syncHorizontalScroll={syncHorizontalScroll}
      />

      {modal && (
        <Suspense
          fallback={
            <div role="status" className={s.loading}>
              {t('正在加载…')}
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

export default function App({ locale = 'zh-CN', theme, ...props }: DimGridProps) {
  return (
    <LocaleContext.Provider value={locale}>
      <ConfigProvider locale={antLocales[locale]} theme={theme ?? { token: { colorPrimary: '#00b96b' } }}>
        <Grid {...props} theme={theme} />
      </ConfigProvider>
    </LocaleContext.Provider>
  )
}
