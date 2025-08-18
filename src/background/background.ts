// background.ts
// 각 탭의 마지막으로 확인된 URL을 저장하는 객체
const tabLastUrls: { [key: number]: string } = {};

// oktjs를 사용한 음성 명령 분석
async function analyzeVoiceCommand(command: string, oktjsResult?: any) {
  console.log('🎤 [background] Analyzing voice command:', command);
  
  let lowerCommand = command.toLowerCase().trim();
  
  // 패널에서 전달받은 oktjs 결과 출력
  if (oktjsResult) {
    console.log('✅ [background] Received oktjs analysis from panel');
    console.log('🔍 [background] oktjs tokens:', oktjsResult.tokens?.map((t: any) => `${t.text}(${t.pos})`).join(' '));
    if (oktjsResult.nouns?.length > 0) console.log('📗 [background] Nouns:', oktjsResult.nouns);
    if (oktjsResult.verbs?.length > 0) console.log('🎯 [background] Verbs:', oktjsResult.verbs);
    if (oktjsResult.adjectives?.length > 0) console.log('🔸 [background] Adjectives:', oktjsResult.adjectives);
  } else {
    console.log('ℹ️ [background] No oktjs result from panel');
  }
  
  // 기존 키워드 기반 분석
  let detectedAction = 'find';
  let targetText = lowerCommand;
  
  const simplePatterns = [
    { keywords: ['써줘', '써', '입력해줘', '입력', '타이핑'], action: 'input' },
    { keywords: ['클릭해줘', '클릭', '눌러줘', '눌러'], action: 'click' },
    { keywords: ['찾아줘', '찾아', '검색해줘', '검색'], action: 'find' },
    { keywords: ['스크롤해줘', '스크롤', '내려줘', '올려줘'], action: 'scroll' }
  ];
  
  for (const pattern of simplePatterns) {
    for (const keyword of pattern.keywords) {
      if (lowerCommand.includes(keyword)) {
        detectedAction = pattern.action;
        targetText = lowerCommand
          .replace(keyword, '')
          .replace(/해줘/g, '')
          .replace(/주세요/g, '')
          .replace(/\s줄(\s|$)/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        console.log(`✅ [background] Action: ${detectedAction}, target: "${targetText}"`);
        break;
      }
    }
    if (detectedAction !== 'find') break;
  }
  
  // 추가 불용어 제거
  targetText = targetText
    .replace(/해줘|주세요|좀|을|를|에서|로|의|와|과|하고|그리고/g, '')
    .replace(/\s줄(\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return {
    action: detectedAction,
    targetText,
    originalCommand: command
  };
}

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
    console.log('🎤 [background] executeVoiceCommand received:', request.command);
    try {
      // 백그라운드에서 음성 명령 분석
      console.log('🔄 [background] Starting voice analysis...');
      const analysisResult = await analyzeVoiceCommand(request.command, request.oktjsResult);
      console.log('✅ [background] Voice analysis complete:', analysisResult);
      
      // 분석 결과를 Content Script로 전송
      console.log('📤 [background] Sending to content script...');
      await chrome.tabs.sendMessage(request.tabId, { 
        action: 'executeProcessedCommand', 
        detectedAction: analysisResult.action,
        targetText: analysisResult.targetText,
        originalCommand: request.preprocessedCommand || analysisResult.originalCommand // 전처리된 명령어 사용
      });
      console.log('✅ [background] Message sent to content script');
    } catch (error) {
      console.log(`❌ [background] Voice command error in tab ${request.tabId}:`, (error as Error).message);
      console.log(`❌ [background] Error stack:`, (error as Error).stack);
    }
  }
});

// 탭이 닫힐 때 메모리에서 해당 탭의 URL 정보를 삭제
chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabLastUrls[tabId];
  console.log(`[background] Cleaned up URL for closed tab ${tabId}.`);
});