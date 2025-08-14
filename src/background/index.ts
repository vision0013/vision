chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// 콘텐츠 스크립트나 팝업에서 오는 메시지 처리
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'getCrawlData') {
    chrome.storage.local.get(['lastCrawl'], (result) => {
      sendResponse(result.lastCrawl);
    });
    return true; // 비동기 응답을 위해 true를 반환합니다.
  }

  // 콘텐츠 스크립트로부터 메시지를 받아 팝업으로 전달합니다.
  if (request.action === 'crawlComplete') {
    // 팝업으로 직접 메시지를 보내 UI 업데이트를 요청합니다.
    chrome.runtime.sendMessage({ action: 'updatePopup', data: request.data });
  }
});