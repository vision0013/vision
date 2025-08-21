// background.ts

// 각 탭의 마지막으로 확인된 URL을 저장하는 객체
const tabLastUrls: { [key: number]: string } = {};

// URL 변경 디바운싱 관리
const tabDebounceTimeouts: { [key: number]: NodeJS.Timeout } = {};

// 중앙 상태 관리: 탭별 활성화된 요소 상태
interface ActiveElementState {
  ownerId: number | null;
  timestamp: number;
}
const tabActiveElements: { [tabId: number]: ActiveElementState } = {};

// Offscreen Document AI 관리
let offscreenReady = false;

// Offscreen Document 생성
async function createOffscreenDocument(): Promise<void> {
  if (!chrome.offscreen) {
    console.error('❌ [background] Offscreen API not supported');
    throw new Error('Offscreen API not supported');
  }
  
  try {
    if (await chrome.offscreen.hasDocument?.()) {
      console.log('📄 [background] Offscreen document already exists');
      offscreenReady = true;
      return;
    }
  } catch (error) {
    console.log('⚠️ [background] hasDocument check failed, proceeding with creation...');
  }
  
  try {
    console.log('🔨 [background] Creating offscreen document...');
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: [chrome.offscreen.Reason.WORKERS],
      justification: 'AI inference using MediaPipe requires DOM context'
    });
    console.log('✅ [background] Offscreen document created successfully');
  } catch (error: any) {
    console.error('❌ [background] Failed to create offscreen document:', error.message);
    throw error;
  }
}

// URL 변경 처리 함수
function handleUrlChange(tabId: number, newUrl: string): void {
  if (tabLastUrls[tabId] === newUrl) return;
  tabLastUrls[tabId] = newUrl;

  if (tabDebounceTimeouts[tabId]) clearTimeout(tabDebounceTimeouts[tabId]);
  
  tabDebounceTimeouts[tabId] = setTimeout(async () => {
    try {
      await chrome.tabs.sendMessage(tabId, { action: 'runCrawler' });
    } catch (error) {
      console.log(`[background] Cannot send runCrawler to tab ${tabId}:`, (error as Error).message);
    }
  }, 300);
}

async function notifyActiveElementChange(tabId: number, ownerId: number | null): Promise<void> {
  tabActiveElements[tabId] = { ownerId, timestamp: Date.now() };
  console.log(`🎯 [background] Active element set for tab ${tabId}:`, ownerId);
  try {
    await chrome.tabs.sendMessage(tabId, { action: 'activeElementChanged', ownerId });
  } catch (e) { /* content script might not be ready */ }
  try {
    chrome.runtime.sendMessage({ action: 'activeElementChanged', tabId, ownerId });
  } catch (e) { /* panel might not be open */ }
}

// ... (analyzeVoiceCommandWithAI and other analysis functions can be added here if needed) ...

// 아이콘 클릭 시 사이드 패널 열기
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

// 메시지 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'offscreenReady') {
    offscreenReady = true;
    console.log('✅ [background] Offscreen document ready');
    return true; // Indicate that we will respond asynchronously
  }

  // AI 관련 메시지를 Offscreen으로 전달하는 로직
  if (request.action === 'getAIModelStatus' || request.action === 'deleteAIModel' || request.action === 'downloadAIModel' || request.action === 'initializeAI') {
    (async () => {
      try {
        if (!offscreenReady) {
          await createOffscreenDocument();
          await new Promise<void>(resolve => {
            const listener = (msg: any) => {
              if (msg.action === 'offscreenReady') {
                chrome.runtime.onMessage.removeListener(listener);
                resolve();
              }
            };
            chrome.runtime.onMessage.addListener(listener);
          });
        }

        const actionToForward = request.action === 'downloadAIModel' ? 'downloadModel' : 
                                request.action === 'initializeAI' ? 'initializeAI' :
                                request.action === 'getAIModelStatus' ? 'getModelStatus' : request.action;
        chrome.runtime.sendMessage({ action: actionToForward, token: request.token });

        const responseAction = request.action === 'downloadAIModel' ? 'modelLoaded' : 
                               request.action === 'deleteAIModel' ? 'modelDeleted' : 
                               request.action === 'initializeAI' ? 'aiInitialized' : 'modelStatusResponse';

        const response = await new Promise((resolve) => {
          const listener = (msg: any) => {
            if (msg.action === responseAction) {
              chrome.runtime.onMessage.removeListener(listener);
              resolve(msg);
            }
          };
          chrome.runtime.onMessage.addListener(listener);
        });
        sendResponse(response);
      } catch (error: any) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (sender.tab && request.action === 'crawlComplete') {
    chrome.runtime.sendMessage({
      action: 'updatePanelData',
      data: request.data,
      tabId: sender.tab.id
    });
    return true;
  }

  if (request.action === 'highlightElement' && request.tabId) {
    notifyActiveElementChange(request.tabId, request.ownerId);
    return true;
  }
  
  if (request.action === 'setActiveElement' && sender.tab?.id) {
    notifyActiveElementChange(sender.tab.id, request.ownerId);
    return true;
  }

  // ... (executeVoiceCommand handler can be added here) ...

  return true; // Keep the message channel open for other async responses
});

// 탭 이벤트 리스너
chrome.tabs.onActivated.addListener(activeInfo => {
  chrome.tabs.get(activeInfo.tabId, tab => {
    if (tab.url && tab.url.startsWith('http')) {
      handleUrlChange(activeInfo.tabId, tab.url);
    }
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.url && tab.url.startsWith('http')) {
    handleUrlChange(tabId, tab.url);
  }
});

chrome.tabs.onRemoved.addListener(tabId => {
  delete tabLastUrls[tabId];
  delete tabActiveElements[tabId];
  if (tabDebounceTimeouts[tabId]) clearTimeout(tabDebounceTimeouts[tabId]);
  delete tabDebounceTimeouts[tabId];
});
