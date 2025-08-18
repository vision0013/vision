// content_script.tsx
import { pageCrawler, startDynamicObserver, stopDynamicObserver } from '../features/page-analysis';
import { clickAction, findAction, scrollAction, inputAction, navigationAction } from '../features/voice-commands';
import { applyHighlightToElement } from '../features/highlighting';
import { AnalysisResult, CrawledItem } from '../types';

let currentAnalysisResult: AnalysisResult | null = null;
let dynamicObserverActive = false;

// ✨ [수정] executeVoiceAction 함수 시그니처 변경 (direction 추가)
function executeVoiceAction(request: any, items: CrawledItem[]) {
  const { detectedAction, targetText, originalCommand, direction } = request;
  
  let result;
  
  switch (detectedAction) {
    case 'click':
      // ✨ [수정] direction 전달
      result = clickAction(targetText, items, direction);
      break;
    case 'find':
      // ✨ [수정] direction 전달
      result = findAction(targetText, items, direction);
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
      // ✨ [수정] direction 전달
      result = findAction(targetText, items, direction);
  }
  
  console.log('🎯 [content] Action result:', result);
}

const safeRuntimeMessage = async (message: any, maxRetries = 3): Promise<boolean> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await chrome.runtime.sendMessage(message);
      return true;
    } catch (error: any) {
      if (error.message.includes('Extension context invalidated') || 
          error.message.includes('Receiving end does not exist')) {
        if (i < maxRetries - 1) {
          const waitTime = 100 * Math.pow(2, i);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      } else {
        console.error('❌ Unexpected runtime error:', error);
        return false;
      }
    }
  }
  return false;
};

const handleUrlChange = async () => {
  await safeRuntimeMessage({ 
    action: 'checkUrl', 
    url: window.location.href 
  });
};

const runCrawler = async () => {
  if (dynamicObserverActive) {
    stopDynamicObserver();
    dynamicObserverActive = false;
  }
  
  const analysisResult = pageCrawler.analyze();
  currentAnalysisResult = analysisResult;
  
  const success = await safeRuntimeMessage({ 
    action: 'crawlComplete', 
    data: analysisResult 
  });
  
  if (success) {
    startDynamicObserver(pageCrawler, async (newItems: CrawledItem[]) => {
      await safeRuntimeMessage({ 
        action: 'addNewItems', 
        data: newItems 
      });
    });
    dynamicObserverActive = true;
  }
};

// URL 변경 감지 설정
const originalPushState = history.pushState;
history.pushState = function(...args) {
  originalPushState.apply(history, args);
  handleUrlChange();
};
const originalReplaceState = history.replaceState;
history.replaceState = function(...args) {
  originalReplaceState.apply(history, args);
  handleUrlChange();
};
window.addEventListener('popstate', handleUrlChange);
if ('navigation' in window && (window as any).navigation) {
    (window as any).navigation.addEventListener('navigate', handleUrlChange);
}

// 크롬 메시지 리스너
chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
  try {
    if (request.action === 'runCrawler') {
      runCrawler();
    }
    
    if (request.action === 'highlightElement') {
      const element = document.querySelector(`[data-crawler-id="${request.ownerId}"]`) as HTMLElement;
      if (element) {
        applyHighlightToElement(element);
      }
    }
    
    if (request.action === 'executeProcessedCommand') {
      console.log('🎯 [content] Executing:', request.detectedAction, 'target:', request.targetText, 'direction:', request.direction);
      if (currentAnalysisResult?.items) {
        executeVoiceAction(request, currentAnalysisResult.items);
      } else {
        console.log('❌ No analysis data available');
      }
    }
  } catch (error: any) {
    console.error('❌ Message listener error:', error);
  }
});

window.addEventListener('beforeunload', () => {
  if (dynamicObserverActive) {
    stopDynamicObserver();
    dynamicObserverActive = false;
  }
});

runCrawler();
