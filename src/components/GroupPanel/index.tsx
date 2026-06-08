import { Button, Popover, Select } from 'antd'
import { useState } from 'react'
import { type FieldDef, type GroupByState, Ic } from '../../constants'
import s from './styles.module.css'

interface Props {
  fields: FieldDef[]
  groupBy: GroupByState
  onChange: (state: GroupByState) => void
  onSortAsc: () => void
  onSortDesc: () => void
}

export default function GroupPanel({ fields, groupBy, onChange, onSortAsc, onSortDesc }: Props) {
  const [open, setOpen] = useState(false)
  const groupField = fields.find((f) => f.id === groupBy.fieldId)

  const content = (
    <div className={s.panel}>
      <div className={s.panelTitle}>分组</div>
      <div className={s.selectRow}>
        <span className={s.selectLabel}>按列分组</span>
        <Select
          className={s.fieldSelect}
          value={groupBy.fieldId || undefined}
          onChange={(val) => onChange({ fieldId: val || '', collapsed: new Set() })}
          options={[{ value: '', label: '不分组' }, ...fields.map((f) => ({ value: f.id, label: f.label }))]}
        />
      </div>
      <div className={s.btnRow}>
        <Button size="small" onClick={onSortAsc}>
          升序
        </Button>
        <Button size="small" onClick={onSortDesc}>
          降序
        </Button>
      </div>
    </div>
  )

  return (
    <Popover open={open} onOpenChange={setOpen} content={content} trigger="click" placement="bottomLeft">
      <button className={`tb-btn ${groupBy.fieldId ? 'active' : ''}`}>
        <Ic.Group />
        分组{groupBy.fieldId && ` · ${groupField?.label}`}
      </button>
    </Popover>
  )
}
