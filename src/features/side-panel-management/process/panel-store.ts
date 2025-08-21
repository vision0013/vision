import { create } from 'zustand';
import { SidePanelState } from '../types/panel-types';
import { AIModelStatus } from '../../ai-inference/types/ai-types';

export const useSidePanelStore = create<SidePanelState>((set, get) => ({
  tabDataMap: {},
  activeTabId: null,
  // ✨ AI 모델 상태를 초기화합니다.
  aiModelStatus: { isLoaded: false, isLoading: false },

  // ✨ AI 모델 상태를 업데이트하는 함수를 구현합니다.
  setAiModelStatus: (status: AIModelStatus) => {
    set({ aiModelStatus: status });
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
