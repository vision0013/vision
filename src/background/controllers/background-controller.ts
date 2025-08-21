// 리팩터링된 Background - 5폴더 구조 기반 깔끔한 진입점

import { tabStateManager } from './managers/tab-state-manager';
import { offscreenManager } from './managers/offscreen-manager';
import { messageRouter } from '../process/message-router';
import { handleUrlChange, isValidUrl } from '../utils/url-handler';
import { CHROME_CONFIG } from '../config/background-config';

console.log('🚀 [background] Background script started with 5-folder architecture');

// ===== 메시지 리스너 (매우 간결해짐) =====
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Offscreen 준비 완료 알림
  if (request.action === 'offscreenReady') {
    offscreenManager.onReady();
    console.log('✅ [background] Offscreen document ready');
    return true;
  }
  
  // 모든 메시지를 라우터에 위임
  messageRouter.route(request, sender).then(response => {
    if (response !== undefined) {
      sendResponse(response);
    }
  }).catch(error => {
    console.error('❌ [background] Message routing error:', error);
    sendResponse({ error: error.message });
  });
  
  return true; // 비동기 응답 유지
});

// ===== Chrome Extension 이벤트 리스너들 =====

// 탭 활성화 감지
chrome.tabs.onActivated.addListener(activeInfo => {
  chrome.tabs.get(activeInfo.tabId, tab => {
    if (tab.url && isValidUrl(tab.url)) {
      handleUrlChange(activeInfo.tabId, tab.url);
    }
  });
});

// 탭 업데이트 감지 (URL 변경)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.url && isValidUrl(tab.url)) {
    handleUrlChange(tabId, tab.url);
  }
});

// 탭 제거 시 정리
chrome.tabs.onRemoved.addListener(tabId => {
  tabStateManager.cleanup(tabId);
  console.log(`🗑️ [background] Cleaned up state for closed tab ${tabId}`);
});

// 사이드 패널 설정
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: CHROME_CONFIG.SIDE_PANEL.OPEN_ON_ACTION_CLICK })
  .catch(console.error);

console.log('✅ [background] All event listeners registered successfully');