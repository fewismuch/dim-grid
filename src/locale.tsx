import enUS from 'antd/locale/en_US'
import zhCN from 'antd/locale/zh_CN'
import { createContext, useCallback, useContext } from 'react'

import { type GridLocale, translate } from './i18n'

export type { GridLocale } from './i18n'
export { translate } from './i18n'

export const antLocales = { 'zh-CN': zhCN, 'en-US': enUS }

export const LocaleContext = createContext<GridLocale>('zh-CN')
export function useGridLocale(): GridLocale {
  return useContext(LocaleContext)
}
export function useT(): (text: string) => string {
  const locale = useGridLocale()
  return useCallback((text: string) => translate(locale, text), [locale])
}
