import { handleAIMessage } from './ai-message-handler'; // ✨ [수정] AI 컨트롤러 직접 호출 대신 핸들러 사용
import { mapAIToVoiceActions } from '../../features/voice-commands/process/ai-action-mapper';
import { tabStateManager } from '../controllers/managers/tab-state-manager';

/**
 * UI (패널)로부터 받은 음성 명령을 받아 전체 AI 처리 흐름을 지휘합니다.
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
    const crawledData = tabStateManager.getCrawledData(tabId);
    if (!crawledData || crawledData.length === 0) {
      console.warn(`⚠️ [Orchestrator] No crawled data found for tab ${tabId}. Cannot process command.`);
      return { success: false, error: 'No crawled data for this tab.' };
    }

    // ✨ [수정] AI 분석을 위해 Offscreen으로 메시지 전송 및 결과 대기
    const response = await handleAIMessage({
      action: 'getAIPlan',
      command: command,
      crawledItems: crawledData
    });

    if (response.error) {
      throw new Error(response.error);
    }

    const aiResult = response.result;
    console.log('🧠 [Orchestrator] AI analysis result:', aiResult);

    const actionSequence = mapAIToVoiceActions(aiResult, command);
    console.log('🎯 [Orchestrator] Generated action sequence:', actionSequence);

    for (const [index, step] of actionSequence.steps.entries()) {
      console.log(`🔄 [Orchestrator] Executing step ${index + 1}/${actionSequence.steps.length} on tab ${tabId}:`, step);
      
      await sendActionToContentScript(tabId, {
        action: 'processVoiceCommand', 
        detectedAction: step.action.replace('_action', ''),
        targetText: step.target || step.value || '',
        originalCommand: step.value || step.target || command,
        direction: null, 
      });

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
    await chrome.tabs.sendMessage(tabId, payload);
  } catch (error) {
    console.error(`❌ [Orchestrator] Failed to send message to content script on tab ${tabId}:`, error);
  }
}
