import { useEffect, useState } from 'react'
import App from './App'
import { demoData } from './demoData'
import { readDemoLocale, saveDemoLocale } from './demoLocale'
import type { GridLocale } from './i18n'
import './demo.css'

export default function Demo() {
  const [locale, setLocale] = useState<GridLocale>(() => {
    try {
      return readDemoLocale(window.localStorage)
    } catch {
      return 'zh-CN'
    }
  })
  useEffect(() => {
    document.documentElement.lang = locale
    try {
      saveDemoLocale(window.localStorage, locale)
    } catch {
      // Accessing localStorage itself may be blocked by the browser.
    }
  }, [locale])
  return (
    <main className="demo-shell">
      <header className="demo-language-bar">
        <span>Dim Grid</span>
        <label htmlFor="demo-language">{locale === 'zh-CN' ? '界面语言' : 'Interface language'}</label>
        <select
          id="demo-language"
          value={locale}
          onChange={(event) => setLocale(event.target.value === 'en-US' ? 'en-US' : 'zh-CN')}
        >
          <option value="zh-CN">简体中文</option>
          <option value="en-US">English</option>
        </select>
      </header>
      <div className="demo-grid">
        <App
          locale={locale}
          theme={{ token: { colorPrimary: '#00b96b' } }}
          height="100%"
          storageKey="dim-grid.demo"
          initialData={demoData}
          enableLocalStorage={false}
          persistTheme
        />
      </div>
    </main>
  )
}
