// content_script.tsx
import { PageCrawler } from './crawler';
import { VoiceCommandProcessor } from './voice-commands';

// --- 전역 변수 ---
let highlightedElement: HTMLElement | null = null;
let currentAnalysisResult: any = null;

const crawler = new PageCrawler();
const voiceCommandProcessor = new VoiceCommandProcessor();

/**
 * URL 변경을 감지하고 background에 확인 요청
 */
const handleUrlChange = () => {
  console.log('🔍 URL change detected:', window.location.href);
  chrome.runtime.sendMessage({ action: 'checkUrl', url: window.location.href });
};

/**
 * 페이지를 크롤링하고 결과를 백그라운드로 전송하는 함수
 */
const runCrawler = () => {
  console.log('🔄 Page analysis started for:', window.location.href);
  const analysisResult = crawler.analyze();
  currentAnalysisResult = analysisResult;
  
  chrome.runtime.sendMessage({ action: 'crawlComplete', data: analysisResult });
};

/**
 * 요소를 하이라이트하는 함수
 */
const highlightElementById = (ownerId: number) => {
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

// --- URL 변경 감지 설정 ---

// 1. History API 메서드 가로채기 (SPA 내비게이션)
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function(...args) {
  originalPushState.apply(history, args);
  handleUrlChange();
};

history.replaceState = function(...args) {
  originalReplaceState.apply(history, args);
  handleUrlChange();
};

// 2. 뒤로가기/앞으로가기 감지
window.addEventListener('popstate', handleUrlChange);

// 3. 새로운 Navigation API (Chrome 102+) - 타입 체크 추가
if ('navigation' in window && (window as any).navigation) {
  const navigation = (window as any).navigation;
  if (navigation && typeof navigation.addEventListener === 'function') {
    navigation.addEventListener('navigate', handleUrlChange);
  }
}

// --- 메시지 리스너 ---
chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
  if (request.action === 'runCrawler') {
    runCrawler();
  }
  
  if (request.action === 'highlightElement') {
    highlightElementById(request.ownerId);
  }
  
  if (request.action === 'processVoiceCommand') {
    if (currentAnalysisResult?.items) {
      voiceCommandProcessor.processCommand(request.command, currentAnalysisResult.items);
    }
  }
});

// --- 초기 실행 ---
// 페이지 최초 로드 시 즉시 크롤링
runCrawler();

// --- Fallback: 혹시 모를 놓친 변경 대비 (선택사항) ---
// 10초마다 한 번씩만 체크 (매우 낮은 빈도)
setInterval(handleUrlChange, 10000);