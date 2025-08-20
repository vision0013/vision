import { ICrawler, CrawledItem } from '@/types';
import { ObserverState } from '../types/observer-types';
import { processMutations } from '../process/mutation-handler';

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
    childList: true,        // 자식 요소 추가/삭제 감지
    subtree: true,          // 모든 하위 요소 감지
    attributes: true,       // 속성 변경 감지 활성화
    attributeOldValue: true, // 이전 속성 값 보존 (포털 변화 감지 필수)
    attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'id'] // 가시성 및 식별자 속성 감시
  });
  console.log('🔍 Dynamic element observer started with attribute monitoring.');
}

export function stopDynamicObserver(): void {
  if (!globalObserverState) return;
  globalObserverState.observer.disconnect();
  if (globalObserverState.observerTimeout) {
    clearTimeout(globalObserverState.observerTimeout);
  }
  
  globalObserverState = null;
  console.log('🛑 Dynamic element observer stopped');
}

function handleMutations(state: ObserverState, mutations: MutationRecord[]): void {
  if (state.observerTimeout) {
    clearTimeout(state.observerTimeout);
  }
  
  state.observerTimeout = window.setTimeout(() => {
    // 분리된 processMutations 함수 호출
    const newItems = processMutations(mutations, state.crawler);
    
    // 결과가 있으면 콜백 호출
    if (newItems.length > 0) {
      state.onNewItemsFound(newItems);
    }
    
    state.observerTimeout = null;
  }, 300); // 300ms 디바운싱
}