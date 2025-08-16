// background.ts
// 각 탭의 마지막으로 확인된 URL을 저장하는 객체
const tabLastUrls: { [key: number]: string } = {};

// 아이콘 클릭 시 사이드 패널을 열도록 설정
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.runtime.onMessage.addListener((request, sender, _sendResponse) => {
  // content_script로부터 URL 변경 감지 알림을 받았을 때
  if (request.action === 'checkUrl' && sender.tab?.id) {
    const tabId = sender.tab.id;
    const currentUrl = request.url;

    // background에 저장된 이전 URL과 다를 경우에만 크롤링 명령 전송
    if (tabLastUrls[tabId] !== currentUrl) {
      console.log(`[background] New URL confirmed for tab ${tabId}: ${currentUrl}`);
      tabLastUrls[tabId] = currentUrl;
      chrome.tabs.sendMessage(tabId, { action: 'runCrawler' });
    } else {
      console.log(`[background] Same URL, skipping crawl for tab ${tabId}`);
    }
    return;
  }

  // 기존 메시지 핸들러들
  if (sender.tab && request.action === 'crawlComplete') {
    chrome.runtime.sendMessage({ action: 'updatePanelData', data: request.data });
  }
  
  if (request.action === 'highlightElement' && request.tabId) {
    chrome.tabs.sendMessage(request.tabId, { action: 'highlightElement', ownerId: request.ownerId });
  }
  
  if (request.action === 'executeVoiceCommand' && request.tabId) {
    chrome.tabs.sendMessage(request.tabId, { action: 'processVoiceCommand', command: request.command });
  }
});

// 탭이 닫힐 때 메모리에서 해당 탭의 URL 정보를 삭제
chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabLastUrls[tabId];
  console.log(`[background] Cleaned up URL for closed tab ${tabId}.`);
});