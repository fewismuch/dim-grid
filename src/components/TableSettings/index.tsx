import { PushpinFilled, PushpinOutlined } from '@ant-design/icons'
import { closestCenter, DndContext, type DragEndEvent, DragOverlay, type DragStartEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Button, Popover, Tooltip } from 'antd'
import { type ReactNode, useCallback, useState } from 'react'
import { FIELD_TYPES, type FieldDef, Ic } from '../../constants'
import { useT } from '../../locale'
import s from './styles.module.css'

interface DraggableFieldProps {
  field: FieldDef
  hidden: boolean
  onToggle: () => void
  pinned: boolean
  onPin: () => void
  menu: ReactNode
}

function DraggableField({ field, hidden, onToggle, pinned, onPin, menu }: DraggableFieldProps) {
  const t = useT()
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: field.id })

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div ref={setNodeRef} className={`${s.row}${hidden ? ` ${s.rowHidden}` : ''}`} style={style}>
      <Button
        type="text"
        size="small"
        aria-label={`${t('移动')} ${field.label}`}
        className={s.dragHandle}
        icon={<Ic.GripVertical />}
        {...listeners}
        {...attributes}
      />
      <span className={s.fieldName}>
        {(() => {
          const Icon = FIELD_TYPES.find((f) => f.key === field.type)?.Icon || Ic.Text
          return <Icon />
        })()} {field.label}
      </span>
      <Button
        type="text"
        size="small"
        icon={hidden ? <Ic.EyeOff /> : <Ic.Eye />}
        aria-label={`${hidden ? t('显示') : t('隐藏')} ${field.label} ${t('列')}`}
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        title={hidden ? t('显示') : t('隐藏')}
      />
      <Button
        size="small"
        color={pinned ? 'primary' : 'default'}
        variant="text"
        icon={pinned ? <PushpinFilled /> : <PushpinOutlined />}
        aria-label={`${pinned ? t('取消固定') : t('固定')} ${field.label} ${t('列')}`}
        aria-pressed={pinned}
        title={pinned ? t('取消固定列') : t('固定到左侧（每次一列）')}
        onClick={onPin}
      />
      <span className={s.settingsButton}>{menu}</span>
    </div>
  )
}

interface Props {
  fields: FieldDef[]
  hiddenFields: Set<string>
  onReorder: (newFields: FieldDef[]) => void
  onToggleHide: (fieldId: string) => void
  pinnedFieldId: string
  onTogglePin: (fieldId: string) => void
  renderMenu: (field: FieldDef) => ReactNode
}

export default function TableSettings({
  fields,
  hiddenFields,
  onReorder,
  onToggleHide,
  pinnedFieldId,
  onTogglePin,
  renderMenu,
}: Props) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = fields.findIndex((f: FieldDef) => f.id === active.id)
      const newIndex = fields.findIndex((f: FieldDef) => f.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      onReorder(arrayMove(fields, oldIndex, newIndex))
    },
    [fields, onReorder],
  )

  const activeField = activeId ? fields.find((f: FieldDef) => f.id === activeId) : null

  const content = (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={fields.map((f: FieldDef) => f.id)} strategy={verticalListSortingStrategy}>
        <div className={s.panelPopover}>
          {fields.length === 0 && <div className={s.emptyHint}>{t('暂无列')}</div>}
          {fields.map((field: FieldDef) => (
            <DraggableField
              key={field.id}
              field={field}
              hidden={hiddenFields.has(field.id)}
              onToggle={() => onToggleHide(field.id)}
              pinned={pinnedFieldId === field.id}
              onPin={() => onTogglePin(field.id)}
              menu={renderMenu(field)}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeField ? (
          <div className={s.rowDragging}>
            {(() => {
              const Icon = FIELD_TYPES.find((f) => f.key === activeField.type)?.Icon || Ic.Text
              return <Icon />
            })()}
            <span className={s.fieldName}>{activeField.label}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )

  return (
    <Popover open={open} onOpenChange={setOpen} content={content} trigger="click" placement="bottomLeft">
      <Tooltip title={t('表格设置')}>
        <Button color={open ? 'primary' : 'default'} variant="text" icon={<Ic.Settings />} />
      </Tooltip>
    </Popover>
  )
}
