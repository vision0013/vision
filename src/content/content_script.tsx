import { PageCrawler } from './crawler';
import { VoiceCommandProcessor } from './voice-commands';

// --- 전역 변수 ---
let highlightedElement: HTMLElement | null = null;
let currentAnalysisResult: any = null;

const crawler = new PageCrawler();
const voiceCommandProcessor = new VoiceCommandProcessor();

/**
 * 페이지를 크롤링하고 결과를 백그라운드로 전송하는 함수
 */
const runCrawler = () => {
  console.log('🔄 Page analysis started for:', window.location.href);
  const analysisResult = crawler.analyze();
  currentAnalysisResult = analysisResult;
  
  chrome.runtime.sendMessage({ action: 'crawlComplete', data: analysisResult });
};

const highlightElementById = (ownerId: number) => {
  const element = document.querySelector(`[data-crawler-id="${ownerId}"]`) as HTMLElement;
  if (element) {
    if (highlightedElement) {
      highlightedElement.style.outline = '';
      highlightedElement.style.boxShadow = '';
    }
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.style.outline = '3px solid #007AFF';
    element.style.boxShadow = '0 0 15px rgba(0, 122, 255, 0.5)';
    highlightedElement = element;
    setTimeout(() => {
      if (highlightedElement === element) {
         element.style.outline = '';
         element.style.boxShadow = '';
         highlightedElement = null;
      }
    }, 2500);
  }
};

// --- 메시지 리스너 (background로부터 오는 메시지 처리) ---
chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
  // background로부터 크롤링 실행 명령을 받았을 때
  if (request.action === 'runCrawler') {
    runCrawler();
  }
  
  // 기존 메시지 핸들러들
  if (request.action === 'highlightElement') {
    highlightElementById(request.ownerId);
  }
  if (request.action === 'processVoiceCommand') {
    if (currentAnalysisResult?.items) {
      voiceCommandProcessor.processCommand(request.command, currentAnalysisResult.items);
    }
  }
});

// --- ✨ background에 주기적으로 URL을 보고하는 로직 ---
setInterval(() => {
  // 0.5초마다 현재 URL을 background에 보내서 변경 여부 확인을 요청
  chrome.runtime.sendMessage({ action: 'checkUrl', url: window.location.href });
}, 500);
