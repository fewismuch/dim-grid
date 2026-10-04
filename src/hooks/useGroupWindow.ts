import type { RefObject } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { groupOffsets, groupWindow } from '../model/groupWindow'

export default function useGroupWindow(
  groups: { key: string; rows: unknown[] }[] | null,
  collapsed: Set<string>,
  container: RefObject<HTMLDivElement>,
  rowHeight: number,
) {
  const [viewport, setViewport] = useState({ top: 0, height: 600 })
  const gridMaxHeight = Math.max(100, viewport.height - 36)
  const offsets = useMemo(
    () => groupOffsets(groups ?? [], collapsed, gridMaxHeight, rowHeight),
    [groups, collapsed, gridMaxHeight, rowHeight],
  )
  useEffect(() => {
    const element = container.current
    if (!element) return
    let frame = 0
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setViewport({ top: element.scrollTop, height: element.clientHeight }))
    }
    element.addEventListener('scroll', measure)
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    measure()
    return () => {
      observer.disconnect()
      element.removeEventListener('scroll', measure)
      cancelAnimationFrame(frame)
    }
  }, [container])
  return { ...groupWindow(offsets, viewport.top, viewport.height), gridMaxHeight }
}
