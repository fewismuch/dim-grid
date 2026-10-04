import { Button, Input, Popover, Select, Tooltip } from 'antd'
import { useState } from 'react'
import { type FieldDef, type FilterItem, Ic } from '../../constants'
import s from './styles.module.css'

interface Props {
  fields: FieldDef[]
  filters: FilterItem[]
  onAdd: () => void
  onUpdate: (id: string, key: string, val: string) => void
  onDelete: (id: string) => void
}

const OP_OPTIONS = [
  { value: 'contains', label: '包含' },
  { value: 'not_contains', label: '不包含' },
  { value: 'equals', label: '等于' },
  { value: 'not_equals', label: '不等于' },
  { value: 'empty', label: '为空' },
  { value: 'not_empty', label: '不为空' },
]

export default function FilterPanel({ fields, filters, onAdd, onUpdate, onDelete }: Props) {
  const [open, setOpen] = useState(false)
  const activeCount = filters.filter((f) => f.fieldId && (f.op === 'empty' || f.op === 'not_empty' || f.value)).length

  const content = (
    <div className={s.panel}>
      {filters.length === 0 && <div className={s.emptyHint}>暂无筛选条件</div>}
      {filters.map((f) => (
        <div key={f.id} className={s.row}>
          <Select
            className={s.fieldSelect}
            value={f.fieldId || undefined}
            onChange={(val) => onUpdate(f.id, 'fieldId', val)}
            options={fields.map((field) => ({ value: field.id, label: field.label }))}
          />
          <Select
            className={s.opSelect}
            value={f.op}
            onChange={(val) => onUpdate(f.id, 'op', val)}
            options={OP_OPTIONS}
          />
          {f.op !== 'empty' && f.op !== 'not_empty' && (
            <Input
              className={s.valueInput}
              value={f.value}
              onChange={(e) => onUpdate(f.id, 'value', e.target.value)}
              placeholder="输入值"
            />
          )}
          <Button type="text" danger aria-label="删除条件" icon={<Ic.X />} onClick={() => onDelete(f.id)} />
        </div>
      ))}
      <Button type="link" onClick={onAdd} disabled={!fields.length}>
        <Ic.Plus />
        添加筛选条件
      </Button>
    </div>
  )

  return (
    <Popover open={open} onOpenChange={setOpen} content={content} trigger="click" placement="bottomLeft">
      <Tooltip title={activeCount > 0 ? `筛选 (${activeCount})` : '筛选'}>
        <Button color={activeCount > 0 ? 'primary' : 'default'} variant="text" icon={<Ic.Filter />} />
      </Tooltip>
    </Popover>
  )
}
