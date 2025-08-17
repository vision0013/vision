import { HIGHLIGHT_STYLES, SCROLL_OPTIONS } from '../config/constants';

export function applyHighlight(element: HTMLElement): void {
  element.scrollIntoView(SCROLL_OPTIONS);
  element.style.outline = HIGHLIGHT_STYLES.outline;
  element.style.boxShadow = HIGHLIGHT_STYLES.boxShadow;
}

export function removeHighlight(element: HTMLElement): void {
  element.style.outline = '';
  element.style.boxShadow = '';
}