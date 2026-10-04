import { useLayoutEffect, useRef, useState } from 'react'
import type { CellProps } from 'react-datasheet-grid'
import s from '../buildDsgCol.module.css'
import type { RowData } from '../model/table'

export default function MultilineTextCell({
  rowData,
  setRowData,
  stopEditing,
  focus,
  active,
  fieldId,
}: CellProps<RowData, unknown> & { fieldId: string }) {
  const value = String(rowData[fieldId] ?? '')
  const firstLine = value.split(/\r?\n/, 1)[0]
  const hasMoreLines = /\r?\n/.test(value)
  const [draft, setDraft] = useState(value)
  const isMultiline = /\r?\n/.test(draft)
  const ref = useRef<HTMLTextAreaElement>(null)
  const finished = useRef(false)
  const wasFocused = useRef(false)
  const finishRef = useRef<(cancel?: boolean, stop?: boolean) => void>(() => {})

  useLayoutEffect(() => {
    if (focus && !wasFocused.current) {
      finished.current = false
      setDraft(value)
      ref.current?.focus()
      ref.current?.select()
    } else if (!focus && wasFocused.current) {
      // 点击其他单元格时 DSG 会 preventDefault，DOM blur 不触发，故在失焦时保存
      finishRef.current()
    }
    wasFocused.current = focus
  }, [focus, value])

  useLayoutEffect(() => {
    if (!focus || !ref.current) return
    ref.current.rows = isMultiline ? Math.min(8, Math.max(2, draft.split('\n').length)) : 1
    if (!isMultiline) {
      ref.current.style.height = ''
      return
    }
    ref.current.style.height = 'auto'
    ref.current.style.height = `${Math.min(240, Math.max(36, ref.current.scrollHeight))}px`
  }, [draft, focus, isMultiline])

  const finish = (cancel = false, stop = true) => {
    if (finished.current) return
    finished.current = true
    if (!cancel && draft !== value) setRowData({ ...rowData, [fieldId]: draft })
    if (stop) stopEditing({ nextRow: false })
  }
  finishRef.current = finish

  return focus ? (
    <textarea
      ref={ref}
      data-multiline-editor={isMultiline || undefined}
      className={isMultiline ? s.multilineEditor : s.singleLineEditor}
      aria-label="文本"
      rows={isMultiline ? 2 : 1}
      wrap={isMultiline ? 'soft' : 'off'}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => finish()}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) {
          event.stopPropagation()
          return
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          finish(true)
        } else if (event.key === 'Enter') {
          event.stopPropagation()
          if (!event.shiftKey) {
            event.preventDefault()
            finish()
          }
        } else if (event.key.startsWith('Arrow')) {
          event.stopPropagation()
        } else if (event.key === 'Tab') {
          finish(false, false)
        }
      }}
    />
  ) : active && hasMoreLines ? (
    <div data-multiline-expanded="true" className={s.multilineExpandedWrap}>
      <span className={s.multilineExpanded}>{value}</span>
      {/* 复刻 DSG 的扩行把手，放到展开框右下角；保留其 className 以复用拖拽扩行逻辑 */}
      <span data-multiline-handle className={`dsg-expand-rows-indicator ${s.multilineExpandedHandle}`} />
    </div>
  ) : (
    <span className={s.multilineDisplay} title={value}>
      {firstLine}
      {hasMoreLines && '…'}
    </span>
  )
}
