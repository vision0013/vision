import { create } from 'zustand';
import { AnalysisResult, CrawledItem } from '../../../../types';

interface SidePanelState {
  analysisResult: AnalysisResult | null;
  filter: string;
  searchTerm: string;
  activeTabId: number | null;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  // ✨ 1. 새로운 아이템을 추가하는 액션 타입 정의
  addAnalysisItems: (newItems: CrawledItem[]) => void;
  setFilter: (filter: string) => void;
  setSearchTerm: (term: string) => void;
  setActiveTabId: (id: number | null) => void;
  getFilteredItems: () => CrawledItem[];
}

export const useSidePanelStore = create<SidePanelState>((set, get) => ({
  analysisResult: null,
  filter: 'all',
  searchTerm: '',
  activeTabId: null,

  setAnalysisResult: (result) => {
    set({ analysisResult: result });
  },
  
  // ✨ 2. 새로운 액션 구현
  addAnalysisItems: (newItems) => set((state) => {
    if (!state.analysisResult || newItems.length === 0) {
      return {}; // 기존 상태 유지
    }

    // 새 아이템을 기존 목록에 추가
    const updatedItems = [...state.analysisResult.items, ...newItems];

    // 현재 analysisResult 상태를 새로운 아이템 목록으로 업데이트
    return {
      analysisResult: {
        ...state.analysisResult,
        items: updatedItems,
      },
    };
  }),

  setFilter: (filter) => set({ filter }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  setActiveTabId: (id) => set({ activeTabId: id }),

  getFilteredItems: () => {
    const { analysisResult, filter, searchTerm } = get();
    if (!analysisResult) return [];

    let items = analysisResult.items;

    if (filter !== 'all') {
      items = items.filter(item => item.type === filter);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
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
