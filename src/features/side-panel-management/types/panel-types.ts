import { AnalysisResult, CrawledItem, Mode } from '@/types';
import { AIModelStatus } from "@/features/ai-inference/types/ai-types";

// 각 탭별로 관리될 데이터 구조
export interface TabData {
  analysisResult: AnalysisResult | null;
  filter: string;
  searchTerm: string;
  mode: Mode; // ✨ [신규] 탭별 모드
}

// Zustand 스토어의 전체 상태 타입
export interface SidePanelState {
  tabDataMap: Record<number, TabData>;
  activeTabId: number | null;
  isLoading: boolean; // ✨ [신규] 로딩 스피너 상태
  
  aiModelStatus: AIModelStatus;
  setAiModelStatus: (status: AIModelStatus) => void;
  setAiError: (error: unknown) => void;
  clearAiError: () => void;

  setAnalysisResult: (result: AnalysisResult, tabId?: number) => void;
  addAnalysisItems: (newItems: CrawledItem[], tabId?: number) => void;
  setFilter: (filter: string, tabId?: number) => void;
  setSearchTerm: (term: string, tabId?: number) => void;
  setActiveTabId: (id: number) => void;
  getFilteredItems: (tabId?: number) => CrawledItem[];

  // ✨ [신규] 상태 변경 함수 타입
  setMode: (mode: Mode, tabId?: number) => void;
  setIsLoading: (loading: boolean) => void;
}