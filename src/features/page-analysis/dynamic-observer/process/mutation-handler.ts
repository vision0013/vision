import { CrawledItem, ICrawler } from '@/types';
import { DetectionResult } from '../types/observer-types';
import { detectElementMoves, detectPortalNavigationChanges } from './mutation-detector';
import { scanChildrenWithoutIds } from './element-scanner';
import { removeDuplicates } from '../../crawling/process/dom-walking';

export function processMutations(
  mutations: MutationRecord[],
  crawler: ICrawler
): CrawledItem[] {
  const startTime = performance.now();
  
  // 1. 변화 감지
  const detectionResult = detectChanges(mutations);
  
  // 2. 새로운 아이템 수집
  const allNewItems = collectNewItems(detectionResult, crawler);
  
  // 3. 중복 제거 및 결과 반환
  const uniqueNewItems = removeDuplicates(allNewItems);
  
  // 4. 로깅
  logResults(detectionResult, uniqueNewItems, startTime);
  
  return uniqueNewItems;
}

function detectChanges(mutations: MutationRecord[]): DetectionResult {
  // 1. 포털 이동 감지
  const movedElements = detectElementMoves(mutations);
  
  // 2. 포털 네비게이션 변화 감지 (구글 검색 더보기 등)
  const portalChangedElements = detectPortalNavigationChanges(mutations);
  
  // 3. 기존 로직: 일반적인 DOM 변화 처리
  const regularElements: HTMLElement[] = [];
  
  mutations.forEach(mutation => {
    // 자식 노드가 추가된 경우
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach(node => {
        if (node instanceof HTMLElement && 
            !movedElements.includes(node) && 
            !portalChangedElements.includes(node)) {
          regularElements.push(node);
        }
      });
    }
    // 속성이 변경된 경우
    else if (mutation.type === 'attributes') {
      if (mutation.target instanceof HTMLElement) {
        regularElements.push(mutation.target);
      }
    }
  });
  
  return {
    movedElements,
    portalChangedElements,
    regularElements: [...new Set(regularElements)]
  };
}

function collectNewItems(
  detectionResult: DetectionResult,
  crawler: ICrawler
): CrawledItem[] {
  const allNewItems: CrawledItem[] = [];
  
  // 1. 포털 이동된 요소들의 자식 스캔
  if (detectionResult.movedElements.length > 0) {
    detectionResult.movedElements.forEach(movedEl => {
      const portalItems = scanChildrenWithoutIds(movedEl);
      allNewItems.push(...portalItems);
    });
  }
  
  // 2. 포털 네비게이션 변화된 요소들 스캔
  if (detectionResult.portalChangedElements.length > 0) {
    detectionResult.portalChangedElements.forEach(changedEl => {
      const portalItems = scanChildrenWithoutIds(changedEl);
      allNewItems.push(...portalItems);
    });
    console.log(`🎯 Analyzed ${detectionResult.portalChangedElements.length} portal navigation elements`);
  }
  
  // 3. 기존 로직: 일반 요소들 분석
  if (detectionResult.regularElements.length > 0) {
    console.log(`🔄 DOM changed, analyzing ${detectionResult.regularElements.length} new/updated elements.`);
    const regularItems = crawler.analyzeElements(detectionResult.regularElements);
    allNewItems.push(...regularItems);
  }
  
  return allNewItems;
}

function logResults(
  detectionResult: DetectionResult,
  uniqueNewItems: CrawledItem[],
  startTime: number
): void {
  const totalPortalElements = detectionResult.movedElements.length + detectionResult.portalChangedElements.length;
  const elapsed = (performance.now() - startTime).toFixed(1);
  
  if (uniqueNewItems.length > 0) {
    console.log(`✅ Found ${uniqueNewItems.length} new items in ${elapsed}ms (${totalPortalElements > 0 ? `including ${totalPortalElements} portal elements` : 'regular changes'})`);
  } else {
    console.log(`📝 No new crawlable items found (${elapsed}ms).`);
  }
}