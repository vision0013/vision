// 크롤링 관련 메시지 처리 핸들러
import { tabStateManager } from '../controllers/managers/tab-state-manager';

/**
 * 크롤링 완료 메시지 처리
 */
export async function handleCrawlComplete(
  request: any,
  sender: chrome.runtime.MessageSender
): Promise<boolean> {
  // ✨ [수정] data 객체에서 analysisResult와 viewport를 구조 분해
  const { analysisResult, viewport } = request.data;
  const tabId = sender.tab?.id;
  
  if (!tabId) {
    console.warn('❌ [crawl-handler] No tab ID for crawl complete');
    return false;
  }
  
  console.log(`📊 [crawl-handler] Crawl completed for tab ${tabId}:`, analysisResult.items?.length, 'items');
  
  // ✨ [수정] TabStateManager에 크롤링 데이터와 viewport 정보 저장
  if (analysisResult.items) {
    tabStateManager.setCrawledData(tabId, analysisResult.items);
  }
  if (viewport) {
    tabStateManager.setViewport(tabId, viewport);
  }

  try {
    // Panel에는 기존과 동일하게 analysisResult만 전달
    chrome.runtime.sendMessage({
      action: 'updatePanelData',
      tabId,
      data: analysisResult
    });
    
    console.log('✅ [crawl-handler] Crawl result forwarded to panel');
    return true;
    
  } catch (error) {
    // Panel이 닫혀있을 수 있음 (정상)
    console.log('[crawl-handler] Panel not open, crawl result stored in TabStateManager');
    return true;
  }
}

/**
 * 새로운 아이템 추가 메시지 처리
 */
export async function handleAddNewItems(
  request: any,
  sender: chrome.runtime.MessageSender
): Promise<boolean> {
  const { data: newItems } = request;
  const tabId = sender.tab?.id;
  
  if (!tabId || !newItems || newItems.length === 0) {
    console.warn('❌ [crawl-handler] No tab ID or new items to add');
    return false;
  }
  
  console.log(`➕ [crawl-handler] Adding ${newItems.length} new items for tab ${tabId}`);
  
  // ✨ [신규] TabStateManager에 새로운 아이템 추가
  tabStateManager.appendCrawledData(tabId, newItems);

  try {
    // Panel에 새 아이템 전달
    chrome.runtime.sendMessage({
      action: 'addNewItems', 
      tabId,
      data: newItems
    });
    
    console.log('✅ [crawl-handler] New items forwarded to panel');
    return true;
    
  } catch (error) {
    // Panel이 닫혀있을 수 있음 (정상)
    console.log('[crawl-handler] Panel not open, new items stored in TabStateManager');
    return true;
  }
}
