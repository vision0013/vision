// content_script.tsx
import { pageCrawler, startDynamicObserver, stopDynamicObserver } from '../features/page-analysis/crawling';
import { applyHighlightToElement, removeHighlightFromElement } from '../features/highlighting';

// ✨ [리팩터링] 메시지 리스너는 모든 프레임에서 실행되도록 분리
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  try {
    switch (request.action) {
      // ✨ 정밀 실행기: CLICK
      case 'execute_click': {
        const element = document.querySelector(`[data-crawler-id="${request.crawlerId}"]`) as HTMLElement;
        if (element) {
          console.log(`🖱️ [content] Executing CLICK on ID: ${request.crawlerId}`, element);
          element.click();
          sendResponse({ success: true });
        } else {
          // 이 프레임에 요소가 없을 수 있으므로 에러 대신 단순 로그 기록
          // console.log(`[content] CLICK: Element with ID ${request.crawlerId} not found in this frame.`);
          sendResponse({ success: false, error: 'Element not found in this frame' });
        }
        return true;
      }

      // ✨ 정밀 실행기: INPUT
      case 'execute_input': {
        const element = document.querySelector(`[data-crawler-id="${request.crawlerId}"]`) as HTMLInputElement | HTMLTextAreaElement;
        if (element) {
          console.log(`⌨️ [content] Executing INPUT on ID: ${request.crawlerId} with value: "${request.value}"`, element);
          element.value = request.value;
          element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
          sendResponse({ success: true });
        } else {
          // console.log(`[content] INPUT: Element with ID ${request.crawlerId} not found in this frame.`);
          sendResponse({ success: false, error: 'Element not found in this frame' });
        }
        return true;
      }

      // ✨ 정밀 실행기: NAVIGATE (최상위 프레임에서만 의미 있음)
      case 'execute_navigate': {
        if (window.self === window.top) {
          console.log(`🚀 [content] Executing NAVIGATE to: ${request.url}`);
          if (request.url) {
            window.location.href = request.url;
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'No URL provided' });
          }
        }
        return true;
      }
    }
  } catch (error: any) {
    console.error('❌ Message listener error:', error);
    sendResponse({ success: false, error: error.message });
    return true;
  }
});

// ✨ [리팩터링] 크롤러 및 페이지 분석 로직은 최상위 프레임에서만 실행
if (window.self === window.top) {
  console.log('✅ [content] Running in top-level frame. Initializing crawler and other listeners.');

  let dynamicObserverActive = false;

  const safeRuntimeMessage = async (message: any, maxRetries = 3): Promise<boolean> => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await chrome.runtime.sendMessage(message);
        return true;
      } catch (error: any) {
        if (error.message.includes('Extension context invalidated') || error.message.includes('Receiving end does not exist')) {
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

  const runCrawler = async () => {
    if (dynamicObserverActive) stopDynamicObserver();
    dynamicObserverActive = false;

    const analysisResult = await pageCrawler.analyze();
    const success = await safeRuntimeMessage({ 
      action: 'crawlComplete', 
      data: {
        analysisResult,
        viewport: { width: window.innerWidth, height: window.innerHeight }
      } 
    });

    if (success) {
      startDynamicObserver(pageCrawler, async (newItems) => {
        await safeRuntimeMessage({ action: 'addNewItems', data: newItems });
      });
      dynamicObserverActive = true;
    }
  };

  // 크롤링과 관련 없는 다른 메시지 리스너들
  chrome.runtime.onMessage.addListener((request) => {
    try {
      switch (request.action) {
        case 'runCrawler':
          runCrawler();
          break;

        case 'FETCH_MAIN_CONTENT':
          const selectors = ['#post-area', '.se-main-container', '#postViewArea', 'div.se_component_wrap', 'article.se_component_wrap', 'div.se-viewer', 'div.blog_content', 'div.post-view', 'div.post_content'];
          let mainContentElement: Element | null = null;
          for (const selector of selectors) {
            mainContentElement = document.querySelector(selector);
            if (mainContentElement) break;
          }
          if (mainContentElement) {
            chrome.runtime.sendMessage({ action: 'PROCESS_HTML_TO_MARKDOWN', html: mainContentElement.innerHTML, title: document.title });
          } else {
            chrome.runtime.sendMessage({ action: 'MARKDOWN_RESULT', markdown: '오류: 네이버 블로그 본문 영역을 찾을 수 없습니다.', title: '추출 오류' });
          }
          break;

        case 'activeElementChanged':
          if (request.ownerId) {
            const element = document.querySelector(`[data-crawler-id="${request.ownerId}"]`) as HTMLElement;
            if (element) applyHighlightToElement(element);
          } else {
            removeHighlightFromElement();
          }
          break;
      }
    } catch (e) {
      console.error('❌ Top-level message listener error:', e);
    }
  });

  window.addEventListener('beforeunload', () => {
    if (dynamicObserverActive) stopDynamicObserver();
  });

  runCrawler();

} else {
  console.log('🚫 [content] Running in iframe. Only execution listeners are active.');
}
