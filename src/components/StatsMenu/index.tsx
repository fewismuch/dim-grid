import type { MenuProps } from 'antd'
import { Dropdown } from 'antd'
import { Ic } from '../../constants'
import { useT } from '../../locale'
import { statKeys, statLabels } from '../../model/stats'

interface Props {
  current: string
  onSelect: (stat: string) => void
  onClose: () => void
}

export default function StatsMenu({ current, onSelect, onClose }: Props) {
  const t = useT()
  const items: MenuProps['items'] = statKeys.map((opt) => ({
    key: opt,
    label: t(statLabels[opt]),
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
