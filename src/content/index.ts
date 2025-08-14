import { PageCrawler } from './crawler';
import { MessagePayload } from '../types';

// 팝업으로부터 메시지 수신
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  // 팝업이 보낸 ping 요청에 응답
  if (request.action === 'ping') {
    sendResponse({ status: 'ready' });
    return true; // 비동기 응답을 위해 채널을 열어 둡니다.
  }

  if (request.action === 'crawl') {
    const crawler = new PageCrawler();
    const result = crawler.analyze();

    // 팝업으로 결과 전송
    sendResponse({ success: true, data: result });

    // 다른 리스너를 위해 메시지 게시
    window.postMessage({
      type: "PAGE_ANALYSIS_RESULT",
      payload: result
    } as MessagePayload, "*");
  }
  return true; // 비동기 응답을 위해 채널을 열어 둡니다.
});

// 페이지 로드가 완료되면 자동으로 크롤링 실행
if (document.readyState === 'complete') {
  const crawler = new PageCrawler();
  const result = crawler.analyze();
  
  // 결과를 스토리지에 저장합니다.
  chrome.storage.local.set({ lastCrawl: result });
  
  // 크롤링이 완료되었음을 백그라운드에 알립니다.
  chrome.runtime.sendMessage({ action: 'crawlComplete', data: result });
}