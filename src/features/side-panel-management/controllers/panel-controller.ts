import { useEffect, useCallback, useRef, useState } from 'react';
import { useSidePanelStore } from '../process/panel-store';
import { useSpeechRecognition, requestHighlight } from '../../index';
import { Mode } from '@/types';

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
    // ✨ [복구 및 추가]
    isLoading,
    setIsLoading,
    setMode,
  } = useSidePanelStore();

  const [activeElementId, setActiveElementId] = useState<number | null>(null);
  const [markdownContent, setMarkdownContent] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

  const currentTabData = activeTabId ? tabDataMap[activeTabId] : null;
  const { analysisResult, filter, searchTerm, mode } = currentTabData || {
    analysisResult: null, filter: 'all', searchTerm: '', mode: 'navigate'
  };

  const activeTabIdRef = useRef(activeTabId);
  useEffect(() => { activeTabIdRef.current = activeTabId; }, [activeTabId]);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) setActiveTabId(tabs[0].id);
    });

    const handleTabActivated = (activeInfo: chrome.tabs.TabActiveInfo) => setActiveTabId(activeInfo.tabId);
    const handleTabUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
      if (changeInfo.status === 'complete' && tab.active) setActiveTabId(tabId);
    };

    chrome.tabs.onActivated.addListener(handleTabActivated);
    chrome.tabs.onUpdated.addListener(handleTabUpdated);

    const messageListener = (request: any) => {
      if (request.action === 'updatePanelData' && request.tabId === activeTabIdRef.current) {
        setAnalysisResult(request.data, request.tabId);
      } else if (request.action === 'addNewItems' && request.tabId === activeTabIdRef.current) {
        addAnalysisItems(request.data, request.tabId);
      } else if (request.action === 'activeElementChanged' && request.tabId === activeTabIdRef.current) {
        setActiveElementId(request.ownerId);
      } else if (request.action === 'MARKDOWN_RESULT') {
        setMarkdownContent(request.markdown);
        setPageTitle(request.title);
        setIsExtracting(false);
      } else if (request.action === 'aiModelStatusChanged') {
        setAiModelStatus(request.status);
      } else if (request.action === 'modeChanged' && request.tabId === activeTabIdRef.current) {
        setMode(request.mode, request.tabId);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => {
      chrome.tabs.onActivated.removeListener(handleTabActivated);
      chrome.tabs.onUpdated.removeListener(handleTabUpdated);
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [setActiveTabId, setAnalysisResult, addAnalysisItems, setAiModelStatus, setMode, setMarkdownContent, setPageTitle, setIsExtracting]);

  const handleItemClick = (ownerId: number) => {
    if (activeTabId) requestHighlight(activeTabId, ownerId);
  };

  const handleVoiceCommand = useCallback(async (command: string) => {
    const currentTabId = activeTabIdRef.current;
    if (!currentTabId) return;

    setIsLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'executeVoiceCommand',
        command: command,
        tabId: currentTabId
      });
      console.log('✅ [panel] Received response from background:', response);
    } catch (error) {
      console.error('❌ [panel] Error sending voice command:', error);
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading]);

  const handleExtract = useCallback(() => {
    setIsExtracting(true);
    setMarkdownContent('추출 중...');
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
    onFilterChange: (newFilter: string) => setFilter(newFilter, activeTabId || undefined),
    searchTerm,
    onSearchTermChange: (term: string) => setSearchTerm(term, activeTabId || undefined),
    filteredItems: getFilteredItems(activeTabId || undefined),
    onItemClick: handleItemClick,
    isListening,
    transcribedText,
    onToggleListening: toggleListening,
    onExportData: exportData,
    recognitionError: error,
    activeElementId,
    markdownContent,
    pageTitle,
    isExtracting,
    onExtract: handleExtract,
    onDownload: handleDownload,
    // ✨ [복구 및 추가]
    isLoading,
    mode: mode || 'navigate',
    onModeChange: (newMode: Mode) => setMode(newMode, activeTabId || undefined),
  };
};