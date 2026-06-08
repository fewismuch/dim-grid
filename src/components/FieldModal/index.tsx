import { DndContext } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Button, Popover } from 'antd'
import { Fragment, useState } from 'react'
import { FIELD_TYPES, type FieldDef, type FieldOption, Ic, OPT_COLORS, OPT_TEXT_COLORS } from '../../constants'
import s from './styles.module.css'

interface SortableOptionProps {
  index: number
  opt: FieldOption
  onChange: (key: string, val: string) => void
  onDelete: () => void
}

function SortableOption({ index, opt, onChange, onDelete }: SortableOptionProps) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: String(index) })
  const [pickerOpen, setPickerOpen] = useState(false)

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  const colorPicker = (
    <div className={s.colorPicker}>
      {OPT_COLORS.map((color, i) => (
        <div
          key={i}
          onClick={() => {
            onChange('color', color)
            onChange('textColor', OPT_TEXT_COLORS[i])
            setPickerOpen(false)
          }}
          className={`${s.colorSwatch} ${opt.color === color ? s.colorSwatchSelected : ''}`}
          style={{ '--swatch-bg': color } as React.CSSProperties}
        />
      ))}
    </div>
  )

  return (
    <div ref={setNodeRef} className={s.optRow} style={style}>
      <Popover
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        content={colorPicker}
        trigger="click"
        placement="bottomLeft"
      >
        <div className={s.optColor} style={{ '--opt-color': opt.color } as React.CSSProperties} />
      </Popover>
      <input
        className={s.optInput}
        value={opt.label}
        placeholder={`选项 ${index + 1}`}
        onChange={(e) => onChange('label', e.target.value)}
      />
      <Button type="text" danger icon={<Ic.Trash />} onClick={onDelete} />
      <button className={s.optDragHandle} {...listeners} {...attributes} tabIndex={-1}>
        <Ic.GripVertical />
      </button>
    </div>
  )
}

interface Props {
  field: FieldDef | null
  onSave: (data: { label: string; type: string; options?: FieldOption[] }) => void
  onDelete: () => void
  onClose: () => void
}

export default function FieldModal({ field, onSave, onDelete, onClose }: Props) {
  const isEdit = !!field
  const [label, setLabel] = useState(field?.label || '')
  const [type, setType] = useState(field?.type || 'text')
  const [options, setOptions] = useState<FieldOption[]>(
    field?.options || [
      { label: '待开始', color: OPT_COLORS[0], textColor: OPT_TEXT_COLORS[0] },
      { label: '进行中', color: OPT_COLORS[1], textColor: OPT_TEXT_COLORS[1] },
      { label: '已完成', color: OPT_COLORS[2], textColor: OPT_TEXT_COLORS[2] },
    ],
  )

  const addOpt = () => {
    const i = options.length % OPT_COLORS.length
    setOptions((o) => [...o, { label: '', color: OPT_COLORS[i], textColor: OPT_TEXT_COLORS[i] }])
  }
  const delOpt = (i: number) => setOptions((o) => o.filter((_, idx) => idx !== i))
  const updOpt = (i: number, key: string, val: string) =>
    setOptions((o) => o.map((x, idx) => (idx === i ? { ...x, [key]: val } : x)))

  const handleSave = () => {
    if (!label.trim()) return
    const cleanOpts = options.map((o) => ({ ...o, label: o.label.trim() })).filter((o) => o.label)
    onSave({
      label: label.trim(),
      type,
      options:
        type === 'select' || type === 'multi_select'
          ? cleanOpts.length
            ? cleanOpts
            : [{ label: '选项1', color: OPT_COLORS[0], textColor: OPT_TEXT_COLORS[0] }]
          : undefined,
    })
  }

  const sections = [...new Set(FIELD_TYPES.map((f) => f.section))]

  return (
    <div className={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={s.modal}>
        <div className={s.header}>
          <h3>{isEdit ? '编辑列' : '新建列'}</h3>
          <Button type="text" icon={<Ic.X />} onClick={onClose} />
        </div>
        <div className={s.body}>
          <label className={s.fieldLabel}>数据表列名</label>
          <input
            className={s.fieldInput}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="输入列名称"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />

          <label className={s.fieldLabel}>列类型</label>
          <div className={s.typeGrid}>
            {sections.map((sec) => (
              <Fragment key={sec}>
                <div className={s.typeSectionLabel}>{sec}</div>
                {FIELD_TYPES.filter((f) => f.section === sec).map((ft) => (
                  <button
                    key={ft.key}
                    className={`${s.typeOpt} ${type === ft.key ? s.typeOptSelected : ''}`}
                    onClick={() => setType(ft.key)}
                  >
                    <ft.Icon />
                    {ft.label}
                    {type === ft.key && <span className={s.typeCheck}>✓</span>}
                  </button>
                ))}
              </Fragment>
            ))}
          </div>

          {(type === 'select' || type === 'multi_select') && (
            <div className={s.optionsWrap}>
              <div className={s.optionsHeader}>
                <label className={`${s.fieldLabel} ${s.fieldLabelNoMargin}`}>选项设置</label>
              </div>
              <DndContext
                onDragEnd={(e) => {
                  const { active, over } = e
                  if (!over || active.id === over.id) return
                  const oldIdx = options.findIndex((_, i) => String(i) === active.id)
                  const newIdx = options.findIndex((_, i) => String(i) === over.id)
                  if (oldIdx === -1 || newIdx === -1) return
                  setOptions((o) => arrayMove(o, oldIdx, newIdx))
                }}
              >
                <SortableContext items={options.map((_, i) => String(i))} strategy={verticalListSortingStrategy}>
                  {options.map((opt, i) => (
                    <SortableOption
                      key={i}
                      index={i}
                      opt={opt}
                      onChange={(key, val) => updOpt(i, key, val)}
                      onDelete={() => delOpt(i)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              <Button className={s.addOptBtn} icon={<Ic.Plus />} onClick={addOpt}>
                添加一个选项
              </Button>
            </div>
          )}
        </div>
        <div className={s.footer}>
          {isEdit && (
            <Button
              danger
              icon={<Ic.Trash />}
              onClick={() => {
                onDelete()
                onClose()
              }}
            >
              删除列
            </Button>
          )}
          <div className={isEdit ? s.footerBtnsLeft : s.footerBtnsRight}>
            <Button onClick={onClose}>取消</Button>
            <Button type="primary" onClick={handleSave}>
              确定
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
