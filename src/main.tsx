import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { demoData } from './demoData'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing root element')
dayjs.locale('zh-cn')
ReactDOM.createRoot(root).render(
  <StrictMode>
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#00b96b' } }}>
      <App height="100dvh" storageKey="dim-grid.demo" initialData={demoData} enableLocalStorage={false} />
    </ConfigProvider>
  </StrictMode>,
)
