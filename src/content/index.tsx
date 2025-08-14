import React from 'react';
import ReactDOM from 'react-dom/client';
import { PageCrawler } from './crawler';
import App from '../popup/App'; // UI를 담당하는 App 컴포넌트를 가져옵니다.

// 1. 페이지 로딩이 완료되면 즉시 크롤링을 실행합니다.
const crawler = new PageCrawler();
const analysisResult = crawler.analyze();

// 2. React 앱을 삽입할 컨테이너(div)를 페이지의 body에 만듭니다.
const rootElement = document.createElement('div');
rootElement.id = "page-crawler-root"; // CSS 스타일을 적용하기 위한 ID
document.body.appendChild(rootElement);

// 3. 위에서 만든 컨테이너에 React 앱을 렌더링합니다.
//    크롤링 결과를 'initialData'라는 prop으로 App 컴포넌트에 전달합니다.
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App initialData={analysisResult} />
  </React.StrictMode>
);
