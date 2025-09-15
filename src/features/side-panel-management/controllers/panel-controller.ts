import { useEffect, useCallback, useRef, useState } from 'react';
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
    setAiModelStatus,
  } = useSidePanelStore();

  // ✨ [신규] 현재 활성화된 요소 상태 관리
  const [activeElementId, setActiveElementId] = useState<number | null>(null);

  // 마크다운 관련 상태
  const [markdownContent, setMarkdownContent] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

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
      // 🔒 탭 ID 검증: 현재 활성 탭의 데이터만 처리
      const requestTabId = request.tabId;
      const currentActiveTabId = activeTabIdRef.current;
      
      // 기존 전체 업데이트 로직
      if (request.action === 'updatePanelData') {
        console.log('📨 [SIDE-PANEL] Received updatePanelData with', request.data.items.length, 'items for tab:', requestTabId);
        console.log('📨 [SIDE-PANEL] Current active tab ID:', currentActiveTabId);
        
        // 탭 ID 검증: 현재 활성 탭의 데이터만 처리
        if (requestTabId && requestTabId === currentActiveTabId) {
          setAnalysisResult(request.data, currentActiveTabId || undefined);
          console.log('✅ [SIDE-PANEL] Analysis result updated for active tab');
        } else {
          console.log('🚫 [SIDE-PANEL] Ignored updatePanelData - not from active tab:', requestTabId, 'vs', currentActiveTabId);
        }
      } 
      
      // 새로운 아이템 추가 로직
      else if (request.action === 'addNewItems') {
        console.log('🔄 Side Panel: Received', request.data.length, 'new items for tab:', requestTabId);
        
        // 탭 ID 검증: 현재 활성 탭의 데이터만 처리
        if (requestTabId && requestTabId === currentActiveTabId) {
          addAnalysisItems(request.data, currentActiveTabId || undefined);
          console.log('✅ [SIDE-PANEL] New items added for active tab');
        } else {
          console.log('🚫 [SIDE-PANEL] Ignored addNewItems - not from active tab:', requestTabId, 'vs', currentActiveTabId);
        }
      }
      
      // ✨ [신규] 중앙 상태 관리에서 활성 요소 변경 알림 수신
      else if (request.action === 'activeElementChanged') {
        console.log('🎯 [panel] Active element changed:', request.ownerId, 'for tab:', request.tabId);
        // 현재 활성 탭의 상태 변경만 처리
        if (request.tabId === activeTabIdRef.current) {
          setActiveElementId(request.ownerId);
        }
      }
      // Markdown 결과 수신
      else if (request.action === 'MARKDOWN_RESULT') {
        console.log('📝 [panel-controller] Received markdown result');
        setMarkdownContent(request.markdown);
        setPageTitle(request.title);
        setIsExtracting(false);
      }
      // ✨ 2. AI 모델 상태 변경 메시지를 처리하는 로직을 추가합니다.
      else if (request.action === 'aiModelStatusChanged') {
        console.log('🔔 [panel-controller] Received AI model status update:', request.status);
        setAiModelStatus(request.status);
      }

    };
    
    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.tabs.onActivated.removeListener(handleTabActivated);
      chrome.tabs.onUpdated.removeListener(handleTabUpdated);
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [setActiveTabId, setAnalysisResult, addAnalysisItems, setAiModelStatus, setMarkdownContent, setPageTitle, setIsExtracting]); // Added markdown related setters to dependencies

  const handleItemClick = (ownerId: number) => {
    if (activeTabId) {
      requestHighlight(activeTabId, ownerId);
    }
  };

  const handleVoiceCommand = useCallback(async (command: string) => {
    const currentTabId = activeTabIdRef.current;
    
    console.log('🎤 [panel] Voice command received, sending to background:', command);
    
    if (!currentTabId) {
      console.warn('❌ No tab ID available for voice command');
      return;
    }
    
    // AI가 모든 분석을 처리하므로, 전처리나 oktjs 분석 없이 바로 백그라운드로 전송
    chrome.runtime.sendMessage({
      action: 'executeVoiceCommand',
      command: command,
      tabId: currentTabId
    });
  }, []);

  const handleExtract = useCallback(() => {
    setIsExtracting(true);
    setMarkdownContent('본문 추출 중...'); // Provide immediate feedback
    chrome.runtime.sendMessage({ action: 'GET_PAGE_CONTENT' });
  }, []);

  const handleDownload = useCallback(() => {
    chrome.runtime.sendMessage({ 
      action: 'DOWNLOAD_MARKDOWN', 
      markdown: markdownContent, 
      title: pageTitle 
    });
  }, [markdownContent, pageTitle]);

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
    // ✨ [신규] 현재 활성화된 요소 ID
    activeElementId,
    // Markdown related
    markdownContent,
    pageTitle,
    isExtracting,
    onExtract: handleExtract,
    onDownload: handleDownload,
  };
};