// src/ai-core/config/ai-prompts.ts

export interface PromptTemplate {
  name: string;
  description: string;
  template: (voiceInput: string) => string;
}

export const AI_PROMPTS = {

  // 단순 분류 프롬프트 (백업용)
  SIMPLE_CLASSIFICATION: {
    name: "Simple Classification", 
    description: "단순하고 직접적인 분류 규칙",
    template: (voiceInput: string) => `<start_of_turn>user
Korean command classifier. Choose ONE: ["price_comparison", "purchase_flow", "simple_find", "navigation", "product_search"]

Think step by step:
1. **UI interaction?** (버튼, 링크, 메뉴 + 클릭/눌러) → simple_find
2. **Price question?** (얼마, 가격, 최저가) → price_comparison
3. **Buy/order?** (구매, 주문, 결제, 장바구니) → purchase_flow
4. **Page navigation?** (뒤로, 홈으로, 이동) → navigation
5. **Product search?** (제품명 + 찾아/검색) → product_search

JSON: {"action": "category", "confidence": 0.95, "reasoning": "brief explanation"}

Command: "${voiceInput}"
<end_of_turn>
<start_of_turn>model`
  },

  // 극도로 간단한 프롬프트 (테스트용)
EXACT_MINIMAL: {
  name: "Exact Minimal",
  description: "정확히 96% 달성했던 극단적 단순 프롬프트",
  template: (voiceInput: string) => `Classify Korean command into: price_comparison, purchase_flow, simple_find, navigation, product_search

Examples:
- "버튼 클릭" → simple_find  
- "장바구니 담기" → purchase_flow
- "아이폰 검색" → product_search

Command: "${voiceInput}"
JSON: {"action": "`
},

CORRECT_MINIMAL: {
  name: "Correct Minimal",
  description: "MediaPipe 형식을 지킨 최소 프롬프트",
  template: (voiceInput: string) => `<start_of_turn>user
Classify Korean command into: price_comparison, purchase_flow, simple_find, navigation, product_search

Examples:
- "버튼 클릭" → {"action": "simple_find"}
- "장바구니 담기" → {"action": "purchase_flow"}
- "아이폰 검색" → {"action": "product_search"}
- "가격 비교" → {"action": "price_comparison"}
- "뒤로 가기" → {"action": "navigation"}

Command: "${voiceInput}"
JSON:
<end_of_turn>
<start_of_turn>model`
}
,
EXPLICIT_UI: {
name: "EXPLICIT_UI",
  description: "매우 명시적인 분류 규칙",
  template: (voiceInput: string) => `<start_of_turn>user
Command: "${voiceInput}"

IMPORTANT RULE: If command contains ANY of these words, it is simple_find:
- "버튼" (button)
- "링크" (link)  
- "메뉴" (menu)
- "창" (window)
- "아이콘" (icon)
- "클릭" (click)
- "눌러" (press)

Other rules:
- Price words → price_comparison
- Purchase words → purchase_flow  
- Navigation words → navigation
- Product + search → product_search

Categories: ["simple_find", "price_comparison", "purchase_flow", "navigation", "product_search"]

{"action": "?", "confidence": 0.95}
<end_of_turn>
<start_of_turn>model`
},

PREVIOUS_SUCCESS: {
  name: "Previous Success",
  description: "이전에 성공했던 정확한 프롬프트",
  template: (voiceInput: string) => `<start_of_turn>user
You are an expert Korean voice command classifier. 
Classify into ONE category: ["price_comparison", "purchase_flow", "simple_find", "navigation", "product_search"]

Respond with JSON:
{"action": "category", "product": "...", "target": "...", "confidence": 0.95, "reasoning": "explanation"}

Rules (STRICT ORDER):
1. **price_comparison**: 가격/할인 관련 ("최저가", "할인가", "얼마", "싼 곳")
2. **purchase_flow**: 구매/주문 ("장바구니", "결제", "주문", "구매", "카트")  
3. **simple_find**: UI 조작 ("버튼", "링크", "메뉴", "아이콘", "검색창" + "클릭/눌러/찾아")
4. **navigation**: 페이지 이동 ("뒤로", "앞으로", "홈으로", "이전 페이지")
5. **product_search**: 상품 검색 (제품명 + "찾아/검색/보여")

Examples:
- "검색창 찾아줘" → {"action": "simple_find", "target": "검색창", "confidence": 0.90}
- "메뉴 버튼 눌러줘" → {"action": "simple_find", "target": "메뉴 버튼", "confidence": 0.88}
- "카트에 추가해줘" → {"action": "purchase_flow", "target": "카트", "confidence": 0.92}
- "아이폰 찾아줘" → {"action": "product_search", "product": "아이폰", "confidence": 0.95}

Command: "${voiceInput}"
<end_of_turn>
<start_of_turn>model`
},

// src/features/ai-inference/config/ai-prompts.ts 의 개선 제안

THOUGHTFUL_ANALYSIS: { // (완벽실패)
    name: "Thoughtful Analysis",
    description: "사고 유도와 단계별 분석을 통한 분류",
    template: (voiceInput: string) => `<start_of_turn>user
You are an expert Korean voice command classifier for a web browser extension.
Your PRIMARY GOAL is to determine the user's IMMEDIATE INTENT.

Classify the command into ONE category: ["price_comparison", "purchase_flow", "simple_find", "navigation", "product_search"]

🧠 Before answering, think step-by-step using these rules:

**Rule 1: Is it a direct UI command?**
- If the command mentions UI elements like "버튼", "링크", "메뉴", "아이콘", "검색창" AND an action like "클릭", "눌러", "찾아", it is ALWAYS 'simple_find', regardless of other keywords.
- Example: "구매 버튼 찾아줘" -> The goal is to purchase, but the immediate action is FINDING A BUTTON. So, 'simple_find'.
- Example: "홈 버튼 눌러줘" -> The goal is navigation, but the immediate action is PRESSING A BUTTON. So, 'simple_find'.

**Rule 2: What is the main subject?**
- If the command is about a PRODUCT ("노트북", "아이폰"), and the action is "찾아줘" or "보여줘", it is 'product_search'. Modifiers like "저렴한" or "할인" do not change this core intent.
- Example: "저렴한 노트북 보여줘" -> The main subject is '노트북', the action is '보여줘'. So, 'product_search'.

**Rule 3: What is the core question?**
- If the command is a direct question about PRICE ("얼마야", "가격 비교"), it is 'price_comparison'.
- If the command expresses a DESIRE to buy ("이거 사고싶어"), it is 'purchase_flow'.

Respond ONLY with a valid JSON object.

Command: "${voiceInput}"
<end_of_turn>
<start_of_turn>model`
},

ADVANCED_REASONING: {
    name: "Advanced Reasoning",
    description: "단계별 사고 유도와 명확한 예외 규칙을 통한 분류",
    template: (voiceInput: string) => `<start_of_turn>user
You are an expert Korean voice command classifier. Your goal is to identify the user's immediate intent.
Classify the command into ONE category: ["price_comparison", "purchase_flow", "simple_find", "navigation", "product_search"]

Think step-by-step:
1.  **Analyze Keywords**: What are the key nouns and verbs in the command?
2.  **Identify Intent**: What is the user's primary goal? (e.g., find information, interact with UI, navigate)
3.  **Apply Strict Rules**: Use the examples below to resolve ambiguity.

**--- CRITICAL RULES & EXAMPLES ---**

* **UI elements come first!** If words like "버튼", "링크", "메뉴", "아이콘", "클릭", "눌러줘" appear, the action is **ALWAYS 'simple_find'**.
    * "구매 버튼 찾아줘" -> NOT 'purchase_flow'. It is 'simple_find'.
    * "홈 버튼 눌러줘" -> NOT 'navigation'. It is 'simple_find'.

* **The main subject is key!** If the goal is finding a product, it's **'product_search'**. Modifiers like "저렴한", "할인" are secondary.
    * "저렴한 노트북 보여줘" -> The subject is "노트북". It is 'product_search'.

* **Distinguish desire from action!**
    * "이거 사고싶어" -> Expresses a desire to buy. It is 'purchase_flow'.
    * "얼마야 이거" -> A direct question about price. It is 'price_comparison'.

**--- RESPONSE FORMAT ---**
Respond ONLY with a valid JSON object like this:
{"action": "classified_action", "target": "relevant_keyword", "confidence": 0.95, "reasoning": "A brief explanation of your decision based on the rules."}

**--- COMMAND TO CLASSIFY ---**
"${voiceInput}"
<end_of_turn>
<start_of_turn>model`
},
FINAL_CLASSIFIER: {
    name: "Final Classifier",
    description: "페르소나, 단계별 추론, 최종 자기 검토를 통해 정확도를 완성하는 프롬프트",
    template: (voiceInput: string) => `<start_of_turn>user
You are a methodical and precise AI assistant, acting as a **Korean Voice Command Classifier**. Your single task is to classify a user's command into ONE of five categories based on their immediate intent.

**--- Classification Process ---**

Follow these steps rigorously.

**Step 1: Initial Analysis.**
   - What is the user trying to do *right now*?
   - Identify the most critical keywords (verbs and nouns).

**Step 2: Apply Priority Rules.**
   - **Priority 1 (Highest): UI Interaction.** Does the command involve interacting with a UI element like "버튼", "링크", "메뉴", "클릭", "눌러줘"?
     -> If YES, the action is **'simple_find'**. This rule overrides all others.

   - **Priority 2: Purchase Flow.** If not Priority 1, does it involve a purchasing action like "구매", "결제", "주문", "장바구니", "사고싶어"?
     -> If YES, the action is **'purchase_flow'**.

   - **Priority 3: Price Comparison.** If not Priority 1 or 2, is it about price? Keywords: "가격", "얼마", "최저가", "할인".
     -> If YES, the action is **'price_comparison'**.

   - **Priority 4: Navigation.** If not Priority 1, 2, or 3, is it about moving between pages? Keywords: "페이지", "이동", "뒤로", "홈으로".
     -> If YES, the action is **'navigation'**.

   - **Priority 5 (Default): Product Search.** If it matches none of the above, it is a **'product_search'**.

**Step 3: Final Review.**
   - Review your chosen action against these common mistakes:
     - *Mistake:* "아이폰 가격 비교" -> 'product_search'. *Correction:* Contains "가격", so it must be **'price_comparison'**.
     - *Mistake:* "구매 버튼 클릭" -> 'purchase_flow'. *Correction:* Contains "버튼", so it must be **'simple_find'** (Priority 1).
     - *Mistake:* "저렴한 노트북" -> 'price_comparison'. *Correction:* Does not meet priorities 1-4, so it defaults to **'product_search'**.

**--- Response Format ---**
You MUST respond with a valid JSON object ONLY. No other text.
{"action": "your_final_action", "reasoning": "My decision is based on Priority Rule #..."}

**--- User Command ---**
"${voiceInput}"
<end_of_turn>
<start_of_turn>model`
},

DECISION_TREE_CLASSIFIER: {
    name: "Decision Tree Classifier",
    description: "명확한 우선순위와 단계별 질문을 통해 분류 정확도를 극대화하는 프롬프트",
    template: (voiceInput: string) => `<start_of_turn>user
You are a precise Korean voice command classifier. Follow this decision tree EXACTLY to determine the user's immediate intent.

**--- DECISION TREE ---**

**Step 1: Does the command contain a clear UI element for interaction?**
* Keywords: "버튼" (button), "링크" (link), "메뉴" (menu), "아이콘" (icon), "클릭" (click), "눌러" (press), "선택해" (select).
* If YES -> The action is **'simple_find'**. STOP HERE. This rule OVERRIDES ALL OTHERS.
* *Example: "구매 버튼 찾아줘"* -> Contains "버튼". It is 'simple_find'.
* *Example: "홈 버튼 눌러줘"* -> Contains "버튼". It is 'simple_find'.

**Step 2: If no UI element, is the command about purchasing or ordering?**
* Keywords: "구매" (purchase), "결제" (payment), "주문" (order), "장바구니" (cart), "사고싶어" (want to buy).
* If YES -> The action is **'purchase_flow'**.
* *Example: "결제 정보 입력해줘"* -> Contains "결제". It is 'purchase_flow'.

**Step 3: If not about purchasing, is it about price?**
* Keywords: "가격" (price), "얼마" (how much), "최저가" (lowest price), "할인" (discount).
* If YES -> The action is **'price_comparison'**.
* *Example: "아이폰 가격 비교해줘"* -> Contains "가격". It is 'price_comparison'.

**Step 4: If none of the above, is it about page navigation?**
* Keywords: "페이지" (page), "이동" (move), "뒤로" (back), "앞으로" (forward), "홈으로" (to home).
* If YES -> The action is **'navigation'**.
* *Example: "상품 페이지로 가줘"* -> Contains "페이지". It is 'navigation'.

**Step 5: If none of the above, assume it is a product search.**
* The action is **'product_search'**.
* *Example: "저렴한 노트북 보여줘"* -> Does not match steps 1-4. It is 'product_search'.

**--- RESPONSE FORMAT ---**
Respond ONLY with a valid JSON object.
{"action": "classified_action", "target": "relevant_keyword", "reasoning": "Briefly state which step led to the decision."}

**--- COMMAND ---**
"${voiceInput}"
<end_of_turn>
<start_of_turn>model`
}
,
FINAL_CHECK_REASONING: {
    name: "Final Check Reasoning",
    description: "사고 유도와 최종 검증 단계를 통해 실수를 최소화하는 가장 진보된 프롬프트",
    template: (voiceInput: string) => `<start_of_turn>user
You are an expert Korean voice command classifier. Your task is to identify the user's IMMEDIATE INTENT from the given command.

First, analyze the user's command and determine the most likely category from ["price_comparison", "purchase_flow", "simple_find", "navigation", "product_search"]. Write down your initial thought process.

Second, before giving the final JSON, check your answer against these **CRITICAL MISTAKE CHECKS**:

1.  **The "UI Element" Override Rule**: If the command contains UI-related words like "버튼", "링크", "메뉴", "클릭", "눌러줘", is your chosen action 'simple_find'? If not, you MUST correct it to 'simple_find'. This is the most important rule.
    * *Self-Correction Example*: My initial thought for "홈 버튼 눌러줘" was 'navigation', but it contains "버튼", so I must change it to 'simple_find'.

2.  **The "Price is Priority" Rule**: If the command explicitly asks about price with words like "가격", "얼마", "최저가", is your chosen action 'price_comparison'? If not, correct it.
    * *Self-Correction Example*: My initial thought for "아이폰 가격 비교" was 'product_search' because of "아이폰", but it contains "가격", so I must change it to 'price_comparison'.

3.  **The "Desire to Buy" Rule**: If the command expresses a desire like "사고싶어", is your chosen action 'purchase_flow'? An expression of desire is not a search.

After performing this self-correction, provide your final answer ONLY in a valid JSON format.

Command: "${voiceInput}"
<end_of_turn>
<start_of_turn>model`
}
,ULTIMATE_CLASSIFIER: {
    name: "Ultimate Classifier",
    description: "가장 성공적인 패턴인 명확한 규칙과 안티-패턴 예시를 결합한 최종 프롬프트",
    template: (voiceInput: string) => `<start_of_turn>user
You are an expert Korean voice command classifier. Your task is to select ONE category from the list based on the user's IMMEDIATE INTENT.
Categories: ["price_comparison", "purchase_flow", "simple_find", "navigation", "product_search"]

**--- RULES (IN ORDER OF PRIORITY) ---**

1.  **UI Interaction FIRST**: If the command contains UI words ("버튼", "링크", "메뉴", "클릭", "선택"), it is **'simple_find'**. This rule overrides all others.
2.  **Purchase Intent SECOND**: If the command contains purchase words ("구매", "결제", "주문", "장바구니", "사고싶어"), it is **'purchase_flow'**.
3.  **Price Question THIRD**: If the command contains price words ("가격", "얼마", "최저가"), it is **'price_comparison'**.

**--- EXAMPLES OF CORRECT CLASSIFICATION (CRITICAL!) ---**

* Command: "홈 버튼 눌러줘" -> Contains "버튼". Correct: **'simple_find'**. (Incorrect: 'navigation')
* Command: "아이폰 가격 비교해줘" -> Contains "가격". Correct: **'price_comparison'**. (Incorrect: 'product_search')
* Command: "저렴한 노트북 보여줘" -> Does not contain UI, purchase, or price words. Correct: **'product_search'**.
* Command: "이거 사고싶어" -> Contains "사고싶어". Correct: **'purchase_flow'**. (Incorrect: 'product_search')
* Command: "결제 페이지로 이동" -> Does not contain UI, purchase, or price words. It's about moving pages. Correct: **'navigation'**.

**--- YOUR TASK ---**
Now, classify the following command. Respond ONLY with a valid JSON object.

Command: "${voiceInput}"
<end_of_turn>
<start_of_turn>model`
},

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


} as const;

// 현재 사용할 프롬프트 설정
export const CURRENT_PROMPT = AI_PROMPTS.EXAMPLE_DRIVEN_CLASSIFIER;

// 프롬프트 전환 유틸리티
export function getPromptTemplate(promptName: keyof typeof AI_PROMPTS) {
  return AI_PROMPTS[promptName];
}