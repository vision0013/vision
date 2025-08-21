// 하이라이트 관련 메시지 처리 핸들러 (순수 함수)

import { HighlightRequest } from '../types/background-types';
import { tabStateManager } from '../controllers/managers/tab-state-manager';

/**
 * 하이라이트 요소 변경 메시지 처리
 */
export async function handleHighlightMessage(
  request: HighlightRequest,
  sender: chrome.runtime.MessageSender
): Promise<boolean> {
  const { action, ownerId, tabId } = request;
  
  console.log(`🎯 [highlight-handler] Processing ${action}, ownerId: ${ownerId}`);
  
  try {
    // 탭 ID 결정 (request에 있으면 우선, 없으면 sender 탭)
    const targetTabId = tabId || sender.tab?.id;
    if (!targetTabId) {
      console.warn('❌ [highlight-handler] No tab ID available');
      return false;
    }
    
    // 1. 상태 업데이트
    tabStateManager.setActiveElement(targetTabId, ownerId);
    
    // 2. Content Script에 알림
    await notifyContentScript(targetTabId, ownerId);
    
    // 3. Panel에 알림 (선택사항)
    await notifyPanel(targetTabId, ownerId);
    
    console.log(`✅ [highlight-handler] Active element set for tab ${targetTabId}: ${ownerId}`);
    return true;
    
  } catch (error: any) {
    console.error('❌ [highlight-handler] Error:', error.message);
    return false;
  }
}

/**
 * Content Script에 활성 요소 변경 알림
 */
async function notifyContentScript(tabId: number, ownerId: number | null): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { 
      action: 'activeElementChanged', 
      ownerId 
    });
  } catch (e) {
    // Content Script가 준비되지 않았을 수 있음 (정상)
    console.log(`[highlight-handler] Content script not ready for tab ${tabId}`);
  }
}

/**
 * Panel에 활성 요소 변경 알림
 */
async function notifyPanel(tabId: number, ownerId: number | null): Promise<void> {
  try {
    chrome.runtime.sendMessage({ 
      action: 'activeElementChanged', 
      tabId, 
      ownerId 
    });
  } catch (e) {
    // Panel이 닫혀있을 수 있음 (정상)
    console.log(`[highlight-handler] Panel not open for notification`);
  }
}