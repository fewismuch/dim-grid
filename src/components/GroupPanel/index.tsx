import { Button, Popover, Select, Tooltip } from 'antd'
import { useState } from 'react'
import { type FieldDef, type GroupByState, Ic } from '../../constants'
import { useT } from '../../locale'
import s from './styles.module.css'

interface Props {
  fields: FieldDef[]
  groupBy: GroupByState
  onChange: (state: GroupByState) => void
  onSortAsc: () => void
  onSortDesc: () => void
}

export default function GroupPanel({ fields, groupBy, onChange, onSortAsc, onSortDesc }: Props) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const groupField = fields.find((f) => f.id === groupBy.fieldId)

  const content = (
    <div className={s.panel}>
      <div className={s.selectRow}>
        <span className={s.selectLabel}>{t('按列分组')}</span>
        <Select
          className={s.fieldSelect}
          value={groupBy.fieldId || undefined}
          onChange={(val) => onChange({ fieldId: val || '', collapsed: new Set() })}
          options={[...fields.map((f) => ({ value: f.id, label: f.label }))]}
        />
        {groupBy.fieldId && (
          <Button
            type="text"
            danger
            aria-label={t('清除分组')}
            title={t('清除分组')}
            icon={<Ic.X />}
            onClick={() => onChange({ fieldId: '', collapsed: new Set() })}
          />
        )}
      </div>
      <div className={s.btnRow}>
        <Button size="small" disabled={!groupBy.fieldId} onClick={onSortAsc}>
          {t('升序')}
        </Button>
        <Button size="small" disabled={!groupBy.fieldId} onClick={onSortDesc}>
          {t('降序')}
        </Button>
      </div>
    </div>
  )

  return (
    <Popover open={open} onOpenChange={setOpen} content={content} trigger="click" placement="bottomLeft">
      <Tooltip title={groupBy.fieldId ? `${t('分组')} · ${groupField?.label}` : t('分组')}>
        <Button color={groupBy.fieldId ? 'primary' : 'default'} variant="text" icon={<Ic.Group />} />
      </Tooltip>
    </Popover>
  )
}
