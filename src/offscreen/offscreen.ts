// Offscreen Document에서 AI 추론 실행

import { getAIController } from '../features/ai-inference';

// 요청 ID 중복 처리 방지용 세트
const processedRequestIds = new Set<string>();

// 모든 로직을 비동기 함수로 감싸서 초기화 오류를 잡습니다.
async function initializeOffscreen() {
  try {
    // AI 컨트롤러를 정적으로 불러와서 코드 스플리팅 방지
    let aiController = getAIController();

    // Background 스크립트로부터 메시지를 수신합니다.
    chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
      // 중복 디버깅: 모든 받은 메시지 로그
      console.log(' M [offscreen] Received message:', message);
      
      // 요청 ID가 있는 경우 중복 처리 방지
      if (message.requestId) {
        if (processedRequestIds.has(message.requestId)) {
          console.warn(`⚠️ [offscreen] Duplicate request ID ignored: ${message.requestId}`);
          return;
        }
        processedRequestIds.add(message.requestId);
        console.log(`🔖 [offscreen] Processing new request: ${message.requestId}`);
      } else {
        console.warn(`⚠️ [offscreen] Message without requestId - potential duplicate source:`, message.action);
      }

      switch (message.action) {
        case 'initializeAI':
          (async () => {
            try {
              const success = await aiController.initialize();
              const status = await aiController.getModelStatus();
              chrome.runtime.sendMessage({
                action: 'aiInitialized',
                requestId: message.requestId,
                success: success,
                status: status
              });
            } catch (error: any) {
              chrome.runtime.sendMessage({
                action: 'aiInitialized',
                requestId: message.requestId,
                success: false,
                error: error.message,
                status: { state: 1, error: error.message }
              });
            }
          })();
          break;

        case 'getModelStatus':
          (async () => {
            try {
              const status = await aiController.getModelStatus();
              chrome.runtime.sendMessage({
                action: 'modelStatusResponse',
                requestId: message.requestId,
                status: status
              });
            } catch (error: any) {
              chrome.runtime.sendMessage({
                action: 'modelStatusResponse',
                requestId: message.requestId,
                status: { isLoaded: false, isLoading: false, error: error.message }
              });
            }
          })();
          break;

        case 'downloadModel':
          (async () => {
            try {
              if (!message.token) {
                throw new Error("API token is missing.");
              }
              // 방법 1: modelAssetPath 시도, 실패시 자동으로 다운로드 방식으로 폴백
              const success = await aiController.downloadAndCacheModelAsPath(message.token);
              const status = aiController.getModelStatus();
              // ai-settings.tsx의 리스너와 맞추기 위해 'modelLoaded'를 사용합니다.
              chrome.runtime.sendMessage({
                action: 'modelLoaded',
                success: success,
                status: status,
              });
            } catch (error: any) {
              chrome.runtime.sendMessage({
                action: 'modelLoaded',
                success: false,
                error: error.message
              });
            }
          })();
          break;

        case 'deleteModel':
          (async () => {
            try {
              await aiController.deleteCachedModel();
              chrome.runtime.sendMessage({
                action: 'modelDeleted',
                success: true,
                status: aiController.getModelStatus()
              });
            } catch (error: any) {
              chrome.runtime.sendMessage({
                action: 'modelDeleted',
                success: false,
                error: error.message
              });
            }
          })();
          break;

        case 'analyzeIntent':
          (async () => {
            try {
              const command = message.command || message.voiceInput;
              const crawledItems = message.crawledItems;
              const mode = message.mode; // ✨ [신규] 모드 정보 추출

              if (!command || !crawledItems) {
                throw new Error('Command or crawledItems is missing in analyzeIntent request.');
              }

              // ✨ [수정] analyzeIntent 호출 시 mode 전달
              const result = await aiController.analyzeIntent(command, crawledItems, mode);
              
              chrome.runtime.sendMessage({
                action: 'analysisResult', // Background가 기대하는 응답 액션명
                requestId: message.requestId,
                result: result
              });
            } catch (error: any) {
              chrome.runtime.sendMessage({
                action: 'analysisResult',
                requestId: message.requestId,
                error: error.message
              });
            }
          })();
          break;

      }
    });


    // Background 스크립트에 Offscreen Document가 준비되었음을 알립니다.
    chrome.runtime.sendMessage({
      action: 'offscreenReady'
    });

  } catch (error: any) {
    // 심각한 오류 발생 시 Background에 알립니다.
    chrome.runtime.sendMessage({ action: 'offscreenError', error: error.message });
  }
}

initializeOffscreen();