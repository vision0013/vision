// 아이콘 클릭 시 사이드 패널을 열도록 설정
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// 콘텐츠 스크립트로부터 크롤링 완료 메시지를 받아 모든 사이드 패널에 전달
chrome.runtime.onMessage.addListener((request, sender, _sendResponse) => {
  // 콘텐츠 스크립트로부터 온 메시지인지 확인
  if (sender.tab && request.action === 'crawlComplete') {
    // 모든 런타임(사이드 패널 포함)에 데이터 업데이트 메시지 전송
    chrome.runtime.sendMessage({
      action: 'updatePanelData',
      data: request.data
    });
  }
  
  // 사이드 패널로부터 하이라이트 요청을 받아 해당 탭의 콘텐츠 스크립트로 전달
  if (request.action === 'highlightElement' && request.tabId) {
    chrome.tabs.sendMessage(request.tabId, {
      action: 'highlightElement',
      ownerId: request.ownerId
    });
  }
});