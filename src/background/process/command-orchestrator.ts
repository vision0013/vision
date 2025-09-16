import { handleAIMessage } from './ai-message-handler';
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
      console.warn(`⚠️ [Orchestrator] No crawled data found for tab ${tabId}.`);
      return { success: false, error: 'No crawled data for this tab.' };
    }

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

    if (!aiResult.plan || aiResult.plan.length === 0) {
      console.log('🤔 [Orchestrator] AI returned an empty plan.');
      // TODO: 사용자에게 AI가 행동을 결정하지 못했음을 알림
      return { success: true, steps: 0, message: 'AI could not determine an action.' };
    }

    // ✨ [수정] AI가 생성한 plan을 직접 순회하며 정밀 실행 명령 전송
    for (const [index, step] of aiResult.plan.entries()) {
      console.log(`🔄 [Orchestrator] Executing step ${index + 1}/${aiResult.plan.length} on tab ${tabId}:`, step);
      
      // 각 스텝에 맞는 정밀 액션 메시지 전송
      switch (step.action) {
        case 'CLICK':
          await sendActionToContentScript(tabId, { 
            action: 'execute_click', 
            crawlerId: step.id 
          });
          break;
        case 'INPUT':
          await sendActionToContentScript(tabId, { 
            action: 'execute_input', 
            crawlerId: step.id, 
            value: step.value 
          });
          break;
        case 'NAVIGATE':
          await sendActionToContentScript(tabId, { 
            action: 'execute_navigate', 
            url: step.url 
          });
          break;
        default:
          console.warn(`⚠️ [Orchestrator] Unknown action in AI plan:`, step);
      }

      // TODO: 각 스텝 실행 후 대기 시간 및 성공 여부 확인 로직 추가
    }

    console.log(`✅ [Orchestrator] Command sequence completed for "${command}"`);
    return { success: true, steps: aiResult.plan.length };

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
    // 응답을 기다릴 수 있도록 수정 (향후 확장용)
    const response = await chrome.tabs.sendMessage(tabId, payload);
    if (response?.success === false) {
      console.error(`[Orchestrator] Step failed in content script:`, response.error);
    }
    return response;
  } catch (error) {
    console.error(`❌ [Orchestrator] Failed to send message to content script on tab ${tabId}:`, error);
  }
}