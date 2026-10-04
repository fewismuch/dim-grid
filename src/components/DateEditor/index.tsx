import { DatePicker } from 'antd'
import dayjs from 'dayjs'
import type { ComponentRef } from 'react'
import { useLayoutEffect, useRef } from 'react'
import type { CellProps } from 'react-datasheet-grid'
import s from '../../buildDsgCol.module.css'
import type { RowData } from '../../model/table'

export default function DateEditor({
  rowData,
  setRowData,
  focus,
  stopEditing,
  fieldId,
}: CellProps<RowData, unknown> & { fieldId: string }) {
  const ref = useRef<ComponentRef<typeof DatePicker>>(null)
  const raw = rowData[fieldId] as Date | null
  const value = raw && dayjs(raw).isValid() ? dayjs(raw) : null
  useLayoutEffect(() => {
    if (focus) ref.current?.focus()
    else ref.current?.blur()
  }, [focus])
  return (
    <div className={focus ? s.cellFull : s.cellFullNoPointer}>
      <DatePicker
        ref={ref}
        open={focus}
        value={value}
        // Input blur can precede selection in the calendar portal. Only the
        // picker closing (outside click / Escape / selection) ends editing.
        onOpenChange={(open) => {
          if (!open) window.setTimeout(() => stopEditing({ nextRow: false }), 0)
        }}
        onChange={(date) => {
          setRowData({ ...rowData, [fieldId]: date ? date.toDate() : null })
          window.setTimeout(() => stopEditing({ nextRow: false }), 0)
        }}
        getPopupContainer={() => document.body}
        variant="borderless"
        allowClear
        suffixIcon={null}
        placeholder=""
        className={s.cellFull}
      />
    </div>
  )
}
