import { handleAIMessage } from './ai-message-handler';
import { tabStateManager } from '../controllers/managers/tab-state-manager';
import { BoundingBox } from '../../types';

/**
 * ✨ [수정] 요소의 좌표가 화면(viewport) 내에 있는지 확인하는 헬퍼 함수
 */
function isRectInViewport(rect: BoundingBox, viewport: { width: number; height: number }): boolean {
  // bottom과 right를 직접 계산
  const bottom = rect.top + rect.height;
  const right = rect.left + rect.width;

  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    bottom <= viewport.height &&
    right <= viewport.width &&
    rect.width > 0 &&
    rect.height > 0
  );
}

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
    const viewport = tabStateManager.getViewport(tabId);

    if (!crawledData || crawledData.length === 0 || !viewport) {
      console.warn(`⚠️ [Orchestrator] No crawled data or viewport info for tab ${tabId}.`);
      return { success: false, error: 'No crawled data or viewport info for this tab.' };
    }

    const visibleItems = crawledData.filter(item => isRectInViewport(item.rect, viewport));
    console.log(`[Orchestrator] Filtered to ${visibleItems.length} visible items (out of ${crawledData.length})`);

    const response = await handleAIMessage({
      action: 'getAIPlan',
      command: command,
      crawledItems: visibleItems
    });

    if (response.error) {
      throw new Error(response.error);
    }

    const aiResult = response.result;
    console.log('🧠 [Orchestrator] AI analysis result:', aiResult);

    if (!aiResult.plan || aiResult.plan.length === 0) {
      console.log('🤔 [Orchestrator] AI returned an empty plan.');
      return { success: true, steps: 0, message: 'AI could not determine an action.' };
    }

    for (const [index, step] of aiResult.plan.entries()) {
      console.log(`🔄 [Orchestrator] Executing step ${index + 1}/${aiResult.plan.length} on tab ${tabId}:`, step);
      
      switch (step.action) {
        case 'CLICK':
          await sendActionToContentScript(tabId, { action: 'execute_click', crawlerId: step.id });
          break;
        case 'INPUT':
          await sendActionToContentScript(tabId, { action: 'execute_input', crawlerId: step.id, value: step.value });
          break;
        case 'NAVIGATE':
          await sendActionToContentScript(tabId, { action: 'execute_navigate', url: step.url });
          break;
        default:
          console.warn(`⚠️ [Orchestrator] Unknown action in AI plan:`, step);
      }
    }

    console.log(`✅ [Orchestrator] Command sequence completed for "${command}"`);
    return { success: true, steps: aiResult.plan.length };

  } catch (error) {
    console.error('❌ [Orchestrator] Error processing command:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function sendActionToContentScript(tabId: number, payload: any) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, payload);
    if (response?.success === false) {
      console.error(`[Orchestrator] Step failed in content script:`, response.error);
    }
    return response;
  } catch (error) {
    console.error(`❌ [Orchestrator] Failed to send message to content script on tab ${tabId}:`, error);
  }
}