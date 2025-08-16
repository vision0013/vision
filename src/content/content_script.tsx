import { PageCrawler } from './crawler';
import { VoiceCommandProcessor } from './voice-commands';

// --- 전역 변수 ---
let highlightedElement: HTMLElement | null = null;
let debounceTimeout: number;
let currentAnalysisResult: any = null;

// ✨ 1. 핵심 수정: PageCrawler 인스턴스를 한 번만 생성하여 재사용
const crawler = new PageCrawler();
const voiceCommandProcessor = new VoiceCommandProcessor();

/**
 * 페이지를 크롤링하고 결과를 백그라운드로 전송하는 함수
 */
const runCrawler = () => {
  console.log('🔄 Page analysis started...');
  // ✨ 2. 핵심 수정: 기존 인스턴스를 사용 (내부적으로 reset 호출됨)
  const analysisResult = crawler.analyze();

  currentAnalysisResult = analysisResult;

  console.log('🔄 Sending crawl results to background script:', analysisResult.items.length, 'items');
  
  chrome.runtime.sendMessage({
    action: 'crawlComplete',
    data: analysisResult
  });
};

/**
 * 특정 ownerId를 가진 요소를 찾아 하이라이트하는 함수
 * @param ownerId - 하이라이트할 요소의 data-crawler-id
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

// --- 이벤트 리스너 및 옵저버 설정 ---

chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
  if (request.action === 'highlightElement') {
    highlightElementById(request.ownerId);
  }
  
  if (request.action === 'processVoiceCommand') {
    if (currentAnalysisResult && currentAnalysisResult.items) {
      console.log('Processing voice command:', request.command);
      const result = voiceCommandProcessor.processCommand(request.command, currentAnalysisResult.items);
      console.log('Voice command result:', result);
    } else {
      console.warn('No analysis result available for voice command');
    }
  }
});

const runPartialCrawler = (changedElements: HTMLElement[]) => {
  if (!currentAnalysisResult || changedElements.length === 0) return;
  
  // ✨ 3. 핵심 수정: 기존 인스턴스를 사용하여 '새로운' 아이템만 찾아냄
  const newItems = crawler.analyzeElements(changedElements);
  
  if (newItems.length > 0) {
    const updatedResult = {
      ...currentAnalysisResult,
      items: [...currentAnalysisResult.items, ...newItems]
    };
    
    currentAnalysisResult = updatedResult;
    
    console.log(`🔄 Added ${newItems.length} new items (total: ${updatedResult.items.length})`);
    
    chrome.runtime.sendMessage({
      action: 'crawlComplete',
      data: updatedResult
    });
  }
};

const mutationCallback = (mutations: MutationRecord[]) => {
  const changedElements = new Set<HTMLElement>();
  let hasSignificantChange = false;
  
  mutations.forEach(mutation => {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      mutation.addedNodes.forEach(node => {
        if (node instanceof HTMLElement) {
          changedElements.add(node);
        }
      });
      hasSignificantChange = true;
    }
    if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
      hasSignificantChange = true;
    }
    if (mutation.type === 'attributes' && mutation.target instanceof HTMLElement) {
      changedElements.add(mutation.target);
    }
  });

  if (hasSignificantChange) {
    clearTimeout(debounceTimeout);
    debounceTimeout = window.setTimeout(() => {
      const elementsArray = Array.from(changedElements);
      if (elementsArray.length > 0) {
        console.log('🔄 Running partial crawling on', elementsArray.length, 'changed elements...');
        runPartialCrawler(elementsArray);
      }
    }, 500);
  }
};

const observer = new MutationObserver(mutationCallback);
const observerConfig = {
  childList: true,
  subtree: true,
  attributes: true,
  characterData: true
};

let currentUrl = window.location.href;

const checkUrlChange = () => {
  const newUrl = window.location.href;
  if (newUrl !== currentUrl) {
    console.log('🔄 URL changed from', currentUrl, 'to', newUrl);
    currentUrl = newUrl;
    setTimeout(() => {
      console.log('🔄 Re-analyzing page after navigation...');
      runCrawler();
    }, 1000);
  }
};

window.addEventListener('popstate', () => {
  console.log('🔄 Popstate event detected');
  checkUrlChange();
});

const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function(...args) {
  originalPushState.apply(history, args);
  console.log('🔄 PushState detected');
  setTimeout(checkUrlChange, 100);
};

history.replaceState = function(...args) {
  originalReplaceState.apply(history, args);
  console.log('🔄 ReplaceState detected');
  setTimeout(checkUrlChange, 100);
};

window.addEventListener('hashchange', () => {
  console.log('🔄 Hash change detected');
  checkUrlChange();
});

// --- 초기 실행 ---
observer.observe(document.body, observerConfig);
runCrawler();
