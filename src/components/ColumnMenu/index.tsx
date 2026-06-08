import { ArrowDownOutlined, ArrowUpOutlined, CopyOutlined, InfoCircleOutlined, PlusOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { Button, Dropdown } from 'antd'
import { createStyles } from 'antd-style'
import { useCallback } from 'react'
import { Ic } from '../../constants'

const useStyles = createStyles(() => ({
  colMenu: {
    display: 'flex',
    alignItems: 'center',
    opacity: 0,
    marginLeft: 'auto',
    '.dsg-cell-header:hover &': {
      opacity: 1,
    },
  },
}))

interface Props {
  fieldId: string
  onEdit: () => void
  onDuplicate: () => void
  onInsertLeft: () => void
  onInsertRight: () => void
  onGroupBy: () => void
  onFilter: () => void
  onSortAsc: () => void
  onSortDesc: () => void
  onToggleHighlight: () => void
  onDelete: () => void
}

export default function ColumnMenu({
  onEdit,
  onDuplicate,
  onInsertLeft,
  onInsertRight,
  onGroupBy,
  onFilter,
  onSortAsc,
  onSortDesc,
  onToggleHighlight,
  onDelete,
}: Props) {
  const { styles } = useStyles()

  const items: MenuProps['items'] = [
    { key: 'edit', label: '编辑列', icon: <Ic.Edit />, onClick: onEdit },
    { key: 'duplicate', label: '复制列', icon: <CopyOutlined style={{ fontSize: 13 }} />, onClick: onDuplicate },
    { key: 'insertLeft', label: '向左插入列', icon: <PlusOutlined style={{ fontSize: 13 }} />, onClick: onInsertLeft },
    {
      key: 'insertRight',
      label: '向右插入列',
      icon: <PlusOutlined style={{ fontSize: 13 }} />,
      onClick: onInsertRight,
    },
    { type: 'divider' },
    { key: 'groupBy', label: '按本列分组', icon: <Ic.Group />, onClick: onGroupBy },
    { key: 'filter', label: '按本列筛选', icon: <Ic.Filter />, onClick: onFilter },
    { type: 'divider' },
    { key: 'sortAsc', label: '升序', icon: <ArrowUpOutlined style={{ fontSize: 13 }} />, onClick: onSortAsc },
    { key: 'sortDesc', label: '降序', icon: <ArrowDownOutlined style={{ fontSize: 13 }} />, onClick: onSortDesc },
    { type: 'divider' },
    {
      key: 'highlight',
      label: '高亮重复值',
      icon: <InfoCircleOutlined style={{ fontSize: 13 }} />,
      onClick: onToggleHighlight,
    },
    { type: 'divider' },
    { key: 'delete', label: '删除列', icon: <Ic.Trash />, onClick: onDelete, danger: true },
  ]

  const renderItem = useCallback((item: any) => {
    if (item.type === 'divider') return { type: 'divider' as const }
    return {
      key: item.key,
      icon: item.icon,
      label: item.label,
      danger: item.danger,
      onClick: item.onClick,
    }
  }, [])

  const menuItems: MenuProps['items'] = items.map(renderItem)

  return (
    <div className={styles.colMenu} onMouseDown={(e) => e.stopPropagation()}>
      <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
        <Button size="small" type="text" style={{ color: 'inherit' }}>
          <Ic.Settings />
        </Button>
      </Dropdown>
    </div>
  )
}
