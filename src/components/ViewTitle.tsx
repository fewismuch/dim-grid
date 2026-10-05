import { Button, Input, type InputRef, Typography } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { Ic } from '../constants'
import { useT } from '../locale'

export default function ViewTitle({ name, onRename }: { name: string; onRename: (name: string) => void }) {
  const t = useT()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const input = useRef<InputRef>(null)
  const finished = useRef(false)
  useEffect(() => {
    if (editing) input.current?.focus({ cursor: 'all' })
  }, [editing])
  const finish = (save: boolean) => {
    if (finished.current) return
    finished.current = true
    if (save && draft.trim() && draft.trim() !== name) onRename(draft.trim())
    setEditing(false)
  }
  return editing ? (
    <Input
      ref={input}
      aria-label={t('视图名称')}
      value={draft}
      maxLength={60}
      style={{ width: 200 }}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => finish(true)}
      onPressEnter={() => finish(true)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          finish(false)
        }
      }}
    />
  ) : (
    <Button
      type="text"
      icon={<Ic.Table style={{ color: 'var(--color-primary)' }} />}
      title={t('点击修改视图名称')}
      onClick={() => {
        finished.current = false
        setDraft(name)
        setEditing(true)
      }}
    >
      <Typography.Text ellipsis style={{ maxWidth: 240 }}>
        {name}
      </Typography.Text>
    </Button>
  )
}
