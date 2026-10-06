import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { demoData } from './demoData'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing root element')
ReactDOM.createRoot(root).render(
  <StrictMode>
    <App
      locale="zh-CN"
      theme={{ token: { colorPrimary: '#00b96b' } }}
      height="100dvh"
      storageKey="dim-grid.demo"
      initialData={demoData}
      enableLocalStorage={false}
      persistTheme
    />
  </StrictMode>,
)
