import { ICrawler, CrawledItem } from '../../../types';

interface ObserverState {
  observer: MutationObserver;
  observerTimeout: number | null;
  crawler: ICrawler;
  onNewItemsFound: (newItems: CrawledItem[]) => void;
}

function handleMutations(state: ObserverState, mutations: MutationRecord[]): void {
  if (state.observerTimeout) {
    clearTimeout(state.observerTimeout);
  }
  
  state.observerTimeout = window.setTimeout(() => {
    const elementsToAnalyze: HTMLElement[] = [];
    
    mutations.forEach(mutation => {
      // 자식 노드가 추가된 경우
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node instanceof HTMLElement) {
            elementsToAnalyze.push(node);
          }
        });
      }
      // 속성이 변경된 경우
      else if (mutation.type === 'attributes') {
        if (mutation.target instanceof HTMLElement) {
          elementsToAnalyze.push(mutation.target);
        }
      }
    });
    
    // 중복된 요소 제거
    const uniqueElements = [...new Set(elementsToAnalyze)];

    if (uniqueElements.length > 0) {
      console.log(`🔄 DOM changed, analyzing ${uniqueElements.length} new/updated elements.`);
      
      const newItems = state.crawler.analyzeElements(uniqueElements);
      
      if (newItems.length > 0) {
        console.log(`✅ Found ${newItems.length} new items from dynamic elements.`);
        state.onNewItemsFound(newItems);
      } else {
        console.log(`📝 No new crawlable items found in the changed elements.`);
      }
    }
    state.observerTimeout = null;
  }, 800); // 800ms 디바운싱
}

let globalObserverState: ObserverState | null = null;

export function startDynamicObserver(
  crawler: ICrawler, 
  onNewItemsCallback: (newItems: CrawledItem[]) => void
): void {
  if (globalObserverState) {
    stopDynamicObserver();
  }

  globalObserverState = {
    observer: new MutationObserver((mutations) => {
      // 유의미한 변경인지 확인
      const hasMeaningfulMutations = mutations.some(m => 
        (m.type === 'childList' && m.addedNodes.length > 0) || 
        m.type === 'attributes'
      );

      if (hasMeaningfulMutations && globalObserverState) {
        handleMutations(globalObserverState, mutations);
      }
    }),
    observerTimeout: null,
    crawler,
    onNewItemsFound: onNewItemsCallback
  };

  globalObserverState.observer.observe(document.body, {
    childList: true,    // 자식 요소 추가/삭제 감지
    subtree: true,      // 모든 하위 요소 감지
    attributes: true,   // 속성 변경 감지 활성화
    attributeFilter: ['class', 'style', 'hidden', 'aria-hidden'] // 가시성 관련 속성만 감시
  });
  console.log('🔍 Dynamic element observer started with attribute monitoring.');
}

export function stopDynamicObserver(): void {
  if (globalObserverState) {
    globalObserverState.observer.disconnect();
    if (globalObserverState.observerTimeout) {
      clearTimeout(globalObserverState.observerTimeout);
    }
    globalObserverState = null;
    console.log('🛑 Dynamic element observer stopped');
  }
}