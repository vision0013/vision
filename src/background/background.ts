// background.ts
// 각 탭의 마지막으로 확인된 URL을 저장하는 객체
const tabLastUrls: { [key: number]: string } = {};

// 아이콘 클릭 시 사이드 패널을 열도록 설정
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// ✨ 1. (수정) 탭이 활성화될 때마다 크롤링을 강제 실행 - 에러 처리 추가
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  console.log(`[background] Tab ${activeInfo.tabId} activated. Forcing crawl.`);
  
  try {
    // ✨ 탭 정보 먼저 확인
    const tab = await chrome.tabs.get(activeInfo.tabId);
    
    // ✨ Content Script가 실행 가능한 페이지인지 확인
    if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
      await chrome.tabs.sendMessage(activeInfo.tabId, { action: 'runCrawler' });
    } else {
      console.log(`[background] Skipping tab ${activeInfo.tabId} - not a web page:`, tab.url);
    }
  } catch (error) {
    console.log(`[background] Cannot send message to tab ${activeInfo.tabId}:`, (error as Error).message);
  }
});

chrome.runtime.onMessage.addListener(async (request, sender, _sendResponse) => {
  // content_script로부터 URL 변경 감지 알림을 받았을 때
  if (request.action === 'checkUrl' && sender.tab?.id) {
    const tabId = sender.tab.id;
    const currentUrl = request.url;

    // background에 저장된 이전 URL과 다를 경우에만 크롤링 명령 전송
    if (tabLastUrls[tabId] !== currentUrl) {
      console.log(`[background] New URL confirmed for tab ${tabId}: ${currentUrl}`);
      tabLastUrls[tabId] = currentUrl;
      
      try {
        await chrome.tabs.sendMessage(tabId, { action: 'runCrawler' });
      } catch (error) {
        console.log(`[background] Cannot send runCrawler to tab ${tabId}:`, (error as Error).message);
      }
    }
    return;
  }

  // 기존 메시지 핸들러들
  if (sender.tab && request.action === 'crawlComplete') {
    // ✨ 3. (수정) 메시지에 tabId를 명시적으로 포함시켜 어떤 탭의 결과인지 알려줌
    chrome.runtime.sendMessage({
      action: 'updatePanelData',
      data: request.data,
      tabId: sender.tab.id
    });
  }
  
  if (request.action === 'highlightElement' && request.tabId) {
    try {
      await chrome.tabs.sendMessage(request.tabId, { 
        action: 'highlightElement', 
        ownerId: request.ownerId 
      });
    } catch (error) {
      console.log(`[background] Cannot highlight element in tab ${request.tabId}:`, (error as Error).message);
    }
  }
  
  if (request.action === 'executeVoiceCommand' && request.tabId) {
    try {
      await chrome.tabs.sendMessage(request.tabId, { 
        action: 'processVoiceCommand', 
        command: request.command 
      });
    } catch (error) {
      console.log(`[background] Cannot execute voice command in tab ${request.tabId}:`, (error as Error).message);
    }
  }
});

// 탭이 닫힐 때 메모리에서 해당 탭의 URL 정보를 삭제
chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabLastUrls[tabId];
  console.log(`[background] Cleaned up URL for closed tab ${tabId}.`);
});