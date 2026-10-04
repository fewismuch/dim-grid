import { ColumnHeightOutlined } from '@ant-design/icons'
import { Button, Popover, Radio, Tooltip } from 'antd'
import { useState } from 'react'
import type { RowHeight } from '../../model/rowHeight'
import s from './styles.module.css'

interface Props {
  value: RowHeight
  onChange: (value: RowHeight) => void
}

const options: { value: RowHeight; label: string }[] = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
]

export default function RowHeightMenu({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomLeft"
      content={
        <div className={s.menu}>
          <Radio.Group
            value={value}
            onChange={(event) => {
              onChange(event.target.value)
              setOpen(false)
            }}
          >
            {options.map((option) => (
              <Radio key={option.value} value={option.value} className={s.option}>
                {option.label}
              </Radio>
            ))}
          </Radio.Group>
        </div>
      }
    >
      <Tooltip title="行高">
        <Button
          color={open ? 'primary' : 'default'}
          variant="text"
          icon={<ColumnHeightOutlined />}
          aria-label={`行高，当前${options.find((option) => option.value === value)?.label}`}
        />
      </Tooltip>
    </Popover>
  )
}
