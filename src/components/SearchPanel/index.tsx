import { Input } from 'antd'
import { createStyles } from 'antd-style'
import type { ChangeEvent } from 'react'
import { useCallback, useRef, useState } from 'react'
import { Ic } from '../../constants'

const useStyles = createStyles(() => ({
  searchInput: { width: 200, height: 28, marginLeft: 4 },
}))

interface Props {
  onSearch: (query: string) => void
}

export default function SearchPanel({ onSearch }: Props) {
  const { styles } = useStyles()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const inputRef = useRef<any>(null)

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value
      setValue(v)
      onSearch(v)
    },
    [onSearch],
  )

  const handleToggle = useCallback(() => {
    const next = !open
    if (next) {
      setTimeout(() => inputRef.current?.focus(), 0)
    } else {
      setValue('')
      onSearch('')
    }
    setOpen(next)
  }, [open, onSearch])

  return (
    <>
      {!open && (
        <button type="button" className="tb-btn" onClick={handleToggle}>
          <Ic.Search />
          搜索
        </button>
      )}
      {open && (
        <Input
          ref={inputRef}
          className={styles.searchInput}
          placeholder="搜索记录..."
          value={value}
          onChange={handleChange}
          onBlur={() => {
            if (!value) setOpen(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false)
          }}
          allowClear
          prefix={<Ic.Search />}
        />
      )}
    </>
  )
}
