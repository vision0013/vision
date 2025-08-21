// 음성 명령 처리 핸들러 (순수 함수)

import { VoiceCommandRequest, ActionPayload } from '../types/background-types';
import { mapAIIntentToAction } from './ai-action-mapper';

/**
 * 음성 명령 메시지 처리 - executeVoiceCommand 액션 전용
 */
export async function handleVoiceCommand(
  request: VoiceCommandRequest
): Promise<any> {
  console.log('🎤 [voice-handler] Processing voice command:', request.command);
  
  try {
    const { command, aiAnalysisResult, oktjsResult, tabId } = request;
    
    // 1. AI/oktjs 결과를 Content Script 액션으로 매핑
    const actionPayload: ActionPayload = mapAIIntentToAction(
      aiAnalysisResult,
      oktjsResult, 
      command
    );
    
    console.log('🎯 [voice-handler] Mapped action:', actionPayload);
    
    // 2. Content Script로 실행 명령 전송
    await chrome.tabs.sendMessage(tabId, {
      action: 'processVoiceCommand',
      detectedAction: actionPayload.detectedAction,
      targetText: actionPayload.targetText,
      direction: actionPayload.direction,
      originalCommand: actionPayload.originalCommand,
      confidence: actionPayload.confidence
    });
    
    console.log('✅ [voice-handler] Command sent to content script');
    
    // 3. 성공 응답
    return { 
      success: true, 
      action: actionPayload.detectedAction,
      target: actionPayload.targetText,
      confidence: actionPayload.confidence
    };
    
  } catch (error: any) {
    console.error('❌ [voice-handler] Error:', error.message);
    
    // 4. 에러 응답
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * 음성 명령 실행 후 결과 처리 (향후 확장용)
 */
export async function handleVoiceCommandResult(
  tabId: number,
  result: any
): Promise<void> {
  // 실행 결과를 Panel에 알림 (선택사항)
  try {
    chrome.runtime.sendMessage({
      action: 'voiceCommandResult',
      tabId,
      result
    });
  } catch (e) {
    // Panel이 닫혀있으면 정상
  }
  
  console.log('📊 [voice-handler] Command result:', result);
}