import { PageCrawler } from './crawler';
import { VoiceCommandProcessor } from './voice-commands';

// --- 전역 변수 ---
let highlightedElement: HTMLElement | null = null;
let debounceTimeout: number;
let currentAnalysisResult: any = null;

// Voice Command Processor 인스턴스
const voiceCommandProcessor = new VoiceCommandProcessor();

/**
 * 페이지를 크롤링하고 결과를 백그라운드로 전송하는 함수
 */
const runCrawler = () => {
  console.log('Page analysis started...');
  const crawler = new PageCrawler();
  const analysisResult = crawler.analyze();

  // 전역 변수에 분석 결과 저장 (음성 명령에서 사용)
  currentAnalysisResult = analysisResult;

  // 결과를 백그라운드 스크립트로 전송
  chrome.runtime.sendMessage({
    action: 'crawlComplete',
    data: analysisResult
  });
};

/**
 * 특정 ownerId를 가진 요소를 찾아 하이라이트하는 함수
 * @param ownerId - 하이라이트할 요소의 data-crawler-id
 */
const highlightElementById = (ownerId: number) => {
  const element = document.querySelector(`[data-crawler-id="${ownerId}"]`) as HTMLElement;
  if (element) {
    // 기존 하이라이트 제거
    if (highlightedElement) {
      highlightedElement.style.outline = '';
      highlightedElement.style.boxShadow = '';
    }

    // 새 요소로 스크롤 및 하이라이트
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.style.outline = '3px solid #007AFF';
    element.style.boxShadow = '0 0 15px rgba(0, 122, 255, 0.5)';
    highlightedElement = element;

    // 2.5초 후 하이라이트 자동 제거
    setTimeout(() => {
      if (highlightedElement === element) {
         element.style.outline = '';
         element.style.boxShadow = '';
         highlightedElement = null;
      }
    }, 2500);
  }
};

// --- 이벤트 리스너 및 옵저버 설정 ---

// 사이드 패널로부터 오는 메시지 수신
chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
  if (request.action === 'highlightElement') {
    highlightElementById(request.ownerId);
  }
  
  // 음성 명령 처리
  if (request.action === 'processVoiceCommand') {
    if (currentAnalysisResult && currentAnalysisResult.items) {
      console.log('Processing voice command:', request.command);
      const result = voiceCommandProcessor.processCommand(request.command, currentAnalysisResult.items);
      console.log('Voice command result:', result);
    } else {
      console.warn('No analysis result available for voice command');
    }
  }
});

// DOM 변경을 감지하여 다시 크롤링 수행 (디바운싱 적용)
const mutationCallback = () => {
  clearTimeout(debounceTimeout);
  debounceTimeout = window.setTimeout(() => {
    console.log('DOM has changed. Re-analyzing page...');
    observer.disconnect();
    runCrawler();
    observer.observe(document.body, observerConfig);
  }, 1500);
};

const observer = new MutationObserver(mutationCallback);
const observerConfig = {
  childList: true,
  subtree: true,
  attributes: true,
  characterData: true
};

// --- 초기 실행 ---
observer.observe(document.body, observerConfig);
runCrawler(); // 페이지 로드 시 첫 크롤링 실행