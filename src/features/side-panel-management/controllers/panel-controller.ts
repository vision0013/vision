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
  } = useSidePanelStore();

  // ✨ [신규] 현재 활성화된 요소 상태 관리
  const [activeElementId, setActiveElementId] = useState<number | null>(null);

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
      
      // ✨ [신규] 중앙 상태 관리에서 활성 요소 변경 알림 수신
      else if (request.action === 'activeElementChanged') {
        console.log('🎯 [panel] Active element changed:', request.ownerId, 'for tab:', request.tabId);
        // 현재 활성 탭의 상태 변경만 처리
        if (request.tabId === activeTabIdRef.current) {
          setActiveElementId(request.ownerId);
        }
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

  const handleVoiceCommand = useCallback(async (command: string) => {
    const currentTabId = activeTabIdRef.current;
    const currentAnalysisResult = analysisResultRef.current;
    
    console.log('🎤 [panel] Voice command received:', command);
    
    if (!currentAnalysisResult || !currentTabId) {
      console.warn('❌ No analysis result or tab ID available for voice command');
      return;
    }
    
    // 전처리: 한글자 + 공백 + 한글자 병합
    let preprocessed = command.toLowerCase().trim();
    const original = preprocessed;
    
    // 특정 한국어 어미 패턴 병합
    preprocessed = preprocessed
      .replace(/써\s+줘/g, '써줘')
      .replace(/클릭\s+해\s+줘/g, '클릭해줘')
      .replace(/찾\s+아\s+줘/g, '찾아줘')
      .replace(/눌\s+러\s+줘/g, '눌러줘')
      .replace(/스크롤\s+해\s+줘/g, '스크롤해줘')
      // 마지막 한글자를 앞 단어와 병합 (어미 처리)
      .replace(/([가-힣]+)\s+([가-힣])$/g, '$1$2');
    
    if (original !== preprocessed) {
      console.log('🔧 [panel] Preprocessed:', `"${original}" → "${preprocessed}"`);
    }
    
    // 패널에서 oktjs 분석
    let oktjsResult = null;
    try {
      console.log('🔄 [panel] Loading oktjs...');
      const oktjs = await import('oktjs');
      console.log('✅ [panel] oktjs loaded successfully');
      
      oktjs.init();
      console.log('✅ [panel] oktjs initialized');
      
      const normalized = oktjs.normalize(preprocessed);
      const tokens = oktjs.tokenize(normalized);
      
      console.log('🔍 [panel] oktjs tokens:', tokens.map(t => `${t.text}(${t.pos})`).join(' '));
      
      const nouns = tokens.filter(t => t.pos === 'Noun').map(t => t.text);
      const verbs = tokens.filter(t => t.pos === 'Verb').map(t => t.text);
      const adjectives = tokens.filter(t => t.pos === 'Adjective').map(t => t.text);
      
      oktjsResult = { tokens, nouns, verbs, adjectives };
      
      if (nouns.length > 0) console.log('📗 [panel] Nouns:', nouns);
      if (verbs.length > 0) console.log('🎯 [panel] Verbs:', verbs);
      if (adjectives.length > 0) console.log('🔸 [panel] Adjectives:', adjectives);
      
    } catch (error: any) {
      console.log('❌ [panel] oktjs error:', error.message);
    }
    
    chrome.runtime.sendMessage({
      action: 'executeVoiceCommand',
      command: command,
      preprocessedCommand: preprocessed, // 전처리된 명령어 추가
      oktjsResult: oktjsResult,
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
    // ✨ [신규] 현재 활성화된 요소 ID
    activeElementId,
  };
};