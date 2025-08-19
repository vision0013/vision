// background.ts
// 각 탭의 마지막으로 확인된 URL을 저장하는 객체
const tabLastUrls: { [key: number]: string } = {};

// URL 변경 디바운싱 관리
const tabDebounceTimeouts: { [key: number]: NodeJS.Timeout } = {};

// ✨ [신규] 중앙 상태 관리: 탭별 활성화된 요소 상태
interface ActiveElementState {
  ownerId: number | null;
  timestamp: number;
}

const tabActiveElements: { [tabId: number]: ActiveElementState } = {};

// ✨ [신규] 활성화된 요소 상태 관리 함수들
// ✨ [신규] URL 변경 처리 함수 (디바운싱 포함)
function handleUrlChange(tabId: number, newUrl: string, source: string): void {
  const lastUrl = tabLastUrls[tabId];
  
  console.log(`[background] 📌 ${source} detected for tab ${tabId}: ${lastUrl} → ${newUrl}`);
  
  if (!lastUrl || lastUrl !== newUrl) {
    console.log(`[background] ✅ URL changed for tab ${tabId}: ${lastUrl} → ${newUrl}`);
    
    // 즉시 상태 업데이트
    tabLastUrls[tabId] = newUrl;
    
    // 이전 디바운싱 타이머 취소
    if (tabDebounceTimeouts[tabId]) {
      clearTimeout(tabDebounceTimeouts[tabId]);
      console.log(`[background] 🔄 Debounce reset for tab ${tabId}`);
    }
    
    // 300ms 디바운싱 - 마지막 URL 변경만 크롤링
    tabDebounceTimeouts[tabId] = setTimeout(async () => {
      console.log(`[background] 🎯 Final processing for tab ${tabId}: ${newUrl}`);
      
      try {
        await chrome.tabs.sendMessage(tabId, { action: 'runCrawler' });
        console.log(`[background] Crawling triggered for tab ${tabId}`);
      } catch (error) {
        console.log(`[background] Cannot send runCrawler to tab ${tabId}:`, (error as Error).message);
      }
      
      delete tabDebounceTimeouts[tabId];
    }, 300);
  }
}

function setActiveElement(tabId: number, ownerId: number | null): void {
  tabActiveElements[tabId] = {
    ownerId,
    timestamp: Date.now()
  };
  
  console.log(`🎯 [background] Active element set for tab ${tabId}:`, ownerId);
  
  // Content Script와 Panel에 상태 변경 알림
  notifyActiveElementChange(tabId, ownerId);
}

function getActiveElement(tabId: number): number | null {
  return tabActiveElements[tabId]?.ownerId || null;
}

function clearActiveElement(tabId: number): void {
  setActiveElement(tabId, null);
}

async function notifyActiveElementChange(tabId: number, ownerId: number | null): Promise<void> {
  // Content Script에 알림
  try {
    await chrome.tabs.sendMessage(tabId, {
      action: 'activeElementChanged',
      ownerId
    });
  } catch (error) {
    console.log(`[background] Cannot notify content script in tab ${tabId}:`, (error as Error).message);
  }
  
  // Panel에 알림 (모든 패널 인스턴스에 브로드캐스트)
  try {
    chrome.runtime.sendMessage({
      action: 'activeElementChanged',
      tabId,
      ownerId
    });
  } catch (error) {
    console.log(`[background] Cannot notify panel:`, (error as Error).message);
  }
}

// ✨ [수정] oktjs 토큰에서 타겟 텍스트와 방향을 함께 추출하는 함수
function extractTargetAndDirection(tokens: any[]): { targetText: string, direction: 'up' | 'down' | null } {
  const directionWords = {
    up: ['위', '위쪽', '상단'],
    down: ['아래', '아래쪽', '하단']
  };
  let direction: 'up' | 'down' | null = null;
  
  const actionWords = ['써줘', '써', '입력해줘', '입력', '타이핑', 
                      '클릭해줘', '클릭', '눌러줘', '눌러',
                      '찾아줘', '찾아', '검색해줘', '검색',
                      '스크롤해줘', '스크롤', '내려줘', '올려줘'];
  
  const stopWords = ['해줘', '주세요', '좀', '을', '를', '에서', '로', '의', '와', '과', '하고', '그리고'];

  const meaningfulTokens = tokens.filter((token: any) => {
    const text = token.text.toLowerCase();
    
    // 방향성 키워드 확인 및 추출
    if (directionWords.up.includes(text)) {
      direction = 'up';
      return false; // 타겟 텍스트에서는 제외
    }
    if (directionWords.down.includes(text)) {
      direction = 'down';
      return false; // 타겟 텍스트에서는 제외
    }
    
    // 기존 불용어 처리
    return !actionWords.includes(text) && 
           !stopWords.includes(text) &&
           text.length > 0 &&
           !text.match(/^[ㄱ-ㅎㅏ-ㅣ]$/);
  });

  const targetText = meaningfulTokens.map((t: any) => t.text).join(' ').trim();
  
  console.log(`🔍 [background] Extracted - Target: "${targetText}", Direction: ${direction}`);
  
  return { targetText, direction };
}


// oktjs를 사용한 음성 명령 분석
async function analyzeVoiceCommand(command: string, oktjsResult?: any) {
  console.log('🎤 [background] Analyzing voice command:', command);
  
  let detectedAction = 'find';
  let targetText = command.toLowerCase().trim();
  let direction: 'up' | 'down' | null = null; // ✨ [수정] direction 변수 추가
  
  if (oktjsResult && oktjsResult.tokens) {
    console.log('✅ [background] Using oktjs analysis for command detection');
    console.log('🔍 [background] oktjs tokens:', oktjsResult.tokens.map((t: any) => `${t.text}(${t.pos})`).join(' '));
    
    detectedAction = classifyActionByTokens(oktjsResult.tokens, oktjsResult.verbs || []);
    
    // ✨ [수정] 타겟 텍스트와 방향을 함께 추출
    const extracted = extractTargetAndDirection(oktjsResult.tokens);
    targetText = extracted.targetText;
    direction = extracted.direction;
    
    console.log(`🎯 [background] oktjs Analysis - Action: ${detectedAction}, Target: "${targetText}", Direction: ${direction}`);
    
  } else {
    console.log('⚠️ [background] No oktjs result - falling back to basic analysis');
    targetText = command.toLowerCase().trim();
  }
  
  return {
    action: detectedAction,
    targetText,
    direction, // ✨ [수정] 결과에 direction 포함
    originalCommand: command
  };
}

// oktjs 토큰 기반 액션 분류 (기존과 동일)
function classifyActionByTokens(tokens: any[], verbs: string[]): string {
  const tokenTexts = tokens.map((t: any) => t.text.toLowerCase());
  const verbTexts = verbs.map(v => v.toLowerCase());
  
  // 입력 관련 동사 확인
  const inputVerbs = ['쓰', '써', '입력', '타이핑', '타이핑하'];
  if (verbTexts.some(verb => inputVerbs.includes(verb)) || 
      tokenTexts.some(text => ['써줘', '써', '입력해줘', '입력', '타이핑'].includes(text))) {
    return 'input';
  }
  
  // 클릭 관련 동사 확인
  const clickVerbs = ['클릭', '누르', '눌러', '선택'];
  if (verbTexts.some(verb => clickVerbs.includes(verb)) || 
      tokenTexts.some(text => ['클릭해줘', '클릭', '눌러줘', '눌러'].includes(text))) {
    return 'click';
  }
  
  // 스크롤 관련 동사 확인
  const scrollVerbs = ['스크롤', '내리', '올리', '움직이'];
  if (verbTexts.some(verb => scrollVerbs.includes(verb)) || 
      tokenTexts.some(text => ['스크롤해줘', '스크롤', '내려줘', '올려줘'].includes(text))) {
    return 'scroll';
  }
  
  // 찾기 관련 동사 확인
  const findVerbs = ['찾', '검색', '찾아'];
  if (verbTexts.some(verb => findVerbs.includes(verb)) || 
      tokenTexts.some(text => ['찾아줘', '찾아', '검색해줘', '검색'].includes(text))) {
    return 'find';
  }
  
  // 네비게이션 관련 확인
  const navWords = ['뒤로', '앞으로', '새로고침', '닫기', '홈'];
  if (tokenTexts.some(text => navWords.includes(text))) {
    return 'navigation';
  }
  
  return 'find';
}


// 아이콘 클릭 시 사이드 패널을 열도록 설정
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  console.log(`[background] Tab ${activeInfo.tabId} activated. Forcing crawl.`);
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
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
  // checkUrl 메시지는 더 이상 사용하지 않음 (Chrome API로 대체)

  if (sender.tab && request.action === 'crawlComplete') {
    chrome.runtime.sendMessage({
      action: 'updatePanelData',
      data: request.data,
      tabId: sender.tab.id
    });
  }
  
  if (request.action === 'highlightElement' && request.tabId) {
    // ✨ [수정] 중앙 상태 관리와 연동하여 활성 요소 설정
    setActiveElement(request.tabId, request.ownerId);
  }
  
  if (request.action === 'setActiveElement' && sender.tab?.id) {
    // ✨ [신규] Content Script에서 활성 요소 설정 요청 처리
    setActiveElement(sender.tab.id, request.ownerId);
  }
  
  if (request.action === 'executeVoiceCommand' && request.tabId) {
    console.log('🎤 [background] executeVoiceCommand received:', request.command);
    try {
      console.log('🔄 [background] Starting voice analysis...');
      const analysisResult = await analyzeVoiceCommand(request.command, request.oktjsResult);
      console.log('✅ [background] Voice analysis complete:', analysisResult);
      
      console.log('📤 [background] Sending to content script...');
      await chrome.tabs.sendMessage(request.tabId, { 
        action: 'executeProcessedCommand', 
        detectedAction: analysisResult.action,
        targetText: analysisResult.targetText,
        direction: analysisResult.direction, // ✨ [수정] direction 정보 추가
        originalCommand: request.preprocessedCommand || analysisResult.originalCommand
      });
      console.log('✅ [background] Message sent to content script');
    } catch (error) {
      console.log(`❌ [background] Voice command error in tab ${request.tabId}:`, (error as Error).message);
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabLastUrls[tabId];
  delete tabActiveElements[tabId];
  
  // 디바운싱 타이머도 정리
  if (tabDebounceTimeouts[tabId]) {
    clearTimeout(tabDebounceTimeouts[tabId]);
    delete tabDebounceTimeouts[tabId];
  }
  
  console.log(`[background] Cleaned up all state for closed tab ${tabId}.`);
});

// ✨ [신규] Chrome Extension API 기반 URL 변경 감지
console.log('[background] 🔧 Setting up Chrome API URL detection');

// 1. 일반적인 탭 URL 변경 감지
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
    handleUrlChange(tabId, tab.url, 'tabs.onUpdated');
  }
});

// 2. SPA 네비게이션 (뒤로가기/앞으로가기) 감지  
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId === 0) { // 메인 프레임만
    handleUrlChange(details.tabId, details.url, 'webNavigation.onHistoryStateUpdated');
  }
});

// 3. 페이지 로딩 완료 시 감지 (추가 안전장치)
chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId === 0) { // 메인 프레임만
    handleUrlChange(details.tabId, details.url, 'webNavigation.onCompleted');
  }
});
