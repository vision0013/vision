// content_script.tsx
import { pageCrawler, startDynamicObserver, stopDynamicObserver } from '../features/page-analysis/crawling';
import { processVoiceCommand } from '../features/voice-commands'; // ✨ [개선] processVoiceCommand만 import
import { applyHighlightToElement, removeHighlightFromElement } from '../features/highlighting';
import { AnalysisResult, CrawledItem } from '@/types';

let currentAnalysisResult: AnalysisResult | null = null;
let dynamicObserverActive = false;

// ✨ [개선] executeVoiceAction 함수를 processVoiceCommand 호출로 대체
function executeVoiceAction(request: any, items: CrawledItem[]) {
  const { detectedAction, targetText, originalCommand, direction } = request;
  
  // ✨ [개선] payload 객체로 묶어서 전달
  const result = processVoiceCommand({
    detectedAction,
    targetText,
    direction,
    originalCommand,
    items
  });
  
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

// URL 감지는 Background에서 담당하므로 Content Script에서는 제거

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

// URL 변경 감지는 Background에서 Chrome API로 처리

// 크롬 메시지 리스너
chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
  try {
    if (request.action === 'runCrawler') {
      runCrawler();
    }
    
    if (request.action === 'activeElementChanged') {
      // ✨ [수정] 중앙 상태 기반 하이라이팅 처리
      if (request.ownerId) {
        const element = document.querySelector(`[data-crawler-id="${request.ownerId}"]`) as HTMLElement;
        if (element) {
          applyHighlightToElement(element);
        }
      } else {
        // ownerId가 null이면 모든 하이라이팅 제거
        removeHighlightFromElement();
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
