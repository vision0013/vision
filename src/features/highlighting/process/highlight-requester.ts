import { HighlightRequest } from '../types/highlight-types';

export function requestHighlight(tabId: number, ownerId: number): void {
  const message: HighlightRequest = {
    action: 'highlightElement',
    tabId: tabId,
    ownerId: ownerId
  };
  
  chrome.runtime.sendMessage(message);
}