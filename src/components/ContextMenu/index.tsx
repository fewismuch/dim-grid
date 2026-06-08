import * as React from 'react'
import { type FC, useCallback, useRef } from 'react'
import type { ContextMenuComponentProps, ContextMenuItem } from 'react-datasheet-grid'

const useDocumentEventListener = (type: string, listener: (...args: any[]) => void) => {
  React.useEffect(() => {
    document.addEventListener(type, listener)

    return () => {
      document.removeEventListener(type, listener)
    }
  }, [listener, type])
}

export const defaultRenderItem = (item: ContextMenuItem) => {
  if (item.type === 'CUT') {
    return <>剪切</>
  }

  if (item.type === 'COPY') {
    return <>复制</>
  }

  if (item.type === 'PASTE') {
    return <>粘贴</>
  }

  if (item.type === 'DELETE_ROW') {
    return <>删除行</>
  }

  if (item.type === 'DELETE_ROWS') {
    return (
      <>
        删除多行 <b>{item.fromRow}</b> 到 <b>{item.toRow}</b>
      </>
    )
  }

  if (item.type === 'INSERT_ROW_BELLOW') {
    return <>插入行下方</>
  }

  if (item.type === 'DUPLICATE_ROW') {
    return <>复制行</>
  }

  if (item.type === 'DUPLICATE_ROWS') {
    return (
      <>
        复制多行 <b>{item.fromRow}</b> 到 <b>{item.toRow}</b>
      </>
    )
  }

  return item.type
}

export const createContextMenuComponent =
  (renderItem: (item: ContextMenuItem) => JSX.Element = defaultRenderItem) =>
  // eslint-disable-next-line react/display-name
  ({ clientX, clientY, items, close }) => {
    const containerRef = useRef<HTMLDivElement>(null)

    const onClickOutside = useCallback(
      (event: MouseEvent) => {
        const clickInside = containerRef.current?.contains(event.target as Node)

        if (!clickInside) {
          close()
        }
      },
      [close],
    )
    useDocumentEventListener('mousedown', onClickOutside)

    return (
      <div className="dsg-context-menu" style={{ left: `${clientX}px`, top: `${clientY}px` }} ref={containerRef}>
        {items.map((item) => (
          <div key={item.type} onClick={item.action} className="dsg-context-menu-item">
            {renderItem(item)}
          </div>
        ))}
      </div>
    )
  }

export const ContextMenu = createContextMenuComponent(defaultRenderItem)
