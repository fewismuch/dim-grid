import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import Demo from './Demo'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing root element')
ReactDOM.createRoot(root).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
)
