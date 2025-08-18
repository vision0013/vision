import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// 최종 조립된 Section 컴포넌트를 임포트합니다.
import SidePanel from './sections/ui/side-panel'; 
// CSS 파일 경로도 수정합니다.
import './sections/ui/side-panel.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SidePanel />
  </StrictMode>,
);
