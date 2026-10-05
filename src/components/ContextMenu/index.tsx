import {
  CheckOutlined,
  CopyOutlined,
  DeleteOutlined,
  FontColorsOutlined,
  InsertRowBelowOutlined,
  ScissorOutlined,
  SnippetsOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { Dropdown } from 'antd'
import * as React from 'react'
import { useCallback } from 'react'
import type { ContextMenuComponentProps, ContextMenuItem } from 'react-datasheet-grid'
import s from './styles.module.css'

const colors = [
  '#1677ff',
  '#c41d7f',
  '#fa8c16',
  '#7cb305',
  '#531dab',
  '#bfbfbf',
  '#e91e3a',
  '#00bc7a',
  '#f0b400',
  '#13b2bd',
  '#ad8b52',
]

const icons: Record<ContextMenuItem['type'], React.ReactNode> = {
  CUT: <ScissorOutlined />,
  COPY: <CopyOutlined />,
  PASTE: <SnippetsOutlined />,
  DELETE_ROW: <DeleteOutlined />,
  DELETE_ROWS: <DeleteOutlined />,
  INSERT_ROW_BELLOW: <InsertRowBelowOutlined />,
  DUPLICATE_ROW: <CopyOutlined />,
  DUPLICATE_ROWS: <CopyOutlined />,
}

const useDocumentEventListener = <K extends keyof DocumentEventMap>(
  type: K,
  listener: (event: DocumentEventMap[K]) => void,
) => {
  React.useEffect(() => {
    document.addEventListener(type, listener)
    return () => document.removeEventListener(type, listener)
  }, [listener, type])
}

export const defaultRenderItem = (item: ContextMenuItem) => {
  if (item.type === 'CUT') return <>剪切</>
  if (item.type === 'COPY') return <>复制</>
  if (item.type === 'PASTE') return <>粘贴</>
  if (item.type === 'DELETE_ROW') return <>删除行</>
  if (item.type === 'DELETE_ROWS')
    return (
      <>
        删除多行 <b>{item.fromRow}</b> 到 <b>{item.toRow}</b>
      </>
    )
  if (item.type === 'INSERT_ROW_BELLOW') return <>插入行下方</>
  if (item.type === 'DUPLICATE_ROW') return <>复制行</>
  if (item.type === 'DUPLICATE_ROWS')
    return (
      <>
        复制多行 <b>{item.fromRow}</b> 到 <b>{item.toRow}</b>
      </>
    )
  return item.type
}

type Props = ContextMenuComponentProps & {
  textColor?: string | null
  onTextColorChange?: (color: string | null) => void
}

export const createContextMenuComponent =
  (renderItem: (item: ContextMenuItem) => JSX.Element = defaultRenderItem) =>
  ({ clientX, clientY, items, close, textColor, onTextColorChange }: Props) => {
    useDocumentEventListener(
      'keydown',
      useCallback(
        (event: KeyboardEvent) => {
          if (event.key === 'Escape') close()
        },
        [close],
      ),
    )

    const selectColor = (color: string | null) => {
      onTextColorChange?.(color)
      close()
    }
    const palette = (
      <div className={s.palette}>
        <button
          type="button"
          className={`${s.swatch} ${s.reset} ${textColor === null ? s.selected : ''}`}
          aria-label="默认文本颜色"
          title="默认文本颜色"
          onClick={(event) => {
            event.stopPropagation()
            selectColor(null)
          }}
        />
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            className={`${s.swatch} ${textColor?.toLowerCase() === color ? s.selected : ''}`}
            style={{ backgroundColor: color }}
            aria-label={`文本颜色 ${color}`}
            title={color}
            onClick={(event) => {
              event.stopPropagation()
              selectColor(color)
            }}
          >
            {textColor?.toLowerCase() === color && <CheckOutlined aria-hidden="true" />}
          </button>
        ))}
      </div>
    )
    const menuItems: MenuProps['items'] = [
      ...(onTextColorChange
        ? [
            {
              key: 'text-color',
              icon: <FontColorsOutlined />,
              label: '文本颜色',
              children: [{ key: 'text-color-palette', label: palette, className: s.paletteItem }],
            },
          ]
        : []),
      ...items.map((item) => ({
        key: item.type,
        icon: icons[item.type],
        label: renderItem(item),
        danger: item.type.startsWith('DELETE'),
        onClick: () => {
          item.action()
          close()
        },
      })),
    ]
    return (
      <Dropdown
        open
        placement="bottomLeft"
        getPopupContainer={(trigger) => trigger.closest('.dim-grid') ?? document.body}
        onOpenChange={(open) => {
          if (!open) close()
        }}
        menu={{ items: menuItems }}
      >
        <span style={{ position: 'fixed', left: clientX, top: clientY, width: 1, height: 1 }} />
      </Dropdown>
    )
  }

export const ContextMenu = createContextMenuComponent(defaultRenderItem)
