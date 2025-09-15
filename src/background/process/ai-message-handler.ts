// AI 관련 메시지 처리 핸들러 (Offscreen 중계) - 다중 모델 지원

import { AIMessageRequest } from '../types/background-types';
import { offscreenManager } from '../controllers/managers/offscreen-manager';
import { getAIController } from '../../features/ai-inference/controllers/ai-controller';
import { AVAILABLE_MODELS } from '../../features/ai-inference/config/model-registry';

// 요청 ID용 카운터 (타임스탬프와 결합하여 고유성 보장)
let requestCounter = 0;

/**
 * AI 관련 메시지를 Offscreen으로 중계하는 핸들러
 * 기존 background-old.ts의 검증된 비동기 처리 방식 적용
 */
export async function handleAIMessage(
  request: AIMessageRequest
): Promise<any> {
  // 중복 디버깅: 요청 전체 로그
  console.log(`🔄 [ai-handler] Processing AI request: ${request.action}`);
  console.log(`🔍 [ai-handler] Full request:`, request);
  console.log(`📍 [ai-handler] Request source: ${request.source || 'unknown'}, timestamp: ${request.timestamp || 'none'}`);
  
  try {
    // 1. Offscreen Document 준비
    if (!offscreenManager.isReady()) {
      await offscreenManager.ensureReady();
      
      // Offscreen 준비 완료 대기
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

    // 2. Offscreen 준비 상태 확인 및 대기 (추가 안전장치)
    await offscreenManager.ensureReady();
    
    // 3. 액션명 변환 (Background → Offscreen)  
    const forwardAction = mapBackgroundActionToOffscreen(request.action);
    
    // 4. 타임스탬프 + 카운터 기반 요청 ID 생성
    const requestId = `${Date.now()}_${++requestCounter}`;
    
    // 5. Offscreen으로 메시지 전달 (ID 포함)
    const messageToSend = { 
      action: forwardAction, 
      requestId: requestId,
      token: request.token,
      command: request.command,
      failedTests: request.failedTests,
      snapshotId: request.snapshotId,
      description: request.description
    };
    // 중복 디버깅: 전송 메시지 로그
    console.log(`📤 [ai-handler] Sending to Offscreen:`, messageToSend);
    chrome.runtime.sendMessage(messageToSend);
    
    // 6. 응답 대기 (ID 기반 매칭 + 타임아웃 취소)
    const expectedResponse = mapBackgroundActionToResponse(request.action);
    
    const response = await new Promise((resolve) => {
      let timeoutId: NodeJS.Timeout;
      
      const listener = (msg: any) => {
        // ID가 일치하는 응답만 처리
        if (msg.action === expectedResponse && msg.requestId === requestId) {
          chrome.runtime.onMessage.removeListener(listener);
          clearTimeout(timeoutId); // 타임아웃 취소
          resolve(msg);
        }
      };
      chrome.runtime.onMessage.addListener(listener);
      
      // 다운로드는 12분, 기타 작업은 30초 타임아웃
      const timeoutDuration = request.action === 'downloadAIModel' ? 12 * 60 * 1000 : 30000;
      timeoutId = setTimeout(() => {
        chrome.runtime.onMessage.removeListener(listener);
        resolve({ error: 'AI operation timeout' });
      }, timeoutDuration);
    });
    
    return response;
    
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Background 액션명을 Offscreen 액션명으로 변환 (다중 모델 지원)
 */
function mapBackgroundActionToOffscreen(action: string): string {
  const actionMap: Record<string, string> = {
    'downloadAIModel': 'downloadModel',
    'initializeAI': 'initializeAI',
    'loadAIModel': 'initializeAI', // Load Model도 같은 Offscreen 액션 사용
    'getAIModelStatus': 'getModelStatus',
    'testAIAnalysis': 'analyzeIntent',
    'deleteAIModel': 'deleteModel',
    'learnFromFailedTests': 'learnFromFailedTests', // 새로운 학습 기능
    'getLearnedStats': 'getLearnedStats', // 학습 현황 조회
    'clearLearnedExamples': 'clearLearnedExamples', // 학습 데이터 초기화
    'createSnapshot': 'createSnapshot', // 스냅샷 생성
    'getSnapshots': 'getSnapshots', // 스냅샷 목록
    'rollbackSnapshot': 'rollbackSnapshot', // 스냅샷 복원
    'deleteSnapshot': 'deleteSnapshot', // 스냅샷 삭제
    // 다중 모델 지원 새 액션들
    'switchAIModel': 'switchModel',
    'getAvailableModels': 'getAvailableModels',
    'getAllModelsStatus': 'getAllModelsStatus',
    'getDownloadProgress': 'getDownloadProgress'
  };

  return actionMap[action] || action;
}

/**
 * Background 액션명을 기대하는 응답 액션명으로 변환 (다중 모델 지원)
 */
function mapBackgroundActionToResponse(action: string): string {
  const responseMap: Record<string, string> = {
    'downloadAIModel': 'modelLoaded',
    'deleteAIModel': 'modelDeleted',
    'initializeAI': 'aiInitialized',
    'loadAIModel': 'aiInitialized', // Load Model도 같은 응답 기대
    'testAIAnalysis': 'analysisResult',
    'getAIModelStatus': 'modelStatusResponse',
    'learnFromFailedTests': 'learningCompleted', // 학습 완료 응답
    'getLearnedStats': 'statsResponse', // 학습 현황 응답
    'clearLearnedExamples': 'clearCompleted', // 초기화 완료 응답
    'createSnapshot': 'snapshotCreated', // 스냅샷 생성 완료
    'getSnapshots': 'snapshotsResponse', // 스냅샷 목록 응답
    'rollbackSnapshot': 'rollbackCompleted', // 롤백 완료 응답
    'deleteSnapshot': 'snapshotDeleted', // 스냅샷 삭제 완룼
    // 다중 모델 지원 새 응답들
    'switchAIModel': 'modelSwitched',
    'getAvailableModels': 'availableModelsResponse',
    'getAllModelsStatus': 'allModelsStatusResponse',
    'getDownloadProgress': 'downloadProgressResponse'
  };

  return responseMap[action] || 'modelStatusResponse';
}

// =============================================================================
// 🌐 다중 모델 지원 핸들러들
// =============================================================================

/**
 * 사용 가능한 모델 목록 및 현재 모델 반환
 */
export async function handleGetAvailableModels(): Promise<any> {
  try {
    const aiController = getAIController();
    return {
      success: true,
      models: aiController.getAvailableModels(),
      currentModelId: aiController.getCurrentModelId()
    };
  } catch (error: any) {
    console.error('❌ [ai-handler] Failed to get available models:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 모든 모델의 상태 조회
 */
export async function handleGetAllModelsStatus(): Promise<any> {
  try {
    const aiController = getAIController();
    const states = await aiController.getAllModelsStatus();
    return {
      success: true,
      states
    };
  } catch (error: any) {
    console.error('❌ [ai-handler] Failed to get all models status:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 다운로드 진행률 조회
 */
export async function handleGetDownloadProgress(): Promise<any> {
  try {
    const aiController = getAIController();
    const progress = aiController.getDownloadProgress();
    return {
      success: true,
      progress
    };
  } catch (error: any) {
    console.error('❌ [ai-handler] Failed to get download progress:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 모델 전환 처리
 */
export async function handleSwitchModel(modelId: string, token?: string): Promise<any> {
  try {
    console.log(`🔄 [ai-handler] Switching to model: ${modelId}`);
    const aiController = getAIController();
    const success = await aiController.switchModel(modelId, token);

    if (success) {
      // UI에 모델 전환 알림 전송
      try {
        chrome.runtime.sendMessage({
          action: 'modelSwitched',
          modelId: modelId,
          modelName: AVAILABLE_MODELS[modelId]?.name || modelId
        }).catch(() => {
          // 메시지 전송 실패는 조용히 무시
        });
      } catch (error) {
        console.warn('⚠️ [ai-handler] Failed to notify model switch:', error);
      }

      return {
        success: true,
        modelId,
        message: 'Model switched successfully'
      };
    } else {
      return {
        success: false,
        error: 'Model switch failed'
      };
    }
  } catch (error: any) {
    console.error(`❌ [ai-handler] Failed to switch to model ${modelId}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 다중 모델 지원 다운로드 처리
 */
export async function handleMultiModelDownload(modelId?: string, token?: string): Promise<any> {
  try {
    console.log(`📥 [ai-handler] Starting download for model: ${modelId || 'default'}`);

    // modelId가 지정된 경우, 해당 모델용 컸트롤러 생성
    const aiController = modelId ? getAIController(modelId) : getAIController();

    let success: boolean;
    if (modelId && aiController.getCurrentModelId() !== modelId) {
      // 다른 모델로 전환 후 다운로드
      success = await aiController.switchModel(modelId, token);
    } else {
      // 현재 모델 다운로드
      success = await aiController.downloadAndCacheModel(token || '', modelId);
    }

    return {
      success,
      modelId: aiController.getCurrentModelId(),
      message: success ? 'Download started successfully' : 'Download failed to start'
    };
  } catch (error: any) {
    console.error(`❌ [ai-handler] Failed to start download for model ${modelId}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 다중 모델 지원 삭제 처리
 */
export async function handleMultiModelDelete(modelId?: string): Promise<any> {
  try {
    console.log(`🗑️ [ai-handler] Deleting model: ${modelId || 'current'}`);

    const aiController = getAIController();
    await aiController.deleteCachedModel(modelId);

    return {
      success: true,
      modelId: modelId || aiController.getCurrentModelId(),
      message: 'Model deleted successfully'
    };
  } catch (error: any) {
    console.error(`❌ [ai-handler] Failed to delete model ${modelId}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}