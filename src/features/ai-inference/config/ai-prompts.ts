// src/ai-core/config/ai-prompts.ts

export interface PromptTemplate {
  name: string;
  description: string;
  template: (voiceInput: string) => string;
}

export const AI_PROMPTS = {

//성공률 90% 이상

EXAMPLE_DRIVEN_CLASSIFIER: {
    name: "Example-Driven Classifier",
    description: "복잡한 규칙 대신, 실패했던 모든 케이스를 포함한 구체적인 예시로 직접 학습시키는 방식",
    template: (voiceInput: string) => `<start_of_turn>user
You are a Korean voice command classifier. Your ONLY job is to classify the user's command into one of the following categories: ["price_comparison", "purchase_flow", "simple_find", "navigation", "product_search"].

Look at these examples carefully and follow the pattern.

**--- EXAMPLES ---**
- "아이폰 15 찾아줘" -> {"action": "product_search"}
- "저렴한 노트북 보여줘" -> {"action": "product_search"}
- "이 제품 얼마예요" -> {"action": "price_comparison"}
- "아이폰 가격 비교해줘" -> {"action": "price_comparison"}
- "검색 버튼 클릭해줘" -> {"action": "simple_find"}
- "홈 버튼 눌러줘" -> {"action": "simple_find"}
- "구매 버튼 찾아줘" -> {"action": "simple_find"} 
- "카테고리 선택해줘" -> {"action": "simple_find"}
- "이거 장바구니에 있나 확인해줘" -> {"action": "simple_find"}
- "검색해서 최저가 찾아줘" -> {"action": "price_comparison"} 
- "이거 사고싶어" -> {"action": "purchase_flow"}
- "주문서 작성해줘" -> {"action": "purchase_flow"}
- "결제 페이지로 이동해줘" -> {"action": "navigation"}
- "어디에 있지" -> {"action": "simple_find"}

**--- YOUR TASK ---**
Now classify this command. Respond with ONLY the JSON object.

Command: "${voiceInput}"
<end_of_turn>
<start_of_turn>model`
},

FINAL_CLASSIFIER_QWEN: { // Qwen을 위한 새 프롬프트
    name: "Final Classifier for Qwen",
    description: "Qwen Thinking 모델을 위한 페르소나, 단계별 추론, 최종 자기 검토 프롬프트",
    template: (voiceInput: string) => `<|im_start|>system
You are a methodical and precise AI assistant, acting as a Korean Voice Command Classifier. Your single task is to classify a user's command into ONE of five categories based on their immediate intent.
Follow these steps rigorously.
Step 1: Initial Analysis.
Step 2: Apply Priority Rules (UI > Purchase > Price > Nav > Search).
Step 3: Final Review against common mistakes.
You MUST respond with a valid JSON object ONLY. No other text.<|im_end|>
<|im_start|>user
Classify this command: "${voiceInput}"<|im_end|>
<|im_start|>assistant
`
},


} as const;

// 현재 사용할 프롬프트 설정
export const CURRENT_PROMPT = AI_PROMPTS.EXAMPLE_DRIVEN_CLASSIFIER;

// 프롬프트 전환 유틸리티
export function getPromptTemplate(promptName: keyof typeof AI_PROMPTS) {
  return AI_PROMPTS[promptName];
}