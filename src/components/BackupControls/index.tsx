import { ExportOutlined, ImportOutlined, MoreOutlined } from '@ant-design/icons'
import { Button, Dropdown } from 'antd'
import { lazy, Suspense, useRef, useState } from 'react'
import { type GridLocale, useGridLocale, useT } from '../../locale'
import type { TableDocument } from '../../model/document'
import { deserializeDocument, serializeDocument } from '../../model/storage'
import { languageMenuItems } from './languageMenu'

const BackupDialog = lazy(() => import('../BackupDialog'))

export default function BackupControls({
  document: table,
  onImport,
  recoveryRaw,
  onLocaleChange,
}: {
  document: TableDocument
  onImport: (document: TableDocument) => void
  recoveryRaw?: string | null
  onLocaleChange?: (locale: GridLocale) => void
}) {
  const t = useT()
  const locale = useGridLocale()
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [payload, setPayload] = useState<string | null>(null)
  const exportBackup = (raw = serializeDocument(table)) => setPayload(raw)
  return (
    <>
      {payload !== null && (
        <Suspense fallback={<span role="status">{t('正在生成备份…')}</span>}>
          <BackupDialog value={payload} onClose={() => setPayload(null)} />
        </Suspense>
      )}
      <Dropdown
        trigger={['click']}
        placement="bottomRight"
        menu={{
          selectable: true,
          selectedKeys: [`locale:${locale}`],
          items: [
            { key: 'export', label: t('导出备份'), icon: <ExportOutlined />, onClick: () => exportBackup() },
            ...(recoveryRaw
              ? [
                  {
                    key: 'recovery',
                    label: t('导出原始数据'),
                    icon: <ExportOutlined />,
                    onClick: () => exportBackup(recoveryRaw),
                  },
                ]
              : []),
            { key: 'import', label: t('导入备份'), icon: <ImportOutlined />, onClick: () => input.current?.click() },
            ...languageMenuItems(t('界面语言'), onLocaleChange),
          ],
        }}
      >
        <Button type="text" icon={<MoreOutlined />} aria-label={t('更多操作')} title={t('更多操作')} />
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
            if (file.size > 20 * 1024 * 1024) throw new Error(t('备份文件不能超过 20 MB。'))
            onImport(deserializeDocument(await file.text()))
            setError('')
          } catch (error) {
            setError(
              error instanceof SyntaxError
                ? t('备份不是有效的 JSON 文件，当前表格已保留。')
                : error instanceof Error
                  ? t(error.message)
                  : t('备份导入失败。'),
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
