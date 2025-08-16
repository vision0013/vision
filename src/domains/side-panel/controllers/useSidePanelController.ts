import { useEffect, useCallback, useRef } from 'react';
import { useSidePanelStore } from './store';
import { useSpeechRecognition } from '../features/voice-recognition/hook/useSpeechRecognition';

export const useSidePanelController = () => {
  const {
    analysisResult,
    activeTabId,
    setAnalysisResult,
    // ✨ 1. 새로 만든 스토어 액션 가져오기
    addAnalysisItems,
    setActiveTabId,
    getFilteredItems,
    filter,
    searchTerm,
    setFilter,
    setSearchTerm,
  } = useSidePanelStore();

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
    
    const messageListener = (request: any) => {
      // 기존 전체 업데이트 로직
      if (request.action === 'updatePanelData') {
        console.log('🔄 Side Panel: Received full update with', request.data.items.length, 'items');
        setAnalysisResult(request.data);
      } 
      
      // ✨ 2. 새로운 아이템 추가 로직
      else if (request.action === 'addNewItems') {
        console.log('🔄 Side Panel: Received', request.data.length, 'new items to add.');
        addAnalysisItems(request.data);
      }
    };
    
    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
    
    // ✨ 3. 의존성 배열에 addAnalysisItems 추가
  }, [setActiveTabId, setAnalysisResult, addAnalysisItems]);

  const handleItemClick = (ownerId: number) => {
    if (activeTabId) {
      chrome.runtime.sendMessage({ action: 'highlightElement', tabId: activeTabId, ownerId: ownerId });
    }
  };

  const handleVoiceCommand = useCallback((command: string) => {
    const currentTabId = activeTabIdRef.current;
    // ✨ 중요: content_script와 동기화된 최신 analysisResult를 ref에서 직접 참조합니다.
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
  }, []); // 의존성 배열은 비워둡니다.

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
    onFilterChange: setFilter,
    searchTerm,
    onSearchTermChange: setSearchTerm,
    filteredItems: getFilteredItems(),
    onItemClick: handleItemClick,
    isListening,
    transcribedText,
    onToggleListening: toggleListening,
    onExportData: exportData,
    recognitionError: error,
  };
};
