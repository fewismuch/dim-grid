import { ExportOutlined, ImportOutlined, MoreOutlined } from '@ant-design/icons'
import { Button, Dropdown } from 'antd'
import { lazy, Suspense, useRef, useState } from 'react'
import type { TableDocument } from '../../model/document'
import { deserializeDocument, serializeDocument } from '../../model/storage'

const BackupDialog = lazy(() => import('../BackupDialog'))

export default function BackupControls({
  document: table,
  onImport,
  recoveryRaw,
}: {
  document: TableDocument
  onImport: (document: TableDocument) => void
  recoveryRaw?: string | null
}) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [payload, setPayload] = useState<string | null>(null)
  const exportBackup = (raw = serializeDocument(table)) => setPayload(raw)
  return (
    <>
      {payload !== null && (
        <Suspense fallback={<span role="status">正在生成备份…</span>}>
          <BackupDialog value={payload} onClose={() => setPayload(null)} />
        </Suspense>
      )}
      <Dropdown
        trigger={['click']}
        placement="bottomRight"
        menu={{
          items: [
            { key: 'export', label: '导出备份', icon: <ExportOutlined />, onClick: () => exportBackup() },
            ...(recoveryRaw
              ? [
                  {
                    key: 'recovery',
                    label: '导出原始数据',
                    icon: <ExportOutlined />,
                    onClick: () => exportBackup(recoveryRaw),
                  },
                ]
              : []),
            { key: 'import', label: '导入备份', icon: <ImportOutlined />, onClick: () => input.current?.click() },
          ],
        }}
      >
        <Button type="text" icon={<MoreOutlined />} aria-label="更多操作" title="更多操作" />
      </Dropdown>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          try {
            if (file.size > 20 * 1024 * 1024) throw new Error('备份文件不能超过 20 MB。')
            onImport(deserializeDocument(await file.text()))
            setError('')
          } catch (error) {
            setError(
              error instanceof SyntaxError
                ? '备份不是有效的 JSON 文件，当前表格已保留。'
                : error instanceof Error
                  ? error.message
                  : '备份导入失败。',
            )
          }
        }}
      />
      {error && (
        <span role="alert" style={{ color: 'var(--color-danger)' }}>
          {error}
        </span>
      )}
    </>
  )
}
