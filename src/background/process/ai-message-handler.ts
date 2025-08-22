// AI 관련 메시지 처리 핸들러 (Offscreen 중계)

import { AIMessageRequest } from '../types/background-types';
import { offscreenManager } from '../controllers/managers/offscreen-manager';

// 요청 ID용 카운터 (타임스탬프와 결합하여 고유성 보장)
let requestCounter = 0;

/**
 * AI 관련 메시지를 Offscreen으로 중계하는 핸들러
 * 기존 background-old.ts의 검증된 비동기 처리 방식 적용
 */
export async function handleAIMessage(
  request: AIMessageRequest
): Promise<any> {
  console.log(`🔄 [ai-handler] Processing AI request: ${request.action}`);
  
  try {
    // 1. Offscreen Document 준비
    if (!offscreenManager.isReady()) {
      console.log('📄 [ai-handler] Creating offscreen document...');
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
    console.log(`✅ [ai-handler] Offscreen document ready`);
    
    // 3. 액션명 변환 (Background → Offscreen)  
    const forwardAction = mapBackgroundActionToOffscreen(request.action);
    console.log(`📤 [ai-handler] Forwarding ${request.action} → ${forwardAction}`);
    
    // 4. 타임스탬프 + 카운터 기반 요청 ID 생성
    const requestId = `${Date.now()}_${++requestCounter}`;
    console.log(`🆔 [ai-handler] Request ID: ${requestId}`);
    
    // 5. Offscreen으로 메시지 전달 (ID 포함)
    chrome.runtime.sendMessage({ 
      action: forwardAction, 
      requestId: requestId,
      token: request.token,
      command: request.command
    });
    
    // 6. 응답 대기 (ID 기반 매칭 + 타임아웃 취소)
    const expectedResponse = mapBackgroundActionToResponse(request.action);
    console.log(`⏳ [ai-handler] Waiting for response: ${expectedResponse} with ID: ${requestId}`);
    
    const response = await new Promise((resolve) => {
      let timeoutId: NodeJS.Timeout;
      
      const listener = (msg: any) => {
        // ID가 일치하는 응답만 처리
        if (msg.action === expectedResponse && msg.requestId === requestId) {
          chrome.runtime.onMessage.removeListener(listener);
          clearTimeout(timeoutId); // 타임아웃 취소
          console.log(`✅ [ai-handler] Received ${expectedResponse} for ID ${requestId}:`, msg);
          resolve(msg);
        }
      };
      chrome.runtime.onMessage.addListener(listener);
      
      // 다운로드는 12분, 기타 작업은 30초 타임아웃
      const timeoutDuration = request.action === 'downloadAIModel' ? 12 * 60 * 1000 : 30000;
      timeoutId = setTimeout(() => {
        chrome.runtime.onMessage.removeListener(listener);
        console.error(`⏰ [ai-handler] Timeout waiting for ${expectedResponse} with ID: ${requestId}`);
        resolve({ error: 'AI operation timeout' });
      }, timeoutDuration);
    });
    
    return response;
    
  } catch (error: any) {
    console.error(`❌ [ai-handler] Error processing ${request.action}:`, error.message);
    return { error: error.message };
  }
}

/**
 * Background 액션명을 Offscreen 액션명으로 변환
 */
function mapBackgroundActionToOffscreen(action: string): string {
  const actionMap: Record<string, string> = {
    'downloadAIModel': 'downloadModel',
    'initializeAI': 'initializeAI',
    'loadAIModel': 'initializeAI', // Load Model도 같은 Offscreen 액션 사용
    'getAIModelStatus': 'getModelStatus',
    'testAIAnalysis': 'analyzeIntent',
    'deleteAIModel': 'deleteModel'
  };
  
  return actionMap[action] || action;
}

/**
 * Background 액션명을 기대하는 응답 액션명으로 변환
 */
function mapBackgroundActionToResponse(action: string): string {
  const responseMap: Record<string, string> = {
    'downloadAIModel': 'modelLoaded',
    'deleteAIModel': 'modelDeleted',
    'initializeAI': 'aiInitialized',
    'loadAIModel': 'aiInitialized', // Load Model도 같은 응답 기대
    'testAIAnalysis': 'analysisResult',
    'getAIModelStatus': 'modelStatusResponse'
  };
  
  return responseMap[action] || 'modelStatusResponse';
}