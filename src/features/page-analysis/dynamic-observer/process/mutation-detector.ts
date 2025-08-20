export function detectElementMoves(mutations: MutationRecord[]): HTMLElement[] {
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
  
  // 위치 변화 감지 최적화: getBoundingClientRect 호출 최소화
  const indirectlyMovedElements: HTMLElement[] = [];
  
  // 성능 최적화: 위치 체크는 스킵하고 속성 변화만으로 판단
  positionChangedElements.forEach(el => {
    // 단순히 속성이 변했다면 재분석 대상으로 포함
    indirectlyMovedElements.push(el);
  });
  
  const allMovedElements = [...directlyMovedElements, ...indirectlyMovedElements];
  
  if (allMovedElements.length > 0) {
    console.log(`🚀 Portal movement detected: ${directlyMovedElements.length} direct moves, ${indirectlyMovedElements.length} position changes`);
  }
  
  return allMovedElements;
}

export function detectPortalNavigationChanges(mutations: MutationRecord[]): HTMLElement[] {
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