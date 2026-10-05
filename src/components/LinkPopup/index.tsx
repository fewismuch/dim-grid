import { Button, Input, Popover } from 'antd'
import { useState } from 'react'
import { useT } from '../../locale'
import { safeLink } from '../../model/table'
import styles from './styles.module.css'

interface Props {
  text: string
  link: string
  onSave: (data: { text: string; link: string }) => void
  children: React.ReactNode
}

export default function LinkPopup({ text: initialText, link: initialLink, onSave, children }: Props) {
  const t = useT()
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(initialText)
  const [link, setLink] = useState(initialLink)

  const handleOpenChange = (visible: boolean) => {
    if (visible) {
      setError('')
      setText(initialText)
      setLink(initialLink)
    }
    setOpen(visible)
  }

  const content = (
    <div className={styles.content}>
      <div>
        <div className={styles.fieldLabel}>{t('文本')}</div>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label={t('显示文本')}
          placeholder={t('显示文本（可选）')}
        />
      </div>
      <div>
        <div className={styles.fieldLabel}>{t('链接')}</div>
        <Input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          aria-label={t('链接地址')}
          placeholder="https://..."
        />
      </div>
      {error && (
        <div role="alert" style={{ color: 'var(--color-danger)' }}>
          {error}
        </div>
      )}
      <div className={styles.actions}>
        <Button onClick={() => setOpen(false)}>{t('取消')}</Button>
        <Button
          type="primary"
          onClick={() => {
            if (link.trim() && !safeLink(link.trim())) {
              setError(t('请输入有效的 http、https 或 mailto 链接'))
              return
            }
            onSave({ text: text.trim(), link: link.trim() })
            setOpen(false)
          }}
        >
          {t('确定')}
        </Button>
      </div>
    </div>
  )

  return (
    <Popover open={open} onOpenChange={handleOpenChange} content={content} trigger="click" placement="bottomLeft">
      {children}
    </Popover>
  )
}
