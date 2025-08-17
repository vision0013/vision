export interface HighlightState {
  highlightedElement: HTMLElement | null;
  highlightTimer: number | null;
}

export interface HighlightRequest {
  action: 'highlightElement';
  tabId: number;
  ownerId: number;
}