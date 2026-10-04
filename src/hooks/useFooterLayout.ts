import type { RefObject } from 'react'
import { useEffect, useState } from 'react'

// Match the grid's content-box width, including changes to its scrollbar.
export default function useFooterLayout(area: RefObject<HTMLDivElement>, horizontalScroll: RefObject<number>) {
  const [width, setWidth] = useState<number>()
  useEffect(() => {
    const element = area.current
    if (!element) return
    let grid: Element | null = null
    const resize = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    const observe = () => {
      for (const table of element.querySelectorAll<HTMLElement>('.dsg-container')) {
        const left = horizontalScroll.current ?? 0
        if (table.scrollLeft !== left) table.scrollLeft = left
      }
      const next = element.querySelector('.dsg-container')
      if (next === grid) return
      resize.disconnect()
      grid = next
      if (grid) resize.observe(grid)
      else setWidth(undefined)
    }
    const mutation = new MutationObserver(observe)
    mutation.observe(element, { childList: true, subtree: true })
    observe()
    return () => {
      resize.disconnect()
      mutation.disconnect()
    }
  }, [area, horizontalScroll])
  return width
}
