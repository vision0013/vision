// content_script.tsx
import { pageCrawler, startDynamicObserver, stopDynamicObserver } from '../features/page-analysis/crawling';
import { applyHighlightToElement, removeHighlightFromElement } from '../features/highlighting';

// ✨ [BUGFIX] iframe 내부에서 스크립트가 실행되는 것을 방지
if (window.self !== window.top) {
  console.log('🚫 [content] Running in iframe, stopping execution.');
} else {
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
    if (dynamicObserverActive) {
      stopDynamicObserver();
      dynamicObserverActive = false;
    }
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

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
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

        case 'execute_click': {
          const element = document.querySelector(`[data-crawler-id="${request.crawlerId}"]`) as HTMLElement;
          if (element) {
            element.click();
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: `Element with ID ${request.crawlerId} not found` });
          }
          return true;
        }

        case 'execute_input': {
          const element = document.querySelector(`[data-crawler-id="${request.crawlerId}"]`) as HTMLInputElement | HTMLTextAreaElement;
          if (element) {
            element.value = request.value;
            element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: `Element with ID ${request.crawlerId} not found` });
          }
          return true;
        }

        case 'execute_navigate': {
          if (request.url) {
            window.location.href = request.url;
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'No URL provided' });
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

  window.addEventListener('beforeunload', () => {
    if (dynamicObserverActive) stopDynamicObserver();
  });

  runCrawler();
}