import type { SetStateAction } from 'react'
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { TableCommand, TableView } from '../model/document'
import { historyReducer, historyState, initialDocument } from '../model/document'
import { loadDocument, STORAGE_KEY, saveDocument } from '../model/storage'

function load() {
  try {
    return loadDocument(window.localStorage, initialDocument())
  } catch {
    return {
      document: initialDocument(),
      error: '无法访问浏览器存储，请导出备份。',
      writable: false,
      recoveryRaw: null,
    }
  }
}

export default function useTableDocument() {
  const [loaded] = useState(load)
  const [history, dispatch] = useReducer(historyReducer, loaded.document, historyState)
  const [saveError, setSaveError] = useState(loaded.error)
  const writable = useRef(loaded.writable)
  const latest = useRef(history.present)
  const execute = useCallback((command: TableCommand, group?: string) => {
    dispatch({ type: 'commit', command, group, time: Date.now() })
  }, [])
  const replaceDocument = useCallback(
    (document: import('../model/document').TableDocument) => {
      writable.current = true
      execute({ type: 'document/replace', document })
      setSaveError(null)
    },
    [execute],
  )
  const undo = useCallback(() => dispatch({ type: 'undo' }), [])
  const redo = useCallback(() => dispatch({ type: 'redo' }), [])
  const setView = useCallback(
    <K extends keyof TableView>(key: K, value: SetStateAction<TableView[K]>) => {
      execute(
        {
          type: 'view/change',
          update: (view) => ({
            ...view,
            [key]: typeof value === 'function' ? (value as (prev: TableView[K]) => TableView[K])(view[key]) : value,
          }),
        },
        `view:${key}`,
      )
    },
    [execute],
  )

  useEffect(() => {
    latest.current = history.present
    if (!writable.current) return
    const save = () => {
      if (!writable.current) return
      try {
        const error = saveDocument(window.localStorage, latest.current)
        setSaveError(error)
      } catch {
        setSaveError('无法访问浏览器存储，请导出备份。')
      }
    }
    const timer = window.setTimeout(save, 250)
    // Closing/reloading during the debounce still flushes the latest document.
    window.addEventListener('pagehide', save)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('pagehide', save)
    }
  }, [history.present])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      writable.current = false
      setSaveError('另一页面修改了本地表格，已暂停此页保存。请导出本页备份并刷新。')
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.isComposing) return
      if ((event.target as HTMLElement)?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]'))
        return
      if (event.key.toLowerCase() === 'z') {
        event.preventDefault()
        event.shiftKey ? redo() : undo()
      } else if (event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener('storage', onStorage)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [undo, redo])

  return {
    document: history.present,
    execute,
    replaceDocument,
    setView,
    undo,
    redo,
    canUndo: !!history.past.length,
    canRedo: !!history.future.length,
    saveError,
    recoveryRaw: loaded.recoveryRaw,
  }
}
