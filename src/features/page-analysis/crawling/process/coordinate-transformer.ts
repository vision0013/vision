import { BoundingBox } from '@/types';

/**
 * iframe 내부 요소의 좌표를 메인 페이지 좌표계로 변환합니다.
 * 이를 통해 메인 페이지 요소들과 iframe 내부 요소들을 올바른 순서로 정렬할 수 있습니다.
 */
export class CoordinateTransformer {
  private iframeOffsets = new Map<HTMLIFrameElement, { x: number; y: number }>();

  /**
   * iframe의 메인 페이지 내 위치를 계산하여 저장합니다.
   */
  registerIframe(iframe: HTMLIFrameElement): void {
    const iframeRect = iframe.getBoundingClientRect();
    const offset = {
      x: iframeRect.left + window.scrollX,
      y: iframeRect.top + window.scrollY
    };
    
    this.iframeOffsets.set(iframe, offset);
    console.log(`📐 [coordinate] Registered iframe offset:`, offset);
  }

  /**
   * iframe 내부 요소의 좌표를 메인 페이지 좌표계로 변환합니다.
   * 
   * @param element - iframe 내부 요소
   * @param iframe - 부모 iframe 요소
   * @returns 변환된 BoundingBox (메인 페이지 기준)
   */
  transformIframeElementCoordinates(
    element: HTMLElement, 
    iframe: HTMLIFrameElement
  ): BoundingBox {
    // iframe 내부 좌표 (iframe 기준)
    const elementRect = element.getBoundingClientRect();
    
    // iframe의 메인 페이지 내 오프셋
    const iframeOffset = this.iframeOffsets.get(iframe);
    
    if (!iframeOffset) {
      console.warn('⚠️ [coordinate] Iframe offset not registered, using element coordinates as-is');
      return {
        top: elementRect.top,
        left: elementRect.left,
        width: elementRect.width,
        height: elementRect.height
      };
    }

    // iframe 내부 좌표 + iframe 오프셋 = 메인 페이지 좌표
    const transformedCoordinates = {
      top: elementRect.top + iframeOffset.y,
      left: elementRect.left + iframeOffset.x,
      width: elementRect.width,
      height: elementRect.height
    };

    console.log(`📐 [coordinate] Transformed coordinates:`, {
      original: { top: elementRect.top, left: elementRect.left },
      iframeOffset,
      transformed: { top: transformedCoordinates.top, left: transformedCoordinates.left }
    });

    return transformedCoordinates;
  }

  /**
   * 좌표 변환이 필요한지 확인합니다.
   * iframe 내부 요소인 경우 true를 반환합니다.
   */
  needsTransformation(element: HTMLElement): boolean {
    // 요소가 iframe 내부에 있는지 확인
    let current: HTMLElement | null = element;
    
    while (current && current !== document.body) {
      if (current.ownerDocument !== document) {
        return true; // 다른 document = iframe 내부
      }
      current = current.parentElement;
    }
    
    return false;
  }

  /**
   * 요소가 속한 iframe을 찾습니다.
   */
  findParentIframe(element: HTMLElement): HTMLIFrameElement | null {
    const elementDoc = element.ownerDocument;
    
    if (elementDoc === document) {
      return null; // 메인 document의 요소
    }

    // iframe을 찾아서 반환
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        if (iframe.contentDocument === elementDoc) {
          return iframe as HTMLIFrameElement;
        }
      } catch (e) {
        // CORS로 접근 불가능한 iframe은 무시
        continue;
      }
    }

    return null;
  }

  /**
   * 등록된 iframe 정보를 초기화합니다.
   */
  clear(): void {
    this.iframeOffsets.clear();
    console.log('🧹 [coordinate] Cleared iframe offsets');
  }
}

// 싱글톤 인스턴스
export const coordinateTransformer = new CoordinateTransformer();