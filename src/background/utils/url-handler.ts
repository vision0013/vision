// URL 변경 감지 및 처리 유틸리티 (순수 함수)

import { tabStateManager } from '../controllers/managers/tab-state-manager';

/**
 * URL 변경 처리 - 중복 감지 및 디바운싱 적용
 */
export function handleUrlChange(tabId: number, newUrl: string): void {
  console.log(`🔍 [url-handler] Processing URL change for tab ${tabId}: ${newUrl}`);
  
  // 1. URL 유효성 사전 검사
  if (!isValidUrl(newUrl)) {
    console.log(`🚫 [url-handler] Invalid URL rejected for tab ${tabId}: ${newUrl}`);
    return;
  }
  
  // 2. URL 중복 체크
  const previousState = tabStateManager.getTabState(tabId);
  console.log(`📋 [url-handler] Previous URL for tab ${tabId}:`, previousState?.lastUrl);
  
  const isNewUrl = tabStateManager.updateUrl(tabId, newUrl);
  if (!isNewUrl) {
    console.log(`🔄 [url-handler] Duplicate URL ignored for tab ${tabId}: ${newUrl}`);
    return;
  }
  
  console.log(`✅ [url-handler] New URL confirmed for tab ${tabId}: ${newUrl}`);
  
  // 3. 디바운스된 크롤러 실행
  console.log(`⏱️  [url-handler] Setting 300ms debounce timer for tab ${tabId}`);
  tabStateManager.setDebounce(tabId, () => {
    console.log(`🚀 [url-handler] Debounce timer fired for tab ${tabId} - triggering crawler`);
    triggerCrawler(tabId, newUrl);
  }, 300);
}

/**
 * Content Script에 크롤러 실행 명령 전송
 */
async function triggerCrawler(tabId: number, url: string): Promise<void> {
  try {
    console.log(`🕷️ [url-handler] Triggering crawler for tab ${tabId} at URL: ${url}`);
    
    // 탭 상태 확인
    const tabInfo = await getTabInfo(tabId);
    if (!tabInfo) {
      console.log(`❌ [url-handler] Tab ${tabId} not found, cannot trigger crawler`);
      return;
    }
    
    console.log(`📋 [url-handler] Tab ${tabId} status: ${tabInfo.status}, URL: ${tabInfo.url}`);
    
    const message = { 
      action: 'runCrawler',
      url 
    };
    
    console.log(`📤 [url-handler] Sending message to tab ${tabId}:`, message);
    
    await chrome.tabs.sendMessage(tabId, message);
    
    console.log(`✅ [url-handler] Crawler message sent successfully to tab ${tabId}`);
    
  } catch (error: any) {
    console.error(`❌ [url-handler] Failed to trigger crawler for tab ${tabId}:`, {
      error: error.message,
      url: url,
      timestamp: new Date().toISOString()
    });
    
    // Content Script 로딩 상태 재확인 제안
    if (error.message.includes('Receiving end does not exist')) {
      console.log(`🔄 [url-handler] Content Script may not be ready for tab ${tabId}. Will retry on next URL change.`);
    }
  }
}

/**
 * URL이 크롤링 가능한지 검증
 */
export function isValidUrl(url: string): boolean {
  if (!url) return false;
  
  // HTTP/HTTPS만 허용
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return false;
  }
  
  // Chrome 내부 페이지 제외
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
    return false;
  }
  
  // 로컬 파일 제외
  if (url.startsWith('file://')) {
    return false;
  }
  
  return true;
}

/**
 * 탭 정보 안전하게 조회
 */
export async function getTabInfo(tabId: number): Promise<chrome.tabs.Tab | null> {
  try {
    const tab = await chrome.tabs.get(tabId);
    return tab;
  } catch (error) {
    console.log(`[url-handler] Tab ${tabId} not found or inaccessible`);
    return null;
  }
}