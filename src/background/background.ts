// background.ts
// 각 탭의 마지막으로 확인된 URL을 저장하는 객체
const tabLastUrls: { [key: number]: string } = {};

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
  if (request.action === 'checkUrl' && sender.tab?.id) {
    const tabId = sender.tab.id;
    const currentUrl = request.url;
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

  if (sender.tab && request.action === 'crawlComplete') {
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
  console.log(`[background] Cleaned up URL for closed tab ${tabId}.`);
});
