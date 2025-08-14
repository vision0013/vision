import React from 'react';
import ReactDOM from 'react-dom/client';
import { PageCrawler } from './crawler';
import App from '../popup/App'; // UI를 담당하는 App 컴포넌트를 가져옵니다.

// React 앱을 삽입할 컨테이너(div)를 페이지의 body에 만듭니다.
const rootElement = document.createElement('div');
rootElement.id = "page-crawler-root";
document.body.appendChild(rootElement);
const reactRoot = ReactDOM.createRoot(rootElement);

// 이전에 강조 표시된 요소를 추적하기 위한 변수
let highlightedElement: HTMLElement | null = null;

/**
 * 페이지를 크롤링하고 결과를 React 패널에 렌더링하는 메인 함수
 */
const crawlAndRender = () => {
  console.log('Page analysis started...');
  const crawler = new PageCrawler();
  const analysisResult = crawler.analyze();

  // 패널의 항목을 클릭했을 때 실행될 함수
  const handleItemClick = (ownerId: number) => {
    const element = document.querySelector(`[data-crawler-id="${ownerId}"]`) as HTMLElement;
    if (element) {
      if (highlightedElement) {
        highlightedElement.style.outline = '';
        highlightedElement.style.boxShadow = '';
      }
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.style.outline = '3px solid #007AFF';
      element.style.boxShadow = '0 0 15px rgba(0, 122, 255, 0.5)';
      highlightedElement = element;
      setTimeout(() => {
        if (highlightedElement === element) {
           element.style.outline = '';
           element.style.boxShadow = '';
           highlightedElement = null;
        }
      }, 2500);
    }
  };

  // React 앱을 렌더링 (또는 업데이트) 합니다.
  reactRoot.render(
    <React.StrictMode>
      <App initialData={analysisResult} onItemClick={handleItemClick} />
    </React.StrictMode>
  );
};

// 1. 페이지 로드 시 첫 크롤링 및 렌더링 실행
crawlAndRender();


// --- 동적 변화 감지를 위한 MutationObserver 설정 ---

// 디바운싱을 위한 타이머 변수
let debounceTimeout: number;

// DOM 변화 감지 시 실행될 콜백 함수
const mutationCallback = () => {
  // 기존 타이머를 취소하고 새 타이머를 설정합니다 (디바운싱).
  clearTimeout(debounceTimeout);
  debounceTimeout = window.setTimeout(() => {
    console.log('DOM has changed. Re-analyzing page...');
    
    // 재분석 중에는 잠시 감시를 중단합니다.
    observer.disconnect(); 
    
    // 페이지를 다시 크롤링하고 패널을 업데이트합니다.
    crawlAndRender(); 
    
    // 작업이 끝나면 다시 감시를 시작합니다.
    observer.observe(document.body, observerConfig);
  }, 1500); // 1.5초 동안 추가 변경이 없으면 실행
};

// MutationObserver 인스턴스 생성
const observer = new MutationObserver(mutationCallback);

// 감시할 변화의 종류를 설정
const observerConfig = {
  childList: true,  // 자식 요소의 추가/제거
  subtree: true,    // 모든 하위 요소의 변화
  attributes: true, // 속성 변화
  characterData: true // 텍스트 내용 변화
};

// 2. 페이지 전체(document.body)에 대한 감시 시작
observer.observe(document.body, observerConfig);
