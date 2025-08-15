import { useEffect, useCallback, useRef } from 'react';
import { useSidePanelStore } from './store';
import { useSpeechRecognition } from '../features/voice-recognition/hook/useSpeechRecognition';

export const useSidePanelController = () => {
  const {
    analysisResult,
    activeTabId,
    setAnalysisResult,
    setActiveTabId,
    getFilteredItems,
    filter,
    searchTerm,
    setFilter,
    setSearchTerm,
  } = useSidePanelStore();

  // ref로 최신 값들을 추적
  const analysisResultRef = useRef(analysisResult);
  const activeTabIdRef = useRef(activeTabId);

  // 값이 변경될 때마다 ref 업데이트
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
      if (request.action === 'updatePanelData') setAnalysisResult(request.data);
    };
    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, [setActiveTabId, setAnalysisResult]);

  const handleItemClick = (ownerId: number) => {
    if (activeTabId) {
      chrome.runtime.sendMessage({ action: 'highlightElement', tabId: activeTabId, ownerId: ownerId });
    }
  };

  // ✨ Content Script로 메시지 전송
  const handleVoiceCommand = useCallback((command: string) => {
    // ref를 통해 최신 값 참조
    const currentTabId = activeTabIdRef.current;
    const currentAnalysisResult = analysisResultRef.current;
    
    console.log('🎤 Voice command received:', command);
    console.log('🎤 Current tab ID:', currentTabId);
    console.log('🎤 Analysis result available:', !!currentAnalysisResult);
    
    if (!currentAnalysisResult || !currentTabId) {
      console.warn('❌ No analysis result or tab ID available for voice command');
      console.warn('  - analysisResult:', !!currentAnalysisResult);
      console.warn('  - activeTabId:', currentTabId);
      return;
    }

    console.log('🎤 Sending voice command:', command, 'to tab:', currentTabId);
    
    // Content Script로 음성 명령 전송
    chrome.runtime.sendMessage({
      action: 'executeVoiceCommand',
      command: command,
      tabId: currentTabId
    });
  }, []); // 의존성 제거로 재생성 방지

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