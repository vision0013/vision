import { create } from 'zustand';
import { AnalysisResult, CrawledItem } from '../../../../types';

interface TabData {
  analysisResult: AnalysisResult | null;
  filter: string;
  searchTerm: string;
}

interface SidePanelState {
  // ✨ 멀티탭 구조로 변경
  tabDataMap: { [tabId: number]: TabData };
  activeTabId: number | null;
  
  setAnalysisResult: (result: AnalysisResult | null, tabId?: number) => void;
  addAnalysisItems: (newItems: CrawledItem[], tabId?: number) => void;
  setFilter: (filter: string, tabId?: number) => void;
  setSearchTerm: (term: string, tabId?: number) => void;
  setActiveTabId: (id: number | null) => void;
  getFilteredItems: (tabId?: number) => CrawledItem[];
}

export const useSidePanelStore = create<SidePanelState>((set, get) => ({
  tabDataMap: {},
  activeTabId: null,

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