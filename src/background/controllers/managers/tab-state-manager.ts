// 탭 상태 관리자 - Map 기반 고성능 상태 관리

import { TabState, ActiveElementState } from '../../types/background-types';
import { CrawledItem, Mode } from '../../../types'; // ✨ [수정] Mode 임포트 경로 변경

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
  }

  appendCrawledData(tabId: number, newItems: CrawledItem[]): void {
    const state = this.getOrCreate(tabId);
    if (!state.crawledItems) state.crawledItems = [];
    state.crawledItems.push(...newItems);
  }

  getCrawledData(tabId: number): CrawledItem[] | undefined {
    return this.states.get(tabId)?.crawledItems;
  }

  setViewport(tabId: number, viewport: { width: number; height: number }): void {
    const state = this.getOrCreate(tabId);
    state.viewport = viewport;
  }

  getViewport(tabId: number): { width: number; height: number } | undefined {
    return this.states.get(tabId)?.viewport;
  }

  setMode(tabId: number, mode: Mode): void {
    const state = this.getOrCreate(tabId);
    state.mode = mode;
    console.log(`[TabStateManager] Mode for tab ${tabId} set to: ${mode}`);
  }

  getMode(tabId: number): Mode | undefined {
    return this.states.get(tabId)?.mode;
  }

  getTabState(tabId: number): TabState | undefined {
    return this.states.get(tabId);
  }

  cleanup(tabId: number): void {
    const state = this.states.get(tabId);
    if (state) {
      if (state.debounceTimeout) clearTimeout(state.debounceTimeout);
      state.crawledItems = undefined;
      state.viewport = undefined;
      state.mode = undefined;
    }
    this.states.delete(tabId);
    console.log(`[TabStateManager] Cleaned up state for tab ${tabId}`);
  }

  getTabCount(): number {
    return this.states.size;
  }

  private getOrCreate(tabId: number): TabState {
    if (!this.states.has(tabId)) {
      this.states.set(tabId, { 
        crawledItems: [], 
        viewport: { width: 0, height: 0 },
        mode: 'navigate' 
      });
    }
    return this.states.get(tabId)!;
  }
}

export const tabStateManager = new TabStateManager();