import { CrawledItem } from '../../../types';
import { CrawlerState } from '../types/crawler-state';
import { isCurrentlyVisible, bbox } from './element-analysis';

export function createCrawlerState(): CrawlerState {
  return {
    visited: 0,
    nextElementId: 0,
    nextItemId: 0,
    elIdMap: new WeakMap<HTMLElement, number>(),
    elMeta: new Map<number, any>(),
    items: [],
    seenTextGlobal: new Set<string>()
  };
}

export function updateVisibility(state: CrawlerState): CrawledItem[] {
  const updatedItems: CrawledItem[] = [];
  
  state.items.forEach(item => {
    if (item.hidden) {
      const el = document.querySelector(`[data-crawler-id="${item.ownerId}"]`) as HTMLElement;
      if (el && isCurrentlyVisible(el)) {
        item.hidden = false;
        item.rect = bbox(el);
        updatedItems.push(item);
      }
    }
  });
  
  return updatedItems;
}