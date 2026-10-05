import { Button, Input, Popover, Select, Tooltip } from 'antd'
import { useState } from 'react'
import { type FieldDef, type FilterItem, Ic } from '../../constants'
import { useT } from '../../locale'
import { isComparableField } from '../../model/table'
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
const COMPARISON_OPTIONS = [
  { value: 'greater', label: '大于' },
  { value: 'greater_equal', label: '大于等于' },
  { value: 'less', label: '小于' },
  { value: 'less_equal', label: '小于等于' },
]

export default function FilterPanel({ fields, filters, onAdd, onUpdate, onDelete }: Props) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const activeCount = filters.filter((f) => f.fieldId && (f.op === 'empty' || f.op === 'not_empty' || f.value)).length

  const content = (
    <div className={s.panel}>
      {filters.length === 0 && <div className={s.emptyHint}>{t('暂无筛选条件')}</div>}
      {filters.map((f) => (
        <div key={f.id} className={s.row}>
          <Select
            className={s.fieldSelect}
            value={f.fieldId || undefined}
            onChange={(val) => {
              onUpdate(f.id, 'fieldId', val)
              if (
                COMPARISON_OPTIONS.some((option) => option.value === f.op) &&
                !isComparableField(fields.find((field) => field.id === val)?.type ?? 'text')
              )
                onUpdate(f.id, 'op', 'contains')
            }}
            options={fields.map((field) => ({ value: field.id, label: field.label }))}
          />
          <Select
            className={s.opSelect}
            value={f.op}
            onChange={(val) => onUpdate(f.id, 'op', val)}
            options={
              isComparableField(fields.find((field) => field.id === f.fieldId)?.type ?? 'text')
                ? [...OP_OPTIONS, ...COMPARISON_OPTIONS].map((option) => ({ ...option, label: t(option.label) }))
                : OP_OPTIONS.map((option) => ({ ...option, label: t(option.label) }))
            }
          />
          {f.op !== 'empty' && f.op !== 'not_empty' && (
            <Input
              className={s.valueInput}
              value={f.value}
              onChange={(e) => onUpdate(f.id, 'value', e.target.value)}
              placeholder={t('输入值')}
            />
          )}
          <Button type="text" danger aria-label={t('删除条件')} icon={<Ic.X />} onClick={() => onDelete(f.id)} />
        </div>
      ))}
      <Button type="link" onClick={onAdd} disabled={!fields.length}>
        <Ic.Plus />
        {t('添加筛选条件')}
      </Button>
    </div>
  )

  return (
    <Popover open={open} onOpenChange={setOpen} content={content} trigger="click" placement="bottomLeft">
      <Tooltip title={activeCount > 0 ? `${t('筛选')} (${activeCount})` : t('筛选')}>
        <Button color={activeCount > 0 ? 'primary' : 'default'} variant="text" icon={<Ic.Filter />} />
      </Tooltip>
    </Popover>
  )
}
