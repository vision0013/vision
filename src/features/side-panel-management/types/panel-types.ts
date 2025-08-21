import { AnalysisResult, CrawledItem } from '@/types';
import { AIModelStatus } from "@/features/ai-inference/types/ai-types";

// 각 탭별로 관리될 데이터 구조
export interface TabData {
  analysisResult: AnalysisResult | null;
  filter: string;
  searchTerm: string;
}

// Zustand 스토어의 전체 상태 타입
export interface SidePanelState {
  tabDataMap: Record<number, TabData>;
  activeTabId: number | null;
  
  // ✨ AI 모델 상태와 상태 변경 함수 타입을 추가합니다.
  aiModelStatus: AIModelStatus;
  setAiModelStatus: (status: AIModelStatus) => void;

  setAnalysisResult: (result: AnalysisResult, tabId?: number) => void;
  addAnalysisItems: (newItems: CrawledItem[], tabId?: number) => void;
  setFilter: (filter: string, tabId?: number) => void;
  setSearchTerm: (term: string, tabId?: number) => void;
  setActiveTabId: (id: number) => void;
  getFilteredItems: (tabId?: number) => CrawledItem[];
}
