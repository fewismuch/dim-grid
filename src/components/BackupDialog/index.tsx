import { Button, Input, type InputRef, Modal } from 'antd'
import { useRef, useState } from 'react'
import { useT } from '../../locale'
import { cellText } from '../../model/table'
import s from './styles.module.css'

export default function BackupDialog({ value, onClose }: { value: string; onClose: () => void }) {
  const t = useT()
  const textarea = useRef<InputRef>(null)
  const [status, setStatus] = useState('')
  let displayedValue = value
  try {
    displayedValue = JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    // Preserve damaged raw backups exactly so they can still be recovered.
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([displayedValue], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `dim-grid-${cellText(new Date())}.json`
    anchor.hidden = true
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 30000)
    setStatus(t('若浏览器未下载文件，可以复制下方备份内容。'))
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(displayedValue)
      setStatus(t('备份内容已复制。'))
    } catch {
      textarea.current?.focus()
      textarea.current?.select()
      setStatus(t('请按 Ctrl / ⌘ C 复制已选中的备份内容。'))
    }
  }
  return (
    <Modal
      open
      title={t('导出备份')}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          {t('关闭')}
        </Button>,
        <Button key="copy" onClick={copy}>
          {t('复制内容')}
        </Button>,
        <Button key="download" type="primary" onClick={download}>
          {t('下载 JSON')}
        </Button>,
      ]}
      width={560}
    >
      <p className={s.hint}>{t('下载 JSON 文件，或复制备份内容另存为 .json 文件。备份包含字段、记录和视图设置。')}</p>
      <Input.TextArea
        ref={textarea}
        rows={8}
        aria-label={t('备份内容')}
        readOnly
        value={displayedValue}
        className={s.payload}
      />
      <p role="status" className={s.hint}>
        {status}
      </p>
    </Modal>
  )
}
