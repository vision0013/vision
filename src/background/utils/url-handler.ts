// URL 변경 감지 및 처리 유틸리티 (순수 함수)

import { tabStateManager } from '../controllers/managers/tab-state-manager';

/**
 * URL 변경 처리 - 중복 감지 및 디바운싱 적용
 */
export function handleUrlChange(tabId: number, newUrl: string): void {
  // 1. URL 중복 체크
  const isNewUrl = tabStateManager.updateUrl(tabId, newUrl);
  if (!isNewUrl) {
    console.log(`[url-handler] Duplicate URL ignored for tab ${tabId}`);
    return;
  }
  
  console.log(`🔄 [url-handler] URL changed for tab ${tabId}: ${newUrl}`);
  
  // 2. 디바운스된 크롤러 실행
  tabStateManager.setDebounce(tabId, () => {
    triggerCrawler(tabId, newUrl);
  }, 300);
}

/**
 * Content Script에 크롤러 실행 명령 전송
 */
async function triggerCrawler(tabId: number, url: string): Promise<void> {
  try {
    console.log(`🕷️ [url-handler] Triggering crawler for tab ${tabId}`);
    
    await chrome.tabs.sendMessage(tabId, { 
      action: 'runCrawler',
      url 
    });
    
    console.log(`✅ [url-handler] Crawler triggered successfully for tab ${tabId}`);
    
  } catch (error: any) {
    // Content Script가 준비되지 않았거나 탭이 닫혔을 수 있음
    console.log(`⚠️ [url-handler] Cannot trigger crawler for tab ${tabId}: ${error.message}`);
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