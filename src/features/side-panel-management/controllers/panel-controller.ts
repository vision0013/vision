import { useEffect, useCallback, useRef } from 'react';
import { useSidePanelStore } from '../process/panel-store';
import { useSpeechRecognition, requestHighlight } from '../../index'; // features 내부 참조

export const useSidePanelController = () => {
  const {
    activeTabId,
    tabDataMap,
    setAnalysisResult,
    addAnalysisItems,
    setActiveTabId,
    getFilteredItems,
    setFilter,
    setSearchTerm,
  } = useSidePanelStore();

  // 현재 탭의 데이터를 직접 구독하여 탭 변경시 자동 업데이트
  const currentTabData = activeTabId && tabDataMap[activeTabId] 
    ? tabDataMap[activeTabId] 
    : { analysisResult: null, filter: 'all', searchTerm: '' };
  
  const { analysisResult, filter, searchTerm } = currentTabData;

  const analysisResultRef = useRef(analysisResult);
  const activeTabIdRef = useRef(activeTabId);

  useEffect(() => {
    analysisResultRef.current = analysisResult;
  }, [analysisResult]);

  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) setActiveTabId(tabs[0].id);
    });

    // 탭 변경 감지
    const handleTabActivated = (activeInfo: chrome.tabs.TabActiveInfo) => {
      setActiveTabId(activeInfo.tabId);
    };

    const handleTabUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
      if (changeInfo.status === 'complete' && tab.active) {
        setActiveTabId(tabId);
      }
    };

    chrome.tabs.onActivated.addListener(handleTabActivated);
    chrome.tabs.onUpdated.addListener(handleTabUpdated);
    
    const messageListener = (request: any) => {
      // 기존 전체 업데이트 로직
      if (request.action === 'updatePanelData') {
        console.log('📨 [SIDE-PANEL] Received updatePanelData with', request.data.items.length, 'items');
        console.log('📨 [SIDE-PANEL] Current active tab ID:', activeTabIdRef.current);
        // 현재 활성 탭 ID 전달
        setAnalysisResult(request.data, activeTabIdRef.current || undefined);
        console.log('✅ [SIDE-PANEL] Analysis result updated');
      } 
      
      // 새로운 아이템 추가 로직
      else if (request.action === 'addNewItems') {
        console.log('🔄 Side Panel: Received', request.data.length, 'new items to add.');
        // 현재 활성 탭 ID 전달
        addAnalysisItems(request.data, activeTabIdRef.current || undefined);
      }
    };
    
    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.tabs.onActivated.removeListener(handleTabActivated);
      chrome.tabs.onUpdated.removeListener(handleTabUpdated);
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [setActiveTabId, setAnalysisResult, addAnalysisItems]);

  const handleItemClick = (ownerId: number) => {
    if (activeTabId) {
      requestHighlight(activeTabId, ownerId);
    }
  };

  const handleVoiceCommand = useCallback((command: string) => {
    const currentTabId = activeTabIdRef.current;
    const currentAnalysisResult = analysisResultRef.current;
    
    console.log('🎤 Voice command received:', command);
    
    if (!currentAnalysisResult || !currentTabId) {
      console.warn('❌ No analysis result or tab ID available for voice command');
      return;
    }
    
    chrome.runtime.sendMessage({
      action: 'executeVoiceCommand',
      command: command,
      tabId: currentTabId
    });
  }, []);

  const { transcribedText, isListening, toggleListening, error } = useSpeechRecognition(handleVoiceCommand);

  const exportData = () => {
    if (!analysisResult) return;
    const dataStr = JSON.stringify(analysisResult, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `crawl-${new Date().getTime()}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return {
    analysisResult,
    filter,
    onFilterChange: (filter: string) => setFilter(filter, activeTabId || undefined),
    searchTerm,
    onSearchTermChange: (term: string) => setSearchTerm(term, activeTabId || undefined),
    filteredItems: getFilteredItems(activeTabId || undefined),
    onItemClick: handleItemClick,
    isListening,
    transcribedText,
    onToggleListening: toggleListening,
    onExportData: exportData,
    recognitionError: error,
  };
};