import { Button, Popover, Select, Tooltip } from 'antd'
import { useState } from 'react'
import { type FieldDef, Ic, type SortItem } from '../../constants'
import style from './styles.module.css'

interface Props {
  fields: FieldDef[]
  sorts: SortItem[]
  onAdd: () => void
  onUpdate: (id: string, key: string, val: string) => void
  onDelete: (id: string) => void
}

export default function SortPanel({ fields, sorts, onAdd, onUpdate, onDelete }: Props) {
  const [open, setOpen] = useState(false)
  const activeCount = sorts.filter((s) => s.fieldId).length

  const content = (
    <div className={style.panel}>
      <div className={style.panelTitle}>排序</div>
      {sorts.length === 0 && <div className={style.emptyHint}>暂无排序条件</div>}
      {sorts.map((s) => (
        <div key={s.id} className={style.row}>
          <Select
            className={style.fieldSelect}
            value={s.fieldId || undefined}
            onChange={(val) => onUpdate(s.id, 'fieldId', val)}
            options={fields.map((f) => ({ value: f.id, label: f.label }))}
          />
          <Select
            className={style.dirSelect}
            value={s.dir}
            onChange={(val) => onUpdate(s.id, 'dir', val)}
            options={[
              { value: 'asc', label: '升序' },
              { value: 'desc', label: '降序' },
            ]}
          />
          <Button type="text" danger aria-label="删除条件" icon={<Ic.X />} onClick={() => onDelete(s.id)} />
        </div>
      ))}
      <Button type="link" onClick={onAdd} disabled={!fields.length}>
        <Ic.Plus />
        添加排序条件
      </Button>
    </div>
  )

  return (
    <Popover open={open} onOpenChange={setOpen} content={content} trigger="click" placement="bottomLeft">
      <Tooltip title={activeCount > 0 ? `排序 (${activeCount})` : '排序'}>
        <Button color={activeCount > 0 ? 'primary' : 'default'} variant="text" icon={<Ic.Sort />} />
      </Tooltip>
    </Popover>
  )
}
