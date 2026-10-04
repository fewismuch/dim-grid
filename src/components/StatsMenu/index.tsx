import type { MenuProps } from 'antd'
import { Dropdown } from 'antd'
import { Ic, STAT_OPTS } from '../../constants'

interface Props {
  current: string
  onSelect: (stat: string) => void
  onClose: () => void
}

export default function StatsMenu({ current, onSelect, onClose }: Props) {
  const items: MenuProps['items'] = STAT_OPTS.map((opt) => ({
    key: opt,
    label: opt,
    icon: current === opt ? <Ic.Check /> : undefined,
    onClick: () => onSelect(opt),
  }))

  return (
    <Dropdown
      open
      menu={{ items, selectedKeys: [current] }}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      trigger={['click']}
      placement="topCenter"
    >
      <span />
    </Dropdown>
  )
}
