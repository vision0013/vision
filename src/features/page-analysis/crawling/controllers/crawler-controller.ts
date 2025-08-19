import { CrawledItem, AnalysisResult, ICrawler } from '@/types';
import { CrawlerState } from '../types/crawler-state';
import { createCrawlerState, updateVisibility } from '../process/state-management';
import { walkElement, removeDuplicates } from '../process/dom-walking';

let globalState: CrawlerState | null = null;

export function analyze(): AnalysisResult {
  const T0 = performance.now();
  const state = createCrawlerState();
  globalState = state;
  
  walkElement(document.body, state, null);
  
  const finalItems = removeDuplicates(state.items);
  state.items = finalItems;
  
  finalItems.sort((a, b) => {
    if (a.hidden !== b.hidden) {
      return a.hidden ? 1 : -1;
    }
    return (a.rect.top - b.rect.top) || (a.rect.left - b.rect.left);
  });
  
  const elapsed = Number((performance.now() - T0).toFixed(1));
  const visibleCount = finalItems.filter(item => !item.hidden).length;
  const hiddenCount = finalItems.filter(item => item.hidden).length;
  
  return { 
    url: location.href, 
    userAgent: navigator.userAgent, 
    visited: state.visited, 
    elapsedMs: elapsed, 
    items: finalItems,
    stats: {
      total: finalItems.length,
      visible: visibleCount,
      hidden: hiddenCount
    }
  };
}

export function analyzeElements(elements: HTMLElement[]): CrawledItem[] {
  const T0 = performance.now();
  
  if (!globalState) {
    globalState = createCrawlerState();
  }
  
  const originalItems = globalState.items;
  const newItemsOnly: CrawledItem[] = [];
  const tempState = { ...globalState, items: newItemsOnly };

  elements.forEach(el => {
    if (el instanceof HTMLElement) {
      walkElement(el, tempState, null);
    }
  });

  globalState.items = originalItems;
  
  const visibilityUpdates = updateVisibility(globalState);
  
  const allNewItems = [...newItemsOnly, ...visibilityUpdates];
  const uniqueNewItems = removeDuplicates(allNewItems);
  
  const elapsed = Number((performance.now() - T0).toFixed(1));
  if (uniqueNewItems.length > 0) {
    console.log(`✅ Dynamic analysis: ${uniqueNewItems.length} items (${newItemsOnly.length} new, ${visibilityUpdates.length} revealed) in ${elapsed}ms`);
  }
  
  return uniqueNewItems;
}

export const pageCrawler: ICrawler = {
  analyze,
  analyzeElements
};