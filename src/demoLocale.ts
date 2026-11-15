import type { GridLocale } from './i18n.ts'

export const DEMO_LOCALE_KEY = 'dim-grid.demo.locale'

export function readDemoLocale(storage: Pick<Storage, 'getItem'>): GridLocale {
  try {
    return storage.getItem(DEMO_LOCALE_KEY) === 'en-US' ? 'en-US' : 'zh-CN'
  } catch {
    return 'zh-CN'
  }
}

export function saveDemoLocale(storage: Pick<Storage, 'setItem'>, locale: GridLocale): void {
  try {
    storage.setItem(DEMO_LOCALE_KEY, locale)
  } catch {
    // Language switching still works for this session when storage is unavailable.
  }
}
