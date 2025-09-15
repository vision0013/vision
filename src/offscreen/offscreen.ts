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
              const result = await aiController.analyzeIntent(command);
              chrome.runtime.sendMessage({
                action: 'analysisResult', // Background가 기대하는 응답 액션명
                requestId: message.requestId,
                result: result,
                intent: result.intent  // 테스트 스크립트를 위한 추가 필드
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

        case 'learnFromFailedTests':
          (async () => {
            try {
              // 중복 디버깅: 학습 데이터 상세 로그  
              console.log('🔍 [offscreen] message.failedTests:', message.failedTests);
              console.log('🔍 [offscreen] message.failedTests length:', message.failedTests?.length);
              
              if (!message.failedTests || message.failedTests.length === 0) {
                console.warn('⚠️ [offscreen] No failed tests provided for learning');
                chrome.runtime.sendMessage({
                  action: 'learningCompleted',
                  requestId: message.requestId,
                  success: false,
                  error: 'No failed tests provided'
                });
                return;
              }

              await aiController.learnFromFailedTests(message.failedTests);
              
              // 학습 완료 후 최신 통계도 함께 응답에 포함
              const stats = await aiController.getLearnedExamplesStats();
              
              chrome.runtime.sendMessage({
                action: 'learningCompleted',
                requestId: message.requestId,
                success: true,
                learnedCount: message.failedTests.length,
                stats: stats
              });
            } catch (error: any) {
              chrome.runtime.sendMessage({
                action: 'learningCompleted',
                requestId: message.requestId,
                success: false,
                error: error.message
              });
            }
          })();
          break;

        case 'getLearnedStats':
          (async () => {
            try {
              const stats = await aiController.getLearnedExamplesStats();
              
              chrome.runtime.sendMessage({
                action: 'statsResponse',
                requestId: message.requestId,
                success: true,
                stats: stats
              });
            } catch (error: any) {
              chrome.runtime.sendMessage({
                action: 'statsResponse',
                requestId: message.requestId,
                success: false,
                error: error.message
              });
            }
          })();
          break;

        case 'clearLearnedExamples':
          (async () => {
            try {
              await aiController.clearLearnedExamples();
              
              chrome.runtime.sendMessage({
                action: 'clearCompleted',
                requestId: message.requestId,
                success: true
              });
            } catch (error: any) {
              chrome.runtime.sendMessage({
                action: 'clearCompleted',
                requestId: message.requestId,
                success: false,
                error: error.message
              });
            }
          })();
          break;

        case 'createSnapshot':
          (async () => {
            try {
              const snapshot = await aiController.createSnapshot(message.description);
              
              chrome.runtime.sendMessage({
                action: 'snapshotCreated',
                requestId: message.requestId,
                success: true,
                snapshot: snapshot
              });
            } catch (error: any) {
              chrome.runtime.sendMessage({
                action: 'snapshotCreated',
                requestId: message.requestId,
                success: false,
                error: error.message
              });
            }
          })();
          break;

        case 'getSnapshots':
          (async () => {
            try {
              const snapshots = await aiController.getSnapshots();
              
              chrome.runtime.sendMessage({
                action: 'snapshotsResponse',
                requestId: message.requestId,
                success: true,
                snapshots: snapshots
              });
            } catch (error: any) {
              chrome.runtime.sendMessage({
                action: 'snapshotsResponse',
                requestId: message.requestId,
                success: false,
                error: error.message
              });
            }
          })();
          break;

        case 'rollbackSnapshot':
          (async () => {
            try {
              const success = await aiController.rollbackToSnapshot(message.snapshotId);
              
              
              chrome.runtime.sendMessage({
                action: 'rollbackCompleted',
                requestId: message.requestId,
                success: success
              });
            } catch (error: any) {
              chrome.runtime.sendMessage({
                action: 'rollbackCompleted',
                requestId: message.requestId,
                success: false,
                error: error.message
              });
            }
          })();
          break;

        case 'deleteSnapshot':
          (async () => {
            try {
              const success = await aiController.deleteSnapshot(message.snapshotId);
              
              
              chrome.runtime.sendMessage({
                action: 'snapshotDeleted',
                requestId: message.requestId,
                success: success
              });
            } catch (error: any) {
              chrome.runtime.sendMessage({
                action: 'snapshotDeleted',
                requestId: message.requestId,
                success: false,
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
