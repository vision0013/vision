import { create } from 'zustand';
import { SidePanelState, TabData } from '../types/panel-types';
import { AIModelStatus } from '../../ai-inference/types/ai-types';
import { Mode } from '@/types';

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
};

// Helper to get or create a tab's data with defaults
const getOrCreateTabData = (tabDataMap: Record<number, TabData>, tabId: number): TabData => {
  return tabDataMap[tabId] || {
    analysisResult: null,
    filter: 'all',
    searchTerm: '',
    mode: 'navigate', // ✨ [신규] 기본 모드 설정
  };
};

export const useSidePanelStore = create<SidePanelState>((set, get) => ({
  tabDataMap: {},
  activeTabId: null,
  aiModelStatus: { state: 1 },
  isLoading: false, // ✨ [신규] 로딩 상태 초기화

  // ✨ [신규] 로딩 상태 설정 함수
  setIsLoading: (loading: boolean) => set({ isLoading: loading }),

  // ✨ [신규] 모드 변경 함수
  setMode: (mode: Mode, tabId) => {
    const currentTabId = tabId || get().activeTabId;
    if (!currentTabId) return;

    set((state) => ({
      tabDataMap: {
        ...state.tabDataMap,
        [currentTabId]: {
          ...getOrCreateTabData(state.tabDataMap, currentTabId),
          mode: mode,
        },
      },
    }));
  },

  setAiModelStatus: (status: AIModelStatus) => set({ aiModelStatus: status }),

  setAiError: (error: unknown) => {
    const errorMessage = getErrorMessage(error);
    set(state => ({ 
      aiModelStatus: { 
        ...state.aiModelStatus, 
        error: errorMessage,
        state: state.aiModelStatus.state === 2 ? 1 : state.aiModelStatus.state
      } 
    }));
  },

  clearAiError: () => {
    set(state => ({ 
      aiModelStatus: { ...state.aiModelStatus, error: undefined } 
    }));
  },

  setAnalysisResult: (result, tabId) => {
    const currentTabId = tabId || get().activeTabId;
    if (!currentTabId) return;

    set((state) => ({
      tabDataMap: {
        ...state.tabDataMap,
        [currentTabId]: {
          ...getOrCreateTabData(state.tabDataMap, currentTabId),
          analysisResult: result,
        },
      },
    }));
  },
  
  addAnalysisItems: (newItems, tabId) => {
    const currentTabId = tabId || get().activeTabId;
    if (!currentTabId || newItems.length === 0) return;

    set((state) => {
      const currentTabData = get().tabDataMap[currentTabId];
      if (!currentTabData?.analysisResult) return state;

      const updatedItems = [...currentTabData.analysisResult.items, ...newItems];
      
      return {
        tabDataMap: {
          ...state.tabDataMap,
          [currentTabId]: {
            ...currentTabData,
            analysisResult: { ...currentTabData.analysisResult, items: updatedItems },
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
          ...getOrCreateTabData(state.tabDataMap, currentTabId),
          filter,
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
          ...getOrCreateTabData(state.tabDataMap, currentTabId),
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