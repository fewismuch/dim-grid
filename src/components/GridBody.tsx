// biome-ignore-all lint/a11y/noStaticElementInteractions: Prevent the grid's decorative add-column cells from being selected.
import { Button } from 'antd'
import type { RefObject } from 'react'
import {
  type Column,
  type ContextMenuComponentProps,
  DynamicDataSheetGrid as DataSheetGrid,
} from 'react-datasheet-grid'
import s from '../App.module.css'
import { type FieldDef, type GroupByState, Ic, type RowData } from '../constants'
import type useGroupWindow from '../hooks/useGroupWindow'
import { groupGridHeight } from '../model/groupWindow'
import { duplicateRow } from '../model/table'

type Props = {
  gridAreaRef: RefObject<HTMLDivElement>
  syncHorizontalScroll: (left: number) => void
  isDragging: boolean
  dragOverIndex: number
  dragFromIndex: number
  rowPixels: number
  groups: { key: string; rows: RowData[] }[] | null
  groupRange: ReturnType<typeof useGroupWindow>
  groupBy: GroupByState
  fields: FieldDef[]
  rows: RowData[]
  processedRows: RowData[]
  toggleGroup: (key: string) => void
  handleGridChange: (before: RowData[], after: RowData[]) => void
  makeRow: () => RowData
  renderContextMenu: (rows: RowData[]) => (props: ContextMenuComponentProps) => React.ReactElement
  gridColumns: Partial<Column<RowData>>[]
  getCellClass: ({ rowData, columnId }: { rowData: unknown; columnId?: string }) => string
  gutterColumn: { component: ({ rowIndex }: { rowIndex: number }) => React.ReactElement }
  addRow: () => void
}

export default function GridBody({
  gridAreaRef,
  syncHorizontalScroll,
  isDragging,
  dragOverIndex,
  dragFromIndex,
  rowPixels,
  groups,
  groupRange,
  groupBy,
  fields,
  rows,
  processedRows,
  toggleGroup,
  handleGridChange,
  makeRow,
  renderContextMenu,
  gridColumns,
  getCellClass,
  gutterColumn,
  addRow,
}: Props) {
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
          style={{ top: 38 + (dragOverIndex >= dragFromIndex ? dragOverIndex + 1 : dragOverIndex) * rowPixels }}
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
  )
}
