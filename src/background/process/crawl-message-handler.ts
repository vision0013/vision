// 크롤링 관련 메시지 처리 핸들러

/**
 * 크롤링 완료 메시지 처리
 */
export async function handleCrawlComplete(
  request: any,
  sender: chrome.runtime.MessageSender
): Promise<boolean> {
  const { data: analysisResult } = request;
  const tabId = sender.tab?.id;
  
  if (!tabId) {
    console.warn('❌ [crawl-handler] No tab ID for crawl complete');
    return false;
  }
  
  console.log(`📊 [crawl-handler] Crawl completed for tab ${tabId}:`, analysisResult.items?.length, 'items');
  
  try {
    // Panel에 크롤링 결과 전달 (기존 액션명 유지)
    chrome.runtime.sendMessage({
      action: 'updatePanelData',
      tabId,
      data: analysisResult
    });
    
    console.log('✅ [crawl-handler] Crawl result forwarded to panel');
    return true;
    
  } catch (error) {
    // Panel이 닫혀있을 수 있음 (정상)
    console.log('[crawl-handler] Panel not open, crawl result stored');
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
  
  if (!tabId) {
    console.warn('❌ [crawl-handler] No tab ID for add new items');
    return false;
  }
  
  console.log(`➕ [crawl-handler] Adding ${newItems?.length || 0} new items for tab ${tabId}`);
  
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
    console.log('[crawl-handler] Panel not open, new items stored');
    return true;
  }
}