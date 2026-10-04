import type { MenuProps } from 'antd'
import { Dropdown } from 'antd'
import { STAT_OPTS } from '../../constants'
import styles from './styles.module.css'

interface Props {
  current: string
  onSelect: (stat: string) => void
  onClose: () => void
}

export default function StatsMenu({ current, onSelect, onClose }: Props) {
  const items: MenuProps['items'] = STAT_OPTS.map((opt) => ({
    key: opt,
    label: opt,
    icon: current === opt ? <span className={styles.icon}>✓</span> : <span className={styles.iconPlaceholder} />,
    onClick: () => onSelect(opt),
    style: current === opt ? { color: 'var(--color-primary)' } : undefined,
  }))

  return (
    <Dropdown
      open
      menu={{ items }}
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
