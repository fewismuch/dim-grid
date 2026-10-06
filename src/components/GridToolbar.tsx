import { MoonOutlined, SunOutlined } from '@ant-design/icons'
import { Button, Flex, Tooltip } from 'antd'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import s from '../App.module.css'
import { type FieldDef, type FilterItem, type GroupByState, newId, type SortItem } from '../constants'
import type useTableDocument from '../hooks/useTableDocument'
import { useT } from '../locale'
import type { TableDocument } from '../model/document'
import BackupControls from './BackupControls'
import FilterPanel from './FilterPanel'
import GroupPanel from './GroupPanel'
import RowHeightMenu from './RowHeightMenu'
import SearchPanel from './SearchPanel'
import SortPanel from './SortPanel'
import TableSettings from './TableSettings'
import ViewTitle from './ViewTitle'

type Props = {
  colorMode: 'light' | 'dark'
  onToggleColorMode: () => void
  table: TableDocument
  recoveryRaw: string | null
  setView: ReturnType<typeof useTableDocument>['setView']
  setFilters: Dispatch<SetStateAction<FilterItem[]>>
  setSorts: Dispatch<SetStateAction<SortItem[]>>
  setGroupBy: Dispatch<SetStateAction<GroupByState>>
  onReorder: (fields: FieldDef[]) => void
  onToggleHide: (id: string) => void
  onTogglePin: (id: string) => void
  onAddSortForField: (id: string, dir: 'asc' | 'desc') => void
  onSearch: (value: string) => void
  onImport: (document: TableDocument) => void
  renderFieldMenu: (field: FieldDef, alwaysVisible?: boolean) => ReactNode
}

export default function GridToolbar({
  colorMode,
  onToggleColorMode,
  table,
  recoveryRaw,
  setView,
  setFilters,
  setSorts,
  setGroupBy,
  onReorder,
  onToggleHide,
  onTogglePin,
  onAddSortForField,
  onSearch,
  onImport,
  renderFieldMenu,
}: Props) {
  const t = useT()
  const {
    fields,
    view: { hiddenFields, pinnedFieldId, rowHeight, filters, groupBy, sorts },
  } = table
  return (
    <Flex className={s.toolbar} align="center" justify="space-between" gap="small" wrap>
      <ViewTitle name={table.view.name} onRename={(name) => setView('name', name)} />
      <Flex className={s.toolbarActions} align="center" justify="flex-end" gap={2} wrap>
        <TableSettings
          fields={fields}
          hiddenFields={hiddenFields}
          onReorder={onReorder}
          onToggleHide={onToggleHide}
          pinnedFieldId={pinnedFieldId}
          onTogglePin={onTogglePin}
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
          onSortAsc={() => groupBy.fieldId && onAddSortForField(groupBy.fieldId, 'asc')}
          onSortDesc={() => groupBy.fieldId && onAddSortForField(groupBy.fieldId, 'desc')}
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

        <SearchPanel onSearch={onSearch} />

        <BackupControls document={table} recoveryRaw={recoveryRaw} onImport={onImport} />

        <Tooltip title={t(colorMode === 'dark' ? '切换到浅色主题' : '切换到深色主题')}>
          <Button
            variant="text"
            icon={colorMode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
            aria-label={t(colorMode === 'dark' ? '切换到浅色主题' : '切换到深色主题')}
            onClick={onToggleColorMode}
          />
        </Tooltip>
      </Flex>
    </Flex>
  )
}
