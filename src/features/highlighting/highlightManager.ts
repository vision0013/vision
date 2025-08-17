// 이 클래스는 content_script 내에서 단일 인스턴스로 관리됩니다.
export class HighlightManager {
  private highlightedElement: HTMLElement | null = null;
  private highlightTimer: number | null = null;

  // 하이라이트를 적용하는 메서드
  apply(element: HTMLElement, duration: number = 2500): void {
    // 이전 하이라이트가 있다면 즉시 제거
    this.remove();

    // 새 요소에 하이라이트 적용
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.style.outline = '3px solid #007AFF';
    element.style.boxShadow = '0 0 15px rgba(0, 122, 255, 0.5)';
    this.highlightedElement = element;

    // 일정 시간 후 하이라이트 자동 제거
    this.highlightTimer = window.setTimeout(() => {
      this.remove();
    }, duration);
  }

  // 하이라이트를 제거하는 메서드
  remove(): void {
    if (this.highlightTimer) {
      clearTimeout(this.highlightTimer);
      this.highlightTimer = null;
    }
    if (this.highlightedElement) {
      this.highlightedElement.style.outline = '';
      this.highlightedElement.style.boxShadow = '';
      this.highlightedElement = null;
    }
  }
}