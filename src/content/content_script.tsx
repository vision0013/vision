// content_script.tsx - 전체 코드 (상세 디버깅 버전)
import { pageCrawler, startDynamicObserver, stopDynamicObserver } from '../features/page-analysis';
import { clickAction, findAction, scrollAction, inputAction, navigationAction } from '../features/voice-commands';
import { applyHighlightToElement } from '../features/highlighting';


// =============================================
// 전역 변수 선언
// =============================================
let currentAnalysisResult: any = null;
let dynamicObserverActive = false;

// =============================================
// 백그라운드에서 분석된 음성 명령 실행
// =============================================
function executeVoiceAction(request: any, items: any[]) {
  const { detectedAction, targetText, originalCommand } = request;
  
  let result;
  
  switch (detectedAction) {
    case 'click':
      result = clickAction(targetText, items);
      break;
    case 'find':
      result = findAction(targetText, items);
      break;
    case 'scroll':
      result = scrollAction(targetText || originalCommand, items);
      break;
    case 'input':
      result = inputAction(originalCommand, items);
      break;
    case 'navigation':
      result = navigationAction(targetText || originalCommand, items);
      break;
    default:
      result = findAction(targetText, items);
  }
  
  console.log('🎯 [content] Action result:', result);
}

// =============================================
// 안전한 메시지 전송 함수 (재시도 로직 포함)
// =============================================
const safeRuntimeMessage = async (message: any, maxRetries = 3): Promise<boolean> => {
  console.log('📤 Attempting to send message:', message.action);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await chrome.runtime.sendMessage(message);
      console.log('✅ Message sent successfully:', message.action);
      return true;
    } catch (error: any) {
      if (error.message.includes('Extension context invalidated') || 
          error.message.includes('Receiving end does not exist')) {
        
        console.log(`🔄 Attempt ${i + 1}/${maxRetries}: Extension not ready, waiting...`);
        
        if (i < maxRetries - 1) {
          // 지수 백오프: 100ms, 200ms, 400ms 간격으로 재시도
          const waitTime = 100 * Math.pow(2, i);
          console.log(`⏰ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      } else {
        console.error('❌ Unexpected runtime error:', error);
        return false;
      }
    }
  }
  
  console.log(`❌ Failed to connect to extension after ${maxRetries} attempts for:`, message.action);
  return false;
};

// =============================================
// URL 변경 감지 및 백그라운드 알림
// =============================================
const handleUrlChange = async () => {
  console.log('🔍 URL change detected:', window.location.href);
  console.log('📡 Notifying background script of URL change...');
  
  const success = await safeRuntimeMessage({ 
    action: 'checkUrl', 
    url: window.location.href 
  });
  
  if (success) {
    console.log('✅ Background script notified of URL change');
  } else {
    console.log('❌ Failed to notify background script of URL change');
  }
};

// =============================================
// 페이지 크롤링 및 동적 감지 시작
// =============================================
const runCrawler = async () => {
  console.log('🔄 Page analysis started for:', window.location.href);
  console.log('🧹 Cleaning up existing observer...');
  
  // 기존 observer 정리
  if (dynamicObserverActive) {
    stopDynamicObserver();
    dynamicObserverActive = false;
    console.log('🛑 Previous observer stopped');
  }
  
  // 페이지 분석 실행
  console.log('🔍 Starting full page crawl...');
  const crawlStartTime = performance.now();
  const analysisResult = pageCrawler.analyze();
  const crawlEndTime = performance.now();
  
  console.log(`📊 Crawl completed: ${analysisResult.items.length} items in ${(crawlEndTime - crawlStartTime).toFixed(1)}ms`);
  
  currentAnalysisResult = analysisResult;
  
  // 백그라운드로 결과 전송
  const success = await safeRuntimeMessage({ 
    action: 'crawlComplete', 
    data: analysisResult 
  });
  
  if (success) {
    
    startDynamicObserver(pageCrawler, async (newItems: any) => {
      // 동적 요소가 많이 감지되면 간단히 로깅
      if (newItems.length > 10) {
        console.log(`🆕 Found ${newItems.length} new dynamic items`);
      } else if (newItems.length > 0) {
        console.log('🆕 New items:', newItems.map((item: any) => `${item.type}:${item.text || item.label || '[no text]'}`));
      }
      
      await safeRuntimeMessage({ 
        action: 'addNewItems', 
        data: newItems 
      });
    });
    
    dynamicObserverActive = true;
  }
};

// =============================================
// 요소 하이라이트 함수
// =============================================


// =============================================
// URL 변경 감지 설정 (SPA 대응)
// =============================================
console.log('🔧 Setting up URL change detection...');

// 1. History API 메서드 가로채기 (SPA 내비게이션)
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function(...args) {
  console.log('📍 pushState detected');
  originalPushState.apply(history, args);
  handleUrlChange(); // async 함수지만 백그라운드 실행
};

history.replaceState = function(...args) {
  console.log('📍 replaceState detected'); 
  originalReplaceState.apply(history, args);
  handleUrlChange();
};

// 2. 뒤로가기/앞으로가기 감지
window.addEventListener('popstate', () => {
  console.log('📍 popstate event detected');
  handleUrlChange();
});

// 3. 새로운 Navigation API (Chrome 102+) - 타입 체크 추가
if ('navigation' in window && (window as any).navigation) {
  const navigation = (window as any).navigation;
  if (navigation && typeof navigation.addEventListener === 'function') {
    console.log('🆕 Navigation API available, setting up listener');
    navigation.addEventListener('navigate', () => {
      console.log('📍 Navigation API navigate event detected');
      handleUrlChange();
    });
  }
} else {
  console.log('📱 Navigation API not available (older Chrome)');
}

console.log('✅ URL change detection setup complete');

// =============================================
// 크롬 메시지 리스너
// =============================================
console.log('📡 Setting up message listeners...');

chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
  console.log('📨 Message received:', request.action);
  
  try {
    if (request.action === 'runCrawler') {
      console.log('🔄 Processing runCrawler command');
      runCrawler();
    }
    
    // 👇 하이라이트 요청 처리 부분을 HighlightManager를 사용하도록 변경
    if (request.action === 'highlightElement') {
      console.log('🎯 Processing highlightElement command for ownerId:', request.ownerId);
      const element = document.querySelector(`[data-crawler-id="${request.ownerId}"]`) as HTMLElement;
      if (element) {
        applyHighlightToElement(element);
      } else {
        console.log(`❌ Element not found with ownerId: ${request.ownerId}`);
      }
    }
    
   // 👇 백그라운드에서 분석된 음성 명령 실행
    if (request.action === 'executeProcessedCommand') {
      console.log('🎯 [content] Executing:', request.detectedAction, 'target:', request.targetText);
      
      if (currentAnalysisResult?.items) {
        executeVoiceAction(request, currentAnalysisResult.items);
      } else {
        console.log('❌ No analysis data available');
      }
    }
  } catch (error: any) {
    if (error.message.includes('Extension context invalidated')) {
      console.log('🔄 Extension context invalidated in message listener');
      return;
    }
    console.error('❌ Message listener error:', error);
  }
});

console.log('✅ Message listeners setup complete');

// =============================================
// 페이지 언로드 시 정리
// =============================================
window.addEventListener('beforeunload', () => {
  console.log('👋 Page unloading, cleaning up...');
  if (dynamicObserverActive) {
    stopDynamicObserver();
    dynamicObserverActive = false;
    console.log('🛑 Observer stopped before page unload');
  }
});

// =============================================
// 초기 실행
// =============================================
console.log('🚀 Content script initialization complete');
console.log('🔄 Starting initial page crawl...');

// 페이지 최초 로드 시 즉시 크롤링
runCrawler();