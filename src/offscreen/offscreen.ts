// Offscreen Document에서 AI 추론 실행

// 모든 로직을 비동기 함수로 감싸서 초기화 오류를 잡습니다.
async function initializeOffscreen() {
  try {
    console.log(' M [offscreen] Starting dynamic imports...');
    // AI 컨트롤러를 동적으로 불러와서 잠재적인 import 오류를 잡습니다.
    const { getAIController } = await import('../features/ai-inference');
    console.log(' M [offscreen] Imports loaded successfully.');

    let aiController = getAIController();
    console.log(' M [offscreen] AI Controller instantiated.');

    // Background 스크립트로부터 메시지를 수신합니다.
    chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
      console.log(' M [offscreen] Received message:', message);

      switch (message.action) {
        case 'initializeAI':
          (async () => {
            try {
              console.log('🚀 [offscreen] Initializing AI model from local cache...');
              const success = await aiController.initialize();
              const status = await aiController.getModelStatus();
              console.log('📊 [offscreen] AI status after initialize:', status);
              chrome.runtime.sendMessage({
                action: 'aiInitialized',
                requestId: message.requestId,
                success: success,
                status: status
              });
            } catch (error: any) {
              console.error('❌ [offscreen] Initialize error:', error);
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
              console.log('🔍 [offscreen] Getting model status...');
              const status = await aiController.getModelStatus();
              console.log('📊 [offscreen] Model status retrieved:', status);
              chrome.runtime.sendMessage({
                action: 'modelStatusResponse',
                requestId: message.requestId,
                status: status
              });
            } catch (error: any) {
              console.error('❌ [offscreen] Failed to get model status:', error);
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
              console.log('📥 [offscreen] Starting AI model download with token...');
              const success = await aiController.downloadAndCacheModel(message.token);
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
              console.log('🗑️ [offscreen] Deleting AI model...');
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
              console.log('🎯 [offscreen] Analyzing intent:', message.command || message.voiceInput);
              const command = message.command || message.voiceInput;
              const result = await aiController.analyzeIntent(command);
              chrome.runtime.sendMessage({
                action: 'analysisResult', // Background가 기대하는 응답 액션명
                requestId: message.requestId,
                result: result,
                intent: result.intent  // 테스트 스크립트를 위한 추가 필드
              });
            } catch (error: any) {
              console.error('❌ [offscreen] Intent analysis error:', error);
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

    console.log(' M [offscreen] onMessage listener attached.');

    // Background 스크립트에 Offscreen Document가 준비되었음을 알립니다.
    chrome.runtime.sendMessage({
      action: 'offscreenReady'
    });
    console.log(' M [offscreen] "offscreenReady" message sent.');

  } catch (error: any) {
    console.error('❌ [offscreen] CRITICAL ERROR during initialization:', error);
    // 심각한 오류 발생 시 Background에 알립니다.
    chrome.runtime.sendMessage({ action: 'offscreenError', error: error.message });
  }
}

initializeOffscreen();
