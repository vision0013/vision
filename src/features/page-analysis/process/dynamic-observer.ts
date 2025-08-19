import { ICrawler, CrawledItem } from '../../../types';
import { CrawlerState } from '../types/crawler-state';
import { createCrawlerState } from './state-management';
import { removeDuplicates } from './dom-walking';

interface ObserverState {
  observer: MutationObserver;
  observerTimeout: number | null;
  crawler: ICrawler;
  onNewItemsFound: (newItems: CrawledItem[]) => void;
}

function detectElementMoves(mutations: MutationRecord[]): HTMLElement[] {
  const removedElements = new Set<Element>();
  const addedElements = new Set<Element>();
  const positionChangedElements = new Set<HTMLElement>();
  
  mutations.forEach(mutation => {
    if (mutation.type === 'childList') {
      mutation.removedNodes.forEach(node => {
        if (node instanceof HTMLElement) {
          removedElements.add(node);
        }
      });
      mutation.addedNodes.forEach(node => {
        if (node instanceof HTMLElement) {
          addedElements.add(node);
        }
      });
    }
    // 부모 변화나 위치 변화 감지
    else if (mutation.type === 'attributes' && 
             ['class', 'style', 'id'].includes(mutation.attributeName || '')) {
      if (mutation.target instanceof HTMLElement && 
          mutation.target.hasAttribute('data-crawler-id')) {
        positionChangedElements.add(mutation.target);
      }
    }
  });
  
  // 교집합 = 이동된 요소들 (제거 + 추가가 동시에 일어난 요소)
  const directlyMovedElements = [...removedElements].filter(el => 
    addedElements.has(el) && el.hasAttribute('data-crawler-id')
  ) as HTMLElement[];
  
  // 위치나 속성 변화로 인한 이동 요소들
  const indirectlyMovedElements = [...positionChangedElements].filter(el => {
    const rect = el.getBoundingClientRect();
    // 요소가 화면에서 크게 이동했는지 확인 (임계값: 100px)
    const prevRect = el.dataset.prevRect ? JSON.parse(el.dataset.prevRect) : rect;
    const moved = Math.abs(rect.top - prevRect.top) > 100 || 
                  Math.abs(rect.left - prevRect.left) > 100;
    
    // 현재 위치 저장
    el.dataset.prevRect = JSON.stringify({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height
    });
    
    return moved;
  });
  
  const allMovedElements = [...directlyMovedElements, ...indirectlyMovedElements];
  
  if (allMovedElements.length > 0) {
    console.log(`🚀 Portal movement detected: ${directlyMovedElements.length} direct moves, ${indirectlyMovedElements.length} position changes`);
  }
  
  return allMovedElements;
}

function detectPortalNavigationChanges(mutations: MutationRecord[]): HTMLElement[] {
  const portalContainers: HTMLElement[] = [];
  
  mutations.forEach(mutation => {
    if (mutation.type === 'attributes' && mutation.target instanceof HTMLElement) {
      const target = mutation.target;
      const attributeName = mutation.attributeName;
      
      // 구글 검색 결과와 같은 포털 컨테이너 패턴 감지
      if (attributeName === 'class' || attributeName === 'id') {
        const currentValue = target.getAttribute(attributeName) || '';
        const prevValue = mutation.oldValue || '';
        
        // 클래스나 ID 변화가 포털/모달/dropdown 관련인지 확인
        const isPortalChange = 
          (currentValue.includes('expanded') && !prevValue.includes('expanded')) ||
          (currentValue.includes('open') && !prevValue.includes('open')) ||
          (currentValue.includes('show') && !prevValue.includes('show')) ||
          (currentValue.includes('visible') && !prevValue.includes('visible')) ||
          // 구글 검색 특수 케이스: 컨테이너 ID 변화
          (attributeName === 'id' && currentValue !== prevValue && 
           (currentValue.includes('pb') || prevValue.includes('pb')));
        
        if (isPortalChange) {
          console.log(`🎯 Portal navigation detected: ${attributeName} changed from "${prevValue}" to "${currentValue}"`);
          portalContainers.push(target);
          
          // 하위 요소들도 함께 체크
          const childElements = target.querySelectorAll('[data-crawler-id]');
          childElements.forEach(child => {
            if (child instanceof HTMLElement) {
              portalContainers.push(child);
            }
          });
        }
      }
    }
  });
  
  return [...new Set(portalContainers)]; // 중복 제거
}

function scanChildrenWithoutIds(parentElement: HTMLElement): CrawledItem[] {
  const tempState = createCrawlerState();
  const elementsWithoutIds: HTMLElement[] = [];
  
  // 부모 요소 내부에서 data-crawler-id가 없는 요소들 찾기
  const walker = document.createTreeWalker(
    parentElement,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node) => {
        const element = node as HTMLElement;
        if (!element.hasAttribute('data-crawler-id') && element !== parentElement) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      }
    }
  );
  
  let currentNode = walker.nextNode();
  while (currentNode) {
    if (currentNode instanceof HTMLElement) {
      elementsWithoutIds.push(currentNode);
    }
    currentNode = walker.nextNode();
  }
  
  // ID 없는 요소들을 개별적으로 스캔 (재귀 없이)
  elementsWithoutIds.forEach(el => {
    walkSingleElement(el, tempState);
  });
  
  if (elementsWithoutIds.length > 0) {
    console.log(`🔍 Scanned ${elementsWithoutIds.length} elements without IDs in moved container`);
  }
  
  return tempState.items;
}

function walkSingleElement(el: HTMLElement, state: CrawlerState): void {
  // 기존 walkElement 로직을 단일 요소용으로 단순화
  if (state.elIdMap.has(el)) {
    return;
  }
  
  const ownerId = state.nextElementId++;
  state.elIdMap.set(el, ownerId);
  el.setAttribute('data-crawler-id', ownerId.toString());
  
  // 기본 메타데이터 저장
  const tag = el.tagName.toLowerCase();
  const meta = {
    tag,
    role: el.getAttribute('role') || '',
    rect: el.getBoundingClientRect(),
    parentId: null,
  };
  state.elMeta.set(ownerId, meta);
  
  // TARGET_TAGS 확인하여 크롤링 아이템 생성 (간단한 버전)
  if (['a', 'button', 'input', 'textarea', 'select'].includes(tag)) {
    const isVisible = getComputedStyle(el).display !== 'none';
    
    if (tag === 'a') {
      const href = el.getAttribute('href') || '';
      const text = el.textContent?.trim() || '';
      if (href || text) {
        state.items.push({
          id: state.nextItemId++,
          ownerId,
          parentId: null,
          tag,
          role: meta.role,
          rect: meta.rect,
          type: 'link',
          href,
          text,
          hidden: !isVisible
        });
      }
    }
    // 다른 요소 타입들도 필요시 추가
  }
}

function handleMutations(state: ObserverState, mutations: MutationRecord[]): void {
  if (state.observerTimeout) {
    clearTimeout(state.observerTimeout);
  }
  
  state.observerTimeout = window.setTimeout(() => {
    // 1. 포털 이동 감지
    const movedElements = detectElementMoves(mutations);
    
    // 2. 포털 네비게이션 변화 감지 (구글 검색 더보기 등)
    const portalChangedElements = detectPortalNavigationChanges(mutations);
    
    // 3. 기존 로직: 일반적인 DOM 변화 처리
    const elementsToAnalyze: HTMLElement[] = [];
    
    mutations.forEach(mutation => {
      // 자식 노드가 추가된 경우
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node instanceof HTMLElement && 
              !movedElements.includes(node) && 
              !portalChangedElements.includes(node)) {
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
    
    let allNewItems: CrawledItem[] = [];
    
    // 3. 포털 이동된 요소들의 자식 스캔
    if (movedElements.length > 0) {
      movedElements.forEach(movedEl => {
        const portalItems = scanChildrenWithoutIds(movedEl);
        allNewItems.push(...portalItems);
      });
    }
    
    // 4. 포털 네비게이션 변화된 요소들 스캔
    if (portalChangedElements.length > 0) {
      portalChangedElements.forEach(changedEl => {
        const portalItems = scanChildrenWithoutIds(changedEl);
        allNewItems.push(...portalItems);
      });
      console.log(`🎯 Analyzed ${portalChangedElements.length} portal navigation elements`);
    }
    
    // 5. 기존 로직: 일반 요소들 분석
    const uniqueElements = [...new Set(elementsToAnalyze)];
    if (uniqueElements.length > 0) {
      console.log(`🔄 DOM changed, analyzing ${uniqueElements.length} new/updated elements.`);
      const regularItems = state.crawler.analyzeElements(uniqueElements);
      allNewItems.push(...regularItems);
    }
    
    // 6. 중복 제거 및 결과 전달
    if (allNewItems.length > 0) {
      const uniqueNewItems = removeDuplicates(allNewItems);
      const totalPortalElements = movedElements.length + portalChangedElements.length;
      console.log(`✅ Found ${uniqueNewItems.length} new items (${totalPortalElements > 0 ? `including ${totalPortalElements} portal elements` : 'regular changes'})`);
      state.onNewItemsFound(uniqueNewItems);
    } else {
      console.log(`📝 No new crawlable items found.`);
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
    childList: true,        // 자식 요소 추가/삭제 감지
    subtree: true,          // 모든 하위 요소 감지
    attributes: true,       // 속성 변경 감지 활성화
    attributeOldValue: true, // 이전 속성 값 보존 (포털 변화 감지 필수)
    attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'id'] // 가시성 및 식별자 속성 감시
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