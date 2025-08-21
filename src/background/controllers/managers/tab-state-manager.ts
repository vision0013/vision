// 탭 상태 관리자 - Map 기반 고성능 상태 관리

import { TabState, ActiveElementState } from '../../types/background-types';

export class TabStateManager {
  private states = new Map<number, TabState>();

  /**
   * URL 업데이트 - 중복 체크 포함
   */
  updateUrl(tabId: number, newUrl: string): boolean {
    const state = this.getOrCreate(tabId);
    if (state.lastUrl === newUrl) return false;
    
    state.lastUrl = newUrl;
    return true;
  }

  /**
   * 디바운스 타이머 설정
   */
  setDebounce(tabId: number, callback: () => void, delay: number): void {
    const state = this.getOrCreate(tabId);
    
    // 기존 타이머 클리어
    if (state.debounceTimeout) {
      clearTimeout(state.debounceTimeout);
    }
    
    state.debounceTimeout = setTimeout(callback, delay);
  }

  /**
   * 활성 요소 상태 설정
   */
  setActiveElement(tabId: number, ownerId: number | null): void {
    const state = this.getOrCreate(tabId);
    state.activeElement = { 
      ownerId, 
      timestamp: Date.now() 
    };
  }

  /**
   * 활성 요소 상태 조회
   */
  getActiveElement(tabId: number): ActiveElementState | undefined {
    return this.states.get(tabId)?.activeElement;
  }

  /**
   * 탭 상태 전체 조회
   */
  getTabState(tabId: number): TabState | undefined {
    return this.states.get(tabId);
  }

  /**
   * 탭 정리 (탭 닫힐 때)
   */
  cleanup(tabId: number): void {
    const state = this.states.get(tabId);
    if (state?.debounceTimeout) {
      clearTimeout(state.debounceTimeout);
    }
    this.states.delete(tabId);
  }

  /**
   * 전체 탭 수 조회 (디버깅용)
   */
  getTabCount(): number {
    return this.states.size;
  }

  /**
   * 상태 가져오거나 생성
   */
  private getOrCreate(tabId: number): TabState {
    if (!this.states.has(tabId)) {
      this.states.set(tabId, {});
    }
    return this.states.get(tabId)!;
  }
}

// 싱글톤 인스턴스 (Background에서 하나만 사용)
export const tabStateManager = new TabStateManager();