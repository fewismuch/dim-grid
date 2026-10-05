import { Input, type InputRef, message } from 'antd'
import { useLayoutEffect, useRef, useState } from 'react'
import type { CellProps } from 'react-datasheet-grid'
import { useT } from '../../locale'
import type { RowData } from '../../model/table'
import { normalizeEmail } from '../../model/table'
import s from '../buildDsgCol.module.css'

export default function EmailEditor({
  rowData,
  setRowData,
  stopEditing,
  fieldId,
}: CellProps<RowData, unknown> & { fieldId: string }) {
  const t = useT()
  const previous = String(rowData[fieldId] ?? '')
  const [draft, setDraft] = useState(previous)
  const ref = useRef<InputRef>(null)
  const finished = useRef(false)
  useLayoutEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])
  const finish = (cancel = false) => {
    if (finished.current) return
    finished.current = true
    const value = normalizeEmail(draft)
    if (!cancel && value === null) void message.error(t('邮箱格式不正确，已保留原值。'))
    else if (!cancel && value !== previous) setRowData({ ...rowData, [fieldId]: value })
    stopEditing({ nextRow: false })
  }
  return (
    <Input
      variant="borderless"
      ref={ref}
      type="email"
      aria-label={t('邮箱地址')}
      value={draft}
      className={s.emailInput}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => finish()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          finish(event.key === 'Escape')
        }
      }}
    />
  )
}
