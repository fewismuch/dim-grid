import { useCallback, useEffect, useRef, useState } from 'react'
import type { TableCommand } from '../model/document'

type ResizeCommand = Extract<TableCommand, { type: 'field/resize' }>

export default function useColumnResize(execute: (command: ResizeCommand) => void) {
  const [resizingColumnId, setResizingColumnId] = useState<string | null>(null)
  const [columnPreview, setColumnPreview] = useState<Record<string, number>>({})
  const resizeDrag = useRef<{ id: string; startX: number; startWidth: number; preview: number; min: number } | null>(
    null,
  )

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const drag = resizeDrag.current
      if (!drag) return
      const width = Math.min(1200, Math.max(drag.min, Math.round(drag.startWidth + event.clientX - drag.startX)))
      drag.preview = width
      setColumnPreview((current) => (current[drag.id] === width ? current : { ...current, [drag.id]: width }))
    }
    const stop = () => {
      const drag = resizeDrag.current
      if (!drag) return
      resizeDrag.current = null
      setResizingColumnId(null)
      setColumnPreview((current) => {
        const next = { ...current }
        delete next[drag.id]
        return next
      })
      if (drag.preview !== drag.startWidth) execute({ type: 'field/resize', id: drag.id, width: drag.preview })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
    }
  }, [execute])

  const startResize = useCallback((id: string, event: React.PointerEvent) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const width = event.currentTarget.closest('.dsg-cell-header')?.getBoundingClientRect().width ?? 140
    resizeDrag.current = { id, startX: event.clientX, startWidth: width, preview: width, min: 60 }
    setResizingColumnId(id)
  }, [])

  return { resizingColumnId, columnPreview, startResize }
}
