import { AnalysisResult, CrawledItem } from '@/types';

export interface TabData {
  analysisResult: AnalysisResult | null;
  filter: string;
  searchTerm: string;
}

export interface SidePanelState {
  tabDataMap: { [tabId: number]: TabData };
  activeTabId: number | null;
  
  setAnalysisResult: (result: AnalysisResult | null, tabId?: number) => void;
  addAnalysisItems: (newItems: CrawledItem[], tabId?: number) => void;
  setFilter: (filter: string, tabId?: number) => void;
  setSearchTerm: (term: string, tabId?: number) => void;
  setActiveTabId: (id: number | null) => void;
  getFilteredItems: (tabId?: number) => CrawledItem[];
}