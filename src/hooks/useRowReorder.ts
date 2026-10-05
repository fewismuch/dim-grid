import { useCallback, useEffect, useRef, useState } from 'react'
import type { TableCommand } from '../model/document'

type MoveCommand = Extract<TableCommand, { type: 'rows/move' }>

export default function useRowReorder(
  execute: (command: MoveCommand) => void,
  gridAreaRef: React.RefObject<HTMLDivElement>,
  canReorderRows: boolean,
  rowCount: number,
  rowPixels: number,
) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragOverIndex, setDragOverIndex] = useState(-1)
  const dragFromRef = useRef(-1)
  const dragOverRef = useRef(-1)
  const dragRowsLenRef = useRef(0)

  const moveRow = useCallback((from: number, to: number) => execute({ type: 'rows/move', from, to }), [execute])
  const handleGutterMouseDown = useCallback(
    (rowIndex: number, event: React.MouseEvent) => {
      if (!canReorderRows || event.button !== 0) return
      event.preventDefault()
      event.stopPropagation()
      dragFromRef.current = rowIndex
      dragOverRef.current = rowIndex
      dragRowsLenRef.current = rowCount
      setIsDragging(true)
      setDragOverIndex(rowIndex)
    },
    [canReorderRows, rowCount],
  )

  useEffect(() => {
    if (!isDragging) return
    const headerH = 38
    const onMove = (event: MouseEvent) => {
      const element = gridAreaRef.current
      if (!element) return
      const rect = element.getBoundingClientRect()
      const scrollTop = (element.querySelector('.dsg-container') as HTMLElement | null)?.scrollTop ?? element.scrollTop
      const relY = event.clientY - rect.top + scrollTop - headerH
      const index = Math.max(0, Math.min(Math.floor(relY / rowPixels), dragRowsLenRef.current - 1))
      dragOverRef.current = index
      setDragOverIndex(index)
    }
    const onUp = () => {
      const from = dragFromRef.current
      const over = dragOverRef.current
      if (from !== -1 && over !== -1 && from !== over) moveRow(from, over)
      setIsDragging(false)
      setDragOverIndex(-1)
    }
    const onCancel = () => {
      setIsDragging(false)
      setDragOverIndex(-1)
    }
    window.addEventListener('blur', onCancel)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('blur', onCancel)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [isDragging, moveRow, rowPixels, gridAreaRef])

  return { isDragging, dragOverIndex, dragFromRef, moveRow, handleGutterMouseDown }
}
