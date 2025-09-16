// AI 출력을 voice-commands 액션 시퀀스로 변환하는 매퍼

import { AIAnalysisResult, AIActionStep } from '../../ai-inference/types/ai-types';

export interface VoiceActionStep {
  action: "find_action" | "click_action" | "input_action" | "navigation_action" | "scroll_action";
  target?: string;
  value?: string;
  priority?: "high" | "medium" | "low";
  waitFor?: number; // 실행 후 대기 시간 (ms)
}

export interface VoiceActionSequence {
  steps: VoiceActionStep[];
  description: string;
  confidence: number;
}

/**
 * AI 분석 결과를 voice-commands 액션 시퀀스로 변환 (신규 AIAnalysisResult 호환)
 */
export function mapAIToVoiceActions(aiResult: AIAnalysisResult, userInput: string): VoiceActionSequence {
  console.log(`🔄 [ai-action-mapper] Converting AI plan to legacy voice actions...`);

  if (!aiResult.plan || aiResult.plan.length === 0) {
    console.warn(`⚠️ [ai-action-mapper] AI plan is empty, generating fallback.`);
    return {
      steps: [{ action: "find_action", target: userInput, priority: "low" }],
      description: `${userInput} → fallback find`,
      confidence: 0.5
    };
  }

  const newSteps: VoiceActionStep[] = aiResult.plan.map((step: AIActionStep) => {
    // 새로운 AIActionStep을 구형 VoiceActionStep으로 변환
    switch (step.action) {
      case 'CLICK':
        return {
          action: 'click_action',
          target: `ID:${step.id}`,
          priority: 'high'
        };
      case 'INPUT':
        return {
          action: 'input_action',
          target: `ID:${step.id}`,
          value: step.value,
          priority: 'high'
        };
      case 'NAVIGATE':
        return {
          action: 'navigation_action',
          target: step.type, // "back", "forward", "refresh"
          priority: 'high'
        };
      case 'SCROLL':
        return {
          action: 'scroll_action',
          target: step.target || '', // 특정 요소 ID (선택사항)
          value: step.direction, // "up" or "down"
          priority: 'medium'
        };
      default:
        // 알 수 없는 액션은 find로 처리
        return {
          action: 'find_action',
          target: userInput,
          priority: 'low'
        };
    }
  });

  const sequence: VoiceActionSequence = {
    steps: newSteps,
    description: `${userInput} → AI Plan (${newSteps.length} steps)`,
    confidence: 0.9 // AI가 계획을 생성했으므로 높은 신뢰도 부여
  };

  console.log(`✅ [ai-action-mapper] Generated ${sequence.steps.length} voice action steps from AI plan`);
  return sequence;
}
