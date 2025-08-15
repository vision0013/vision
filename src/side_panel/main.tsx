import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// 경로 및 이름 수정
import SidePanel from './SidePanel' 
import './SidePanel.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SidePanel />
  </StrictMode>,
)