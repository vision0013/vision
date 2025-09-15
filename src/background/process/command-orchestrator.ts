import { getAIController } from '../../features/ai-inference/controllers/ai-controller';
import { mapAIToVoiceActions } from '../../features/voice-commands/process/ai-action-mapper';

/**
 * UI (패널)로부터 받은 음성 명령을 받아 전체 AI 처리 흐름을 지휘합니다.
 * @param request 메시지 요청 객체, command 포함
 * @param sender 메시지 발신자 정보, tab ID 포함
 */
export async function handleCommandFromUI(request: any, sender: chrome.runtime.MessageSender) {
  const { command } = request;
  const tabId = sender.tab?.id || request.tabId;

  if (!tabId) {
    console.error('❌ [Orchestrator] No tab ID found for the command.');
    return { success: false, error: 'No tab ID' };
  }

  console.log(`🤖 [Orchestrator] Processing command for tab ${tabId}: "${command}"`);

  try {
    // 1. AI 컨트롤러를 통해 사용자 명령 분석 요청
    const aiController = getAIController();
    if (!aiController.isModelLoaded()) {
      console.warn('⚠️ [Orchestrator] AI model not loaded. Sending command as a simple "find" action.');
      // AI 모델이 준비 안됐을 경우, 단순 검색으로 폴백
      await sendActionToContentScript(tabId, {
        action: 'processVoiceCommand', // content_script가 수신하는 액션
        detectedAction: 'find',
        targetText: command,
        originalCommand: command,
      });
      return { success: true, mode: 'fallback' };
    }

    const aiResult = await aiController.analyzeIntent(command);
    console.log('🧠 [Orchestrator] AI analysis result:', aiResult);

    // 2. AI 분석 결과를 실행 가능한 액션 시퀀스로 변환
    const actionSequence = mapAIToVoiceActions(aiResult, command);
    console.log('🎯 [Orchestrator] Generated action sequence:', actionSequence);

    // 3. 액션 시퀀스를 순차적으로 content_script에 보내 실행
    for (const [index, step] of actionSequence.steps.entries()) {
      console.log(`🔄 [Orchestrator] Executing step ${index + 1}/${actionSequence.steps.length} on tab ${tabId}:`, step);
      
      await sendActionToContentScript(tabId, {
        action: 'processVoiceCommand', // content_script는 이 액션만 처리
        detectedAction: step.action.replace('_action', ''), // e.g., 'find_action' -> 'find'
        targetText: step.target || step.value || '',
        originalCommand: step.value || step.target || command,
        // voice-controller가 요구하는 모든 필드를 제공해야 할 수 있음
        direction: null, 
      });

      // 각 스텝 실행 후 대기 시간이 필요하면 적용
      if (step.waitFor) {
        await new Promise(resolve => setTimeout(resolve, step.waitFor));
      }
    }

    console.log(`✅ [Orchestrator] Command sequence completed for "${command}"`);
    return { success: true, steps: actionSequence.steps.length };

  } catch (error) {
    console.error('❌ [Orchestrator] Error processing command:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * content_script로 실행 액션을 보내는 헬퍼 함수
 */
async function sendActionToContentScript(tabId: number, payload: any) {
  try {
    // content_script가 준비되지 않았을 경우를 대비한 에러 핸들링
    await chrome.tabs.sendMessage(tabId, payload);
  } catch (error) {
    console.error(`❌ [Orchestrator] Failed to send message to content script on tab ${tabId}:`, error);
  }
}
