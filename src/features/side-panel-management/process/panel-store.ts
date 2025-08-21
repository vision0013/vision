import { create } from 'zustand';
import { SidePanelState } from '../types/panel-types';
import { AIModelStatus } from '../../ai-inference/types/ai-types';

/**
 * 안전하게 에러 메시지를 추출하는 타입 가드
 */
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const msg = (error as any).message;
    return typeof msg === 'string' ? msg : 'Unknown error';
  }
  return 'An unexpected error occurred';
};

export const useSidePanelStore = create<SidePanelState>((set, get) => ({
  tabDataMap: {},
  activeTabId: null,
  // ✨ AI 모델 상태를 초기화합니다.
  aiModelStatus: { state: 1 }, // 1: 캐시없음/로딩안됨

  // ✨ AI 모델 상태를 업데이트하는 함수를 구현합니다.
  setAiModelStatus: (status: AIModelStatus) => {
    set({ aiModelStatus: status });
  },

  // ✨ 안전한 에러 처리 액션
  setAiError: (error: unknown) => {
    const errorMessage = getErrorMessage(error);
    set(state => ({ 
      aiModelStatus: { 
        ...state.aiModelStatus, 
        error: errorMessage,
        state: state.aiModelStatus.state === 2 ? 1 : state.aiModelStatus.state // 로딩 중이었다면 캐시없음으로
      } 
    }));
  },

  // ✨ 에러 클리어 액션
  clearAiError: () => {
    set(state => ({ 
      aiModelStatus: { 
        ...state.aiModelStatus, 
        error: undefined 
      } 
    }));
  },

  setAnalysisResult: (result, tabId) => {
    const currentTabId = tabId || get().activeTabId;
    if (!currentTabId) return;

    set((state) => ({
      tabDataMap: {
        ...state.tabDataMap,
        [currentTabId]: {
          ...state.tabDataMap[currentTabId],
          analysisResult: result,
          filter: state.tabDataMap[currentTabId]?.filter || 'all',
          searchTerm: state.tabDataMap[currentTabId]?.searchTerm || '',
        },
      },
    }));
  },
  
  addAnalysisItems: (newItems, tabId) => {
    const currentTabId = tabId || get().activeTabId;
    if (!currentTabId || newItems.length === 0) return;

    set((state) => {
      const currentTabData = state.tabDataMap[currentTabId];
      if (!currentTabData?.analysisResult) return state;

      const updatedItems = [...currentTabData.analysisResult.items, ...newItems];
      
      return {
        tabDataMap: {
          ...state.tabDataMap,
          [currentTabId]: {
            ...currentTabData,
            analysisResult: {
              ...currentTabData.analysisResult,
              items: updatedItems,
            },
          },
        },
      };
    });
  },

  setFilter: (filter, tabId) => {
    const currentTabId = tabId || get().activeTabId;
    if (!currentTabId) return;

    set((state) => ({
      tabDataMap: {
        ...state.tabDataMap,
        [currentTabId]: {
          ...state.tabDataMap[currentTabId],
          analysisResult: state.tabDataMap[currentTabId]?.analysisResult || null,
          filter,
          searchTerm: state.tabDataMap[currentTabId]?.searchTerm || '',
        },
      },
    }));
  },

  setSearchTerm: (term, tabId) => {
    const currentTabId = tabId || get().activeTabId;
    if (!currentTabId) return;

    set((state) => ({
      tabDataMap: {
        ...state.tabDataMap,
        [currentTabId]: {
          ...state.tabDataMap[currentTabId],
          analysisResult: state.tabDataMap[currentTabId]?.analysisResult || null,
          filter: state.tabDataMap[currentTabId]?.filter || 'all',
          searchTerm: term,
        },
      },
    }));
  },

  setActiveTabId: (id) => set({ activeTabId: id }),

  getFilteredItems: (tabId) => {
    const currentTabId = tabId || get().activeTabId;
    if (!currentTabId) return [];

    const tabData = get().tabDataMap[currentTabId];
    if (!tabData?.analysisResult) return [];

    let items = tabData.analysisResult.items;

    if (tabData.filter !== 'all') {
      items = items.filter(item => item.type === tabData.filter);
    }

    if (tabData.searchTerm) {
      const searchLower = tabData.searchTerm.toLowerCase();
      items = items.filter(item =>
        item.text?.toLowerCase().includes(searchLower) ||
        item.alt?.toLowerCase().includes(searchLower) ||
        item.label?.toLowerCase().includes(searchLower) ||
        item.href?.toLowerCase().includes(searchLower)
      );
    }

    return items;
  },
}));
