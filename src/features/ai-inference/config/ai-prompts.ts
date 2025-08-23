// src/ai-core/config/ai-prompts.ts

import promptExamples from './prompt-examples.json';

export interface PromptExample {
  command: string;
  action: string;
  confidence: number;
  reasoning: string;
}

export interface PromptTemplate {
  name: string;
  description: string;
  template: (voiceInput: string, examples: PromptExample[]) => string;
}

export const AI_PROMPTS = {

//성공률 90% 이상

EXAMPLE_DRIVEN_CLASSIFIER: {
    name: "Example-Driven Classifier",
    description: "복잡한 규칙 대신, 실패했던 모든 케이스를 포함한 구체적인 예시로 직접 학습시키는 방식",
    template: (voiceInput: string, examples: PromptExample[]) => {
      // 예시들을 프롬프트 형식으로 변환
      const exampleStrings = examples.map(ex => 
        `- "${ex.command}" -> {"action": "${ex.action}", "confidence": ${ex.confidence}, "reasoning": "${ex.reasoning}"}`
      ).join('\n');

      return `<start_of_turn>user
You are a Korean voice command classifier. Your ONLY job is to classify the user's command into one of the following categories: ["price_comparison", "purchase_flow", "simple_find", "navigation", "product_search"].

Look at these examples carefully and follow the pattern.

**--- EXAMPLES ---**
${exampleStrings}

**--- YOUR TASK ---**
Now classify this command. You MUST respond with a complete JSON object including action, confidence, and reasoning fields.

Required format: {"action": "category_name", "confidence": 0.XX, "reasoning": "your analysis"}

Command: "${voiceInput}"
<end_of_turn>
<start_of_turn>model`;
    }
},


} as const;

// 현재 사용할 프롬프트 설정
export const CURRENT_PROMPT = AI_PROMPTS.EXAMPLE_DRIVEN_CLASSIFIER;

// 프롬프트 전환 유틸리티
export function getPromptTemplate(promptName: keyof typeof AI_PROMPTS) {
  return AI_PROMPTS[promptName];
}

// JSON 파일에서 기본 예시 로드
export function getBaseExamples(): PromptExample[] {
  return promptExamples.baseExamples;
}