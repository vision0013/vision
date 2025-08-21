// AI 관련 메시지 처리 핸들러 (Offscreen 중계)

import { AIMessageRequest } from '../types/background-types';
import { offscreenManager } from '../controllers/managers/offscreen-manager';

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

    // 2. 액션명 변환 (Background → Offscreen)  
    const forwardAction = mapBackgroundActionToOffscreen(request.action);
    console.log(`📤 [ai-handler] Forwarding ${request.action} → ${forwardAction}`);
    
    // 3. Offscreen으로 메시지 전달
    chrome.runtime.sendMessage({ 
      action: forwardAction, 
      token: request.token,
      command: request.command
    });
    
    // 4. 응답 대기 (기존 background-old.ts와 동일한 방식)
    const expectedResponse = mapBackgroundActionToResponse(request.action);
    console.log(`⏳ [ai-handler] Waiting for response: ${expectedResponse}`);
    
    const response = await new Promise((resolve) => {
      const listener = (msg: any) => {
        if (msg.action === expectedResponse) {
          chrome.runtime.onMessage.removeListener(listener);
          console.log(`✅ [ai-handler] Received ${expectedResponse}:`, msg);
          resolve(msg);
        }
      };
      chrome.runtime.onMessage.addListener(listener);
      
      // 30초 타임아웃
      setTimeout(() => {
        chrome.runtime.onMessage.removeListener(listener);
        console.error(`⏰ [ai-handler] Timeout waiting for ${expectedResponse}`);
        resolve({ error: 'AI operation timeout' });
      }, 30000);
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
    'testAIAnalysis': 'analysisResult',
    'getAIModelStatus': 'modelStatusResponse'
  };
  
  return responseMap[action] || 'modelStatusResponse';
}