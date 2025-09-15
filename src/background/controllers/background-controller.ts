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
  
  // 응답 메시지들은 라우팅하지 않음 (Background 내부 AI 핸들러가 처리)
  const responseActions = ['modelStatusResponse', 'modelLoaded', 'modelDeleted', 'aiInitialized', 'analysisResult'];
  if (responseActions.includes(request.action)) {
    console.log(`📬 [background] Response message received: ${request.action} (handled by AI handler)`);
    return false; // Background 내부 리스너들이 처리하도록 함
  }
  
  // 요청 메시지들만 라우터에 위임
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
  console.log(`🔀 [background] Tab activated: ${activeInfo.tabId}`);
  
  chrome.tabs.get(activeInfo.tabId, tab => {
    console.log(`📋 [background] Tab ${activeInfo.tabId} info:`, {
      url: tab.url,
      status: tab.status,
      title: tab.title
    });
    
    if (tab.url) {
      const validationResult = isValidUrl(tab.url);
      console.log(`🔍 [background] URL validation for "${tab.url}": ${validationResult}`);
      
      if (validationResult) {
        console.log(`✅ [background] Valid URL detected, handling change`);
        handleUrlChange(activeInfo.tabId, tab.url);
      } else {
        console.log(`❌ [background] Invalid URL, skipping:`, tab.url);
      }
    } else {
      console.log(`❌ [background] No URL available for tab ${activeInfo.tabId}`);
    }
  });
});

// 탭 업데이트 감지 (URL 변경)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log(`🔄 [background] Tab ${tabId} updated:`, {
    url: changeInfo.url,
    status: changeInfo.status,
    title: tab.title,
    currentUrl: tab.url
  });
  
  if (changeInfo.url && tab.url) {
    const validationResult = isValidUrl(tab.url);
    console.log(`🔍 [background] URL validation for updated tab "${tab.url}": ${validationResult}`);
    
    if (validationResult) {
      console.log(`🔗 [background] URL changed for tab ${tabId}: ${changeInfo.url} → ${tab.url}`);
      handleUrlChange(tabId, tab.url);
    } else {
      console.log(`🚫 [background] Invalid URL update ignored for tab ${tabId}: ${changeInfo.url}`);
    }
  } else if (changeInfo.url) {
    console.log(`⚠️ [background] URL change detected but validation failed - changeInfo.url: ${changeInfo.url}, tab.url: ${tab.url}`);
  } else {
    console.log(`📝 [background] Non-URL update for tab ${tabId}: status=${changeInfo.status}`);
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