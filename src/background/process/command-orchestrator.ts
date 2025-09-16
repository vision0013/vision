import { handleAIMessage } from './ai-message-handler';
import { tabStateManager } from '../controllers/managers/tab-state-manager';
import { CrawledItem, BoundingBox } from '../../types';

function isRectInViewport(rect: BoundingBox, viewport: { width: number; height: number }): boolean {
  const bottom = rect.top + rect.height;
  const right = rect.left + rect.width;
  return rect.top >= 0 && rect.left >= 0 && bottom <= viewport.height && right <= viewport.width && rect.width > 0 && rect.height > 0;
}

function getSmartRankedItems(items: CrawledItem[], command: string): CrawledItem[] {
  const keywords = command.split(/\s+/).filter(k => k.length > 1);
  if (keywords.length === 0) return items;

  const scoredItems = items.map(item => {
    let score = 0;
    const itemText = `${item.text || ''} ${item.label || ''} ${item.placeholder || ''}`.toLowerCase();
    const itemType = item.type.toLowerCase();

    for (const keyword of keywords) {
      const lowerKeyword = keyword.toLowerCase();
      if (itemText.includes(lowerKeyword)) score += 5;
      if (itemType.includes(lowerKeyword)) score += 10;
    }
    return { item, score };
  });

  return scoredItems
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.item);
}

export async function handleCommandFromUI(request: any, sender: chrome.runtime.MessageSender) {
  const { command } = request;
  const tabId = sender.tab?.id || request.tabId;
  const MAX_ITEMS_TO_SEND = 40;

  if (!tabId) {
    console.error('❌ [Orchestrator] No tab ID found for the command.');
    return { success: false, error: 'No tab ID' };
  }

  // ✨ [신규] 메타 명령어 처리 (모드 전환)
  const lowerCommand = command.toLowerCase();
  if (lowerCommand.includes('탐색 모드')) {
    tabStateManager.setMode(tabId, 'navigate');
    // TODO: UI에 모드 변경 알림
    return { success: true, message: "Mode changed to navigate." };
  } else if (lowerCommand.includes('검색 모드')) {
    tabStateManager.setMode(tabId, 'search');
    // TODO: UI에 모드 변경 알림
    return { success: true, message: "Mode changed to search." };
  }

  console.log(`🤖 [Orchestrator] Processing command for tab ${tabId}: "${command}"`);

  try {
    const crawledData = tabStateManager.getCrawledData(tabId);
    const viewport = tabStateManager.getViewport(tabId);
    const mode = tabStateManager.getMode(tabId) || 'navigate'; // 기본값은 탐색 모드

    if (!crawledData || crawledData.length === 0 || !viewport) {
      console.warn(`⚠️ [Orchestrator] No crawled data or viewport info for tab ${tabId}.`);
      return { success: false, error: 'No crawled data or viewport info for this tab.' };
    }

    const visibleItems = crawledData.filter(item => isRectInViewport(item.rect, viewport));
    const rankedItems = getSmartRankedItems(visibleItems, command);
    const finalItemsForAI = [...new Set([...rankedItems, ...visibleItems])].slice(0, MAX_ITEMS_TO_SEND);

    console.log(`[Orchestrator] Filtered to ${finalItemsForAI.length} items for AI in ${mode} mode.`);

    // 🐛 [DEBUG] 크롤링 데이터 상세 로그 (id 12, 13 주변)
    finalItemsForAI.forEach(item => {
      if (item.id >= 10 && item.id <= 15) {
        console.log(`🔍 [DEBUG] Item ${item.id}: type=${item.type}, text="${item.text}", isClickable=${item.isClickable}, isInputtable=${item.isInputtable}`);
      }
    });

    // ✨ [수정] AI에게 현재 모드 정보 전달
    const response = await handleAIMessage({
      action: 'getAIPlan',
      command: command,
      crawledItems: finalItemsForAI,
      mode: mode
    });

    if (response.error) throw new Error(response.error);

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
          await sendActionToContentScript(tabId, { action: 'execute_navigate', type: step.type });
          break;
        case 'SCROLL':
          await sendActionToContentScript(tabId, { action: 'execute_scroll', direction: step.direction, target: step.target });
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
