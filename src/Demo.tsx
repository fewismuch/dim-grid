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
      <div className="demo-grid">
        <App
          locale={locale}
          onLocaleChange={setLocale}
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
