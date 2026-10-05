import {
  CopyOutlined,
  InfoCircleOutlined,
  InsertRowLeftOutlined,
  InsertRowRightOutlined,
  PushpinOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { Button, Dropdown } from 'antd'
import { Ic } from '../../constants'
import { useT } from '../../locale'
import styles from './styles.module.css'

interface Props {
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
  onPin: () => void
  pinned: boolean
  highlighted: boolean
  alwaysVisible?: boolean
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
  onPin,
  pinned,
  highlighted,
  alwaysVisible = false,
}: Props) {
  const t = useT()
  const items: MenuProps['items'] = [
    { key: 'edit', label: t('编辑列'), icon: <Ic.Edit />, onClick: onEdit },
    { key: 'duplicate', label: t('复制列'), icon: <CopyOutlined style={{ fontSize: 13 }} />, onClick: onDuplicate },
    {
      key: 'insertLeft',
      label: t('向左插入列'),
      icon: <InsertRowLeftOutlined style={{ fontSize: 13 }} />,
      onClick: onInsertLeft,
    },
    {
      key: 'insertRight',
      label: t('向右插入列'),
      icon: <InsertRowRightOutlined style={{ fontSize: 13 }} />,
      onClick: onInsertRight,
    },
    { type: 'divider' },
    { key: 'pin', label: pinned ? t('取消固定列') : t('固定到左侧'), icon: <PushpinOutlined />, onClick: onPin },
    { type: 'divider' },
    { key: 'groupBy', label: t('按本列分组'), icon: <Ic.Group />, onClick: onGroupBy },
    { key: 'filter', label: t('按本列筛选'), icon: <Ic.Filter />, onClick: onFilter },
    { type: 'divider' },
    { key: 'sortAsc', label: t('升序'), icon: <SortDescendingOutlined style={{ fontSize: 13 }} />, onClick: onSortAsc },
    {
      key: 'sortDesc',
      label: t('降序'),
      icon: <SortAscendingOutlined style={{ fontSize: 13 }} />,
      onClick: onSortDesc,
    },
    { type: 'divider' },
    {
      key: 'highlight',
      label: highlighted ? t('取消高亮重复值') : t('高亮重复值'),
      icon: <InfoCircleOutlined style={{ fontSize: 13 }} />,
      onClick: onToggleHighlight,
    },
    { type: 'divider' },
    { key: 'delete', label: t('删除列'), icon: <Ic.Trash />, onClick: onDelete, danger: true },
  ]

  return (
    <div className={`${styles.colMenu} ${alwaysVisible ? styles.alwaysVisible : ''}`}>
      <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight" arrow>
        <Button
          onMouseDown={(e) => e.stopPropagation()}
          aria-label={t('列操作')}
          size="small"
          type="text"
          icon={<Ic.Settings />}
        />
      </Dropdown>
    </div>
  )
}
