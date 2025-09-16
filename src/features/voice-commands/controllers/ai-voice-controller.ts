import { CrawledItem } from "@/types";
import { VoiceCommandResult } from "../types/voice-types";
import { mapAIToVoiceActions, VoiceActionStep } from "../process/ai-action-mapper";
import { getAIController } from "../../ai-inference/controllers/ai-controller";
import { processVoiceCommand, CommandPayload } from "./voice-controller";

/**
 * 🤖 AI 기반 음성 명령 처리 (신규)
 * 사용자 음성을 AI로 분석하여 액션 시퀀스로 변환 후 순차 실행
 * @param userInput 사용자 음성 입력 텍스트
 * @param items 현재 페이지의 크롤링된 요소들
 * @returns Promise<VoiceCommandResult[]> 각 단계별 실행 결과
 */
export async function processAIVoiceCommand(
  userInput: string,
  items: CrawledItem[]
): Promise<VoiceCommandResult[]> {
  console.log(`🤖 [CONTROLLER] Processing AI voice command: "${userInput}"`);

  try {
    // 1. AI로 음성 명령 분석
    const aiController = getAIController();

    if (!aiController.isModelLoaded()) {
      console.warn('⚠️ [CONTROLLER] AI model not loaded, falling back to keyword-based processing');
      // AI 모델이 로드되지 않은 경우 기존 방식으로 폴백
      return [processVoiceCommand({
        detectedAction: 'find',
        targetText: userInput,
        direction: null,
        originalCommand: userInput,
        items
      })];
    }

    const aiResult = await aiController.analyzeIntent(userInput, items, 'navigate');
    console.log(`🧠 [CONTROLLER] AI analysis result:`, aiResult);

    // 2. AI 결과를 voice-commands 액션 시퀀스로 변환
    const actionSequence = mapAIToVoiceActions(aiResult, userInput);
    console.log(`🎯 [CONTROLLER] Generated action sequence:`, actionSequence);

    // 3. 액션 시퀀스 순차 실행
    const results: VoiceCommandResult[] = [];

    for (const [index, step] of actionSequence.steps.entries()) {
      console.log(`🔄 [CONTROLLER] Executing step ${index + 1}/${actionSequence.steps.length}:`, step);

      try {
        const result = await executeVoiceActionStep(step, items);
        results.push(result);

        // 단계별 대기 시간
        if (step.waitFor && step.waitFor > 0) {
          console.log(`⏳ [CONTROLLER] Waiting ${step.waitFor}ms after step ${index + 1}`);
          await new Promise(resolve => setTimeout(resolve, step.waitFor));
        }

        // 실패한 경우 시퀀스 중단 여부 결정
        if (result.type === "not_found" && step.priority === "high") {
          console.warn(`⚠️ [CONTROLLER] High priority step failed, stopping sequence:`, result);
          break;
        }
      } catch (stepError) {
        console.error(`❌ [CONTROLLER] Step ${index + 1} execution failed:`, stepError);
        results.push({
          type: "not_found",
          message: `Step ${index + 1} failed: ${stepError instanceof Error ? stepError.message : 'Unknown error'}`
        });

        // 중요한 단계 실패 시 시퀀스 중단
        if (step.priority === "high") {
          break;
        }
      }
    }

    console.log(`✅ [CONTROLLER] AI voice command completed. Executed ${results.length} steps`);
    return results;

  } catch (aiError) {
    console.error('❌ [CONTROLLER] AI voice command processing failed:', aiError);

    // AI 처리 실패 시 기존 방식으로 폴백
    console.log('🔄 [CONTROLLER] Falling back to keyword-based processing');
    return [processVoiceCommand({
      detectedAction: 'find',
      targetText: userInput,
      direction: null,
      originalCommand: userInput,
      items
    })];
  }
}

/**
 * 개별 액션 스텝 실행
 */
async function executeVoiceActionStep(
  step: VoiceActionStep,
  items: CrawledItem[]
): Promise<VoiceCommandResult> {

  const payload: CommandPayload = {
    detectedAction: step.action.replace('_action', ''), // find_action → find
    targetText: step.target || '',
    direction: null,
    originalCommand: step.value || step.target || '',
    items
  };

  // input_action의 경우 value를 originalCommand로 사용
  if (step.action === 'input_action' && step.value) {
    payload.originalCommand = step.value;
  }

  // scroll_action의 경우 direction 설정
  if (step.action === 'scroll_action' && step.value) {
    payload.direction = step.value as 'up' | 'down';
  }

  // navigation_action의 경우 targetText를 action type으로 설정
  if (step.action === 'navigation_action' && step.target) {
    payload.targetText = step.target; // "back", "forward", "refresh"
  }

  return processVoiceCommand(payload);
}