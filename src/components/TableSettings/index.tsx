import { closestCenter, DndContext, DragOverlay } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Popover } from 'antd'
import { useCallback, useState } from 'react'
import { FIELD_TYPES, type FieldDef, Ic } from '../../constants'
import s from './styles.module.css'

interface DraggableFieldProps {
  field: FieldDef
  hidden: boolean
  onToggle: () => void
}

function DraggableField({ field, hidden, onToggle }: DraggableFieldProps) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: field.id })

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div ref={setNodeRef} className={`${s.row}${hidden ? ` ${s.rowHidden}` : ''}`} style={style}>
      <button className={s.dragHandle} {...listeners} {...attributes} tabIndex={-1}>
        <Ic.GripVertical />
      </button>
      <span className={s.fieldName}>
        {(() => {
          const Icon = FIELD_TYPES.find((f) => f.key === field.type)?.Icon || Ic.Text
          return <Icon />
        })()} {field.label}
      </span>
      <button
        className={s.visBtn}
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        title={hidden ? '显示' : '隐藏'}
      >
        {hidden ? <Ic.EyeOff /> : <Ic.Eye />}
      </button>
    </div>
  )
}

interface Props {
  fields: FieldDef[]
  hiddenFields: Set<string>
  onReorder: (newFields: FieldDef[]) => void
  onToggleHide: (fieldId: string) => void
}

export default function TableSettings({ fields, hiddenFields, onReorder, onToggleHide }: Props) {
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const handleDragStart = useCallback((event: any) => {
    setActiveId(event.active.id)
  }, [])

  const handleDragEnd = useCallback(
    (event: any) => {
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
    <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <SortableContext items={fields.map((f: FieldDef) => f.id)} strategy={verticalListSortingStrategy}>
        <div className={s.panelPopover}>
          <div className={s.panelHeader}>表格设置</div>
          {fields.length === 0 && <div className={s.emptyHint}>暂无列</div>}
          {fields.map((field: FieldDef) => (
            <DraggableField
              key={field.id}
              field={field}
              hidden={hiddenFields.has(field.id)}
              onToggle={() => onToggleHide(field.id)}
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
      <button className={`tb-btn ${open ? 'active' : ''}`}>
        <Ic.Settings />
        表格设置
      </button>
    </Popover>
  )
}
