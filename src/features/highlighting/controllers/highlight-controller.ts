import { DEFAULT_HIGHLIGHT_DURATION } from '../config/constants';
import { HighlightState } from '../types/highlight-types';
import { applyHighlight, removeHighlight } from '../process/highlight-executor';

let globalHighlightState: HighlightState = {
  highlightedElement: null,
  highlightTimer: null
};

export function removeHighlightFromElement(): void {
  if (globalHighlightState.highlightTimer) {
    clearTimeout(globalHighlightState.highlightTimer);
    globalHighlightState.highlightTimer = null;
  }
  if (globalHighlightState.highlightedElement) {
    removeHighlight(globalHighlightState.highlightedElement);
    globalHighlightState.highlightedElement = null;
  }
}

export function applyHighlightToElement(element: HTMLElement, duration: number = DEFAULT_HIGHLIGHT_DURATION): void {
  // 이전 하이라이트가 있다면 즉시 제거
  removeHighlightFromElement();

  // 새 요소에 하이라이트 적용
  applyHighlight(element);
  globalHighlightState.highlightedElement = element;

  // 일정 시간 후 하이라이트 자동 제거
  globalHighlightState.highlightTimer = window.setTimeout(() => {
    removeHighlightFromElement();
  }, duration);
}