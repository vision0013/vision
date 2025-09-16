import { CrawledItem } from '@/types';
import { CrawlerState } from '../../crawling/types/crawler-state';
import { createCrawlerState } from '../../crawling/process/state-management';
// ✨ [신규] 공통 분석 함수 임포트
import { getElementStateAndActionability } from '../../crawling/process/element-analysis';

export function scanChildrenWithoutIds(parentElement: HTMLElement): CrawledItem[] {
  // 성능 최적화: 깊은 스캔 대신 직접 자식만 체크
  const tempState = createCrawlerState();
  const targetTags = ['a', 'button', 'input', 'textarea', 'select'];
  
  // 직접 자식 요소들만 빠르게 스캔 (TreeWalker 대신 querySelector 사용)
  const selector = targetTags
    .map(tag => `${tag}:not([data-crawler-id])`)
    .join(', ');
  
  const elementsWithoutIds = parentElement.querySelectorAll(selector) as NodeListOf<HTMLElement>;
  
  // 빠른 스캔: 중요한 요소들만 처리
  elementsWithoutIds.forEach(el => {
    walkSingleElement(el, tempState);
  });
  
  if (elementsWithoutIds.length > 0) {
    console.log(`🔍 Fast-scanned ${elementsWithoutIds.length} target elements in changed container`);
  }
  
  return tempState.items;
}

export function walkSingleElement(el: HTMLElement, state: CrawlerState): void {
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

  // ✨ [신규] 요소의 상태와 행동 가능성 정보 추출
  const { state: elementState, isClickable, isInputtable } = getElementStateAndActionability(el);
  
  // TARGET_TAGS 확인하여 크롤링 아이템 생성
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
          hidden: !isVisible,
          // ✨ [신규] 타입 에러 해결을 위해 새로운 속성 추가
          state: elementState,
          isClickable,
          isInputtable,
        });
      }
    }
    // 다른 요소 타입들도 필요시 추가
  }
}
