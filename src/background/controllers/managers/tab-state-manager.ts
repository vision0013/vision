// 탭 상태 관리자 - Map 기반 고성능 상태 관리

import { TabState, ActiveElementState } from '../../types/background-types';
import { CrawledItem } from '../../../types';

export class TabStateManager {
  private states = new Map<number, TabState>();

  updateUrl(tabId: number, newUrl: string): boolean {
    const state = this.getOrCreate(tabId);
    if (state.lastUrl === newUrl) return false;
    state.lastUrl = newUrl;
    return true;
  }

  setDebounce(tabId: number, callback: () => void, delay: number): void {
    const state = this.getOrCreate(tabId);
    if (state.debounceTimeout) clearTimeout(state.debounceTimeout);
    state.debounceTimeout = setTimeout(callback, delay);
  }

  setActiveElement(tabId: number, ownerId: number | null): void {
    const state = this.getOrCreate(tabId);
    state.activeElement = { ownerId, timestamp: Date.now() };
  }

  getActiveElement(tabId: number): ActiveElementState | undefined {
    return this.states.get(tabId)?.activeElement;
  }

  setCrawledData(tabId: number, items: CrawledItem[]): void {
    const state = this.getOrCreate(tabId);
    state.crawledItems = items;
    console.log(`[TabStateManager] Set ${items.length} crawled items for tab ${tabId}`);
  }

  appendCrawledData(tabId: number, newItems: CrawledItem[]): void {
    const state = this.getOrCreate(tabId);
    if (!state.crawledItems) state.crawledItems = [];
    state.crawledItems.push(...newItems);
    console.log(`[TabStateManager] Appended ${newItems.length} new items for tab ${tabId}. Total: ${state.crawledItems.length}`);
  }

  getCrawledData(tabId: number): CrawledItem[] | undefined {
    return this.states.get(tabId)?.crawledItems;
  }

  // ✨ [신규] Viewport 설정 메소드
  setViewport(tabId: number, viewport: { width: number; height: number }): void {
    const state = this.getOrCreate(tabId);
    state.viewport = viewport;
  }

  // ✨ [신규] Viewport 조회 메소드
  getViewport(tabId: number): { width: number; height: number } | undefined {
    return this.states.get(tabId)?.viewport;
  }

  getTabState(tabId: number): TabState | undefined {
    return this.states.get(tabId);
  }

  cleanup(tabId: number): void {
    const state = this.states.get(tabId);
    if (state) {
      if (state.debounceTimeout) clearTimeout(state.debounceTimeout);
      state.crawledItems = undefined;
      state.viewport = undefined; // ✨ [수정] viewport 정보도 정리
    }
    this.states.delete(tabId);
    console.log(`[TabStateManager] Cleaned up state for tab ${tabId}`);
  }

  getTabCount(): number {
    return this.states.size;
  }

  private getOrCreate(tabId: number): TabState {
    if (!this.states.has(tabId)) {
      this.states.set(tabId, { crawledItems: [], viewport: { width: 0, height: 0 } }); // ✨ [수정] 초기 상태 추가
    }
    return this.states.get(tabId)!;
  }
}

export const tabStateManager = new TabStateManager();