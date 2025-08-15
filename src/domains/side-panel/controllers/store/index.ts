import { create } from 'zustand';
import { AnalysisResult, CrawledItem } from '../../../../types';

// 스토어의 상태와 액션에 대한 타입 정의
interface SidePanelState {
  analysisResult: AnalysisResult | null;
  filter: string;
  searchTerm: string;
  activeTabId: number | null;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  setFilter: (filter: string) => void;
  setSearchTerm: (term: string) => void;
  setActiveTabId: (id: number | null) => void;
  getFilteredItems: () => CrawledItem[];
}

export const useSidePanelStore = create<SidePanelState>((set, get) => ({
  // --- 상태 (State) ---
  analysisResult: null,
  filter: 'all',
  searchTerm: '',
  activeTabId: null,

  // --- 액션 (Actions) ---
  setAnalysisResult: (result) => set({ analysisResult: result }),
  setFilter: (filter) => set({ filter }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  setActiveTabId: (id) => set({ activeTabId: id }),

  // --- 필터링 로직 (Selector/Getter) ---
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
