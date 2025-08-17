import { DEFAULT_HIGHLIGHT_DURATION } from '../config/constants';
import { HighlightState } from '../types/highlight-types';
import { applyHighlight, removeHighlight } from '../process/highlight-executor';

export function createHighlightManager() {
  const state: HighlightState = {
    highlightedElement: null,
    highlightTimer: null
  };

  const remove = (): void => {
    if (state.highlightTimer) {
      clearTimeout(state.highlightTimer);
      state.highlightTimer = null;
    }
    if (state.highlightedElement) {
      removeHighlight(state.highlightedElement);
      state.highlightedElement = null;
    }
  };

  const apply = (element: HTMLElement, duration: number = DEFAULT_HIGHLIGHT_DURATION): void => {
    // 이전 하이라이트가 있다면 즉시 제거
    remove();

    // 새 요소에 하이라이트 적용
    applyHighlight(element);
    state.highlightedElement = element;

    // 일정 시간 후 하이라이트 자동 제거
    state.highlightTimer = window.setTimeout(() => {
      remove();
    }, duration);
  };

  return {
    apply,
    remove
  };
}

// 기존 클래스 API와 호환성을 위한 래퍼
export class HighlightManager {
  private manager: ReturnType<typeof createHighlightManager>;

  constructor() {
    this.manager = createHighlightManager();
  }

  apply(element: HTMLElement, duration?: number): void {
    this.manager.apply(element, duration);
  }

  remove(): void {
    this.manager.remove();
  }
}