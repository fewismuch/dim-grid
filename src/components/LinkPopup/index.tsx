import { Button, Input, Popover } from 'antd'
import { createStyles } from 'antd-style'
import { useState } from 'react'

const useStyles = createStyles(({ token }) => ({
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    minWidth: 260,
  },
  fieldLabel: {
    marginBottom: 4,
    fontSize: 12,
    color: token.colorTextSecondary,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
  },
}))

interface Props {
  text: string
  link: string
  onSave: (data: { text: string; link: string }) => void
  children: React.ReactNode
}

export default function LinkPopup({ text: initialText, link: initialLink, onSave, children }: Props) {
  const { styles } = useStyles()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(initialText)
  const [link, setLink] = useState(initialLink)

  const handleOpenChange = (visible: boolean) => {
    if (visible) {
      setText(initialText)
      setLink(initialLink)
    }
    setOpen(visible)
  }

  const content = (
    <div className={styles.content}>
      <div>
        <div className={styles.fieldLabel}>文本</div>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="显示文本（可选）" autoFocus />
      </div>
      <div>
        <div className={styles.fieldLabel}>链接</div>
        <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
      </div>
      <div className={styles.actions}>
        <Button onClick={() => setOpen(false)}>取消</Button>
        <Button
          type="primary"
          onClick={() => {
            onSave({ text: text.trim(), link: link.trim() })
            setOpen(false)
          }}
        >
          确定
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
