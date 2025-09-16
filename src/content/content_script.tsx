// content_script.tsx
import { pageCrawler, startDynamicObserver, stopDynamicObserver } from '../features/page-analysis/crawling';
import { processVoiceCommand } from '../features/voice-commands';
import { applyHighlightToElement, removeHighlightFromElement } from '../features/highlighting';
import { AnalysisResult, CrawledItem } from '@/types';

// ✨ [BUGFIX] iframe 내부에서 스크립트가 실행되는 것을 방지
// 최상위 프레임이 아닐 경우, 아무 작업도 수행하지 않고 즉시 종료
if (window.self !== window.top) {
  console.log('🚫 [content] Running in iframe, stopping execution.');
} else {
  // 최상위 프레임일 경우에만 모든 로직 실행
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

  // 🤖 AI 기반 음성 명령은 Background에서 처리되므로 여기서는 메시지만 중계
  async function executeAIVoiceAction(userInput: string, _items: CrawledItem[]) {
    console.log(`🤖 [content] AI voice command "${userInput}" request received, but AI processing is handled by Background`);

    // AI 처리는 Background에서 수행되고, 결과만 여기서 받아서 실행
    // Background → Offscreen → AI Analysis → Background → Content Script 순서로 처리됨
    return {
      error: 'AI processing should be handled by Background, not Content Script'
    };
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
    
    const analysisResult = await pageCrawler.analyze();
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
  chrome.runtime.onMessage.addListener(async (request, _sender, _sendResponse) => {
    try {
      if (request.action === 'runCrawler') {
        runCrawler();
      }

      if (request.action === 'FETCH_MAIN_CONTENT') {
        const selectors = [
          '#post-area', // New primary selector based on b.html
          '.se-main-container',
          '#postViewArea',
          'div.se_component_wrap',
          'article.se_component_wrap',
          'div.se-viewer',
          'div.blog_content',
          'div.post-view',
          'div.post_content',
        ];

        let mainContentElement: Element | null = null;
        for (const selector of selectors) {
          mainContentElement = document.querySelector(selector); // Always query on main document
          if (mainContentElement) {
            break; // Found an element, stop searching
          }
        }

        if (mainContentElement) {
          chrome.runtime.sendMessage({
            action: 'PROCESS_HTML_TO_MARKDOWN',
            html: mainContentElement.innerHTML,
            title: document.title
          });
        } else {
          chrome.runtime.sendMessage({
            action: 'MARKDOWN_RESULT',
            markdown: '오류: 네이버 블로그 본문 영역을 찾을 수 없습니다. (시도된 선택자: ' + selectors.join(', ') + ') 다른 블로그거나 구조가 다를 수 있습니다.',
            title: '추출 오류'
          });
        }
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
      
      
      if (request.action === 'processVoiceCommand') {
        console.log('🎯 [content] Executing:', request.detectedAction, 'target:', request.targetText, 'direction:', request.direction);
        if (currentAnalysisResult?.items) {
          executeVoiceAction(request, currentAnalysisResult.items);
        } else {
          console.log('❌ No analysis data available');
        }
      }

      // 🤖 AI 기반 음성 명령 처리 (신규)
      if (request.action === 'processAIVoiceCommand') {
        console.log('🤖 [content] Processing AI voice command:', request.userInput);
        if (currentAnalysisResult?.items) {
          try {
            const results = await executeAIVoiceAction(request.userInput, currentAnalysisResult.items);
            return results; // Background에 결과 반환
          } catch (error) {
            console.error('❌ [content] AI voice command failed:', error);
            return { error: error instanceof Error ? error.message : 'Unknown error' };
          }
        } else {
          console.log('❌ No analysis data available for AI command');
          return { error: 'No crawling data available' };
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

  // 초기화 및 크롤링 시작
  runCrawler();
}