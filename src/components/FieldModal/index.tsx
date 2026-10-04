import { DndContext } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Button, Modal, Popover } from 'antd'
import { Fragment, useId, useState } from 'react'
import {
  FIELD_TYPES,
  type FieldDef,
  type FieldOption,
  type FieldType,
  Ic,
  newId,
  OPT_COLORS,
  OPT_TEXT_COLORS,
} from '../../constants'
import s from './styles.module.css'

interface SortableOptionProps {
  index: number
  opt: FieldOption
  onChange: (key: string, val: string) => void
  onDelete: () => void
}

function SortableOption({ index, opt, onChange, onDelete }: SortableOptionProps) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: opt.id ?? String(index),
  })
  const [pickerOpen, setPickerOpen] = useState(false)

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  const colorPicker = (
    <div className={s.colorPicker}>
      {OPT_COLORS.map((color, i) => (
        <button
          type="button"
          aria-label={`选择颜色 ${color}`}
          key={color}
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
        <button
          type="button"
          aria-label="选项颜色"
          className={s.optColor}
          style={{ '--opt-color': opt.color } as React.CSSProperties}
        />
      </Popover>
      <input
        className={s.optInput}
        value={opt.label}
        placeholder={`选项 ${index + 1}`}
        onChange={(e) => onChange('label', e.target.value)}
      />
      <Button type="text" danger aria-label="删除选项" icon={<Ic.Trash />} onClick={onDelete} />
      <button type="button" aria-label="拖动选项" className={s.optDragHandle} {...listeners} {...attributes}>
        <Ic.GripVertical />
      </button>
    </div>
  )
}

interface Props {
  field: FieldDef | null
  onSave: (data: { label: string; type: FieldType; options?: FieldOption[] }) => void
  onDelete: () => void
  onClose: () => void
}

export default function FieldModal({ field, onSave, onDelete, onClose }: Props) {
  const isEdit = !!field
  const [label, setLabel] = useState(field?.label || '')
  const [type, setType] = useState<FieldType>(field?.type || 'text')
  const labelId = useId()
  const [error, setError] = useState('')
  const [options, setOptions] = useState<FieldOption[]>(() =>
    (
      field?.options || [
        { label: '待开始', color: OPT_COLORS[0], textColor: OPT_TEXT_COLORS[0] },
        { label: '进行中', color: OPT_COLORS[1], textColor: OPT_TEXT_COLORS[1] },
        { label: '已完成', color: OPT_COLORS[2], textColor: OPT_TEXT_COLORS[2] },
      ]
    ).map((option) => ({ ...option, id: option.id ?? newId() })),
  )

  const addOpt = () => {
    const i = options.length % OPT_COLORS.length
    setOptions((o) => [...o, { id: newId(), label: '', color: OPT_COLORS[i], textColor: OPT_TEXT_COLORS[i] }])
  }
  const delOpt = (i: number) => setOptions((o) => o.filter((_, idx) => idx !== i))
  const updOpt = (i: number, key: string, val: string) =>
    setOptions((o) => o.map((x, idx) => (idx === i ? { ...x, [key]: val } : x)))

  const handleSave = () => {
    if (!label.trim()) {
      setError('请输入列名称')
      return
    }
    const cleanOpts = options.map((o) => ({ ...o, label: o.label.trim() })).filter((o) => o.label)
    if (
      new Set(cleanOpts.map((option) => option.label)).size !== cleanOpts.length &&
      ['select', 'multi_select'].includes(type)
    ) {
      setError('选项名称不能重复')
      return
    }
    onSave({
      label: label.trim(),
      type,
      options:
        type === 'select' || type === 'multi_select'
          ? cleanOpts.length
            ? cleanOpts
            : [{ id: newId(), label: '选项1', color: OPT_COLORS[0], textColor: OPT_TEXT_COLORS[0] }]
          : undefined,
    })
  }

  const sections = [...new Set(FIELD_TYPES.map((f) => f.section))]

  return (
    <Modal open title={isEdit ? '编辑列' : '新建列'} onCancel={onClose} footer={null} width={400}>
      <div className={s.body}>
        <label htmlFor={labelId} className={s.fieldLabel}>
          数据表列名
        </label>
        <input
          id={labelId}
          className={s.fieldInput}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="输入列名称"
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />

        <div className={s.fieldLabel}>列类型</div>
        <div className={s.typeGrid}>
          {sections.map((sec) => (
            <Fragment key={sec}>
              <div className={s.typeSectionLabel}>{sec}</div>
              {FIELD_TYPES.filter((f) => f.section === sec).map((ft) => (
                <button
                  type="button"
                  aria-pressed={type === ft.key}
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
              <div className={`${s.fieldLabel} ${s.fieldLabelNoMargin}`}>选项设置</div>
            </div>
            <DndContext
              onDragEnd={(e) => {
                const { active, over } = e
                if (!over || active.id === over.id) return
                const oldIdx = options.findIndex((option) => option.id === active.id)
                const newIdx = options.findIndex((option) => option.id === over.id)
                if (oldIdx === -1 || newIdx === -1) return
                setOptions((o) => arrayMove(o, oldIdx, newIdx))
              }}
            >
              <SortableContext
                items={options.map((option, i) => option.id ?? String(i))}
                strategy={verticalListSortingStrategy}
              >
                {options.map((opt, i) => (
                  <SortableOption
                    key={opt.id}
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
      {field && field.type !== type && (
        <p className={s.hint}>修改类型将转换已有数据，无法转换的值会清空；保存后可撤销恢复。</p>
      )}
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
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
    </Modal>
  )
}
