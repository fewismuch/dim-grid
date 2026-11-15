import type { GridLocale } from '../../i18n.ts'

export function languageMenuItems(label: string, onChange?: (locale: GridLocale) => void) {
  if (!onChange) return []
  return [
    { type: 'divider' as const },
    {
      type: 'group' as const,
      label,
      children: [
        { key: 'locale:zh-CN', label: '简体中文', onClick: () => onChange('zh-CN') },
        { key: 'locale:en-US', label: 'English', onClick: () => onChange('en-US') },
      ],
    },
  ]
}
