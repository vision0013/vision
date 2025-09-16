// src/ai-core/config/ai-prompts.ts

import { CrawledItem, Mode } from '../../../types';
import promptExamples from './prompt-examples.json';

// ✨ [수정] template 시그니처에 mode 추가
export interface PromptTemplate {
  name: string;
  description: string;
  template: (voiceInput: string, examples: any[], crawledItems: CrawledItem[], mode: Mode) => string;
}

function formatCrawledItemsForPrompt(items: CrawledItem[]): string {
  const MAX_TEXT_LENGTH = 50;

  return items
    .map(item => {
      const parts: string[] = [];
      parts.push(`id:${item.id}`);
      parts.push(`t:${item.type}`);
      if (item.text) parts.push(`txt:"${item.text.substring(0, MAX_TEXT_LENGTH)}"`);
      if (item.label) parts.push(`l:"${item.label.substring(0, MAX_TEXT_LENGTH)}"`);
      if (item.isClickable) parts.push(`clk:t`);
      if (item.isInputtable) parts.push(`inpt:t`);
      return `{${parts.join(',')}}`;
    })
    .join(' ');
}

export const AI_PROMPTS = {
  AGENT_PLANNER: {
    name: "Agent Planner",
    description: "사용자 명령과 현재 페이지의 DOM 요소를 바탕으로 행동 계획을 JSON 시퀀스로 생성합니다.",
    // ✨ [수정] template 함수가 mode를 받도록 변경
    template: (voiceInput: string, _examples: any[], crawledItems: CrawledItem[], mode: Mode) => {
      const pageElements = formatCrawledItemsForPrompt(crawledItems);

      // ✨ [수정] 프롬프트에 현재 모드 정보를 포함시켜 AI의 행동을 유도
      return `<start_of_turn>user
You are a helpful AI agent controlling a web browser. Your goal is to create a plan to fulfill the user's command based on the current state of the web page.

**CURRENT MODE: ${mode.toUpperCase()}**
- In 'navigate' mode, your primary goal is to find and click elements to navigate the page.
- In 'search' mode, your primary goal is to input text into search bars and submit.

**CONTEXT: INTERACTABLE PAGE ELEMENTS**
Here are the interactable elements currently on the page. Each element has an 'id' you MUST use to target it.

${pageElements}

**TASK**
Based on the user's command and the current mode, create a JSON object representing a sequence of actions.
The valid actions are: "CLICK", "INPUT", "NAVIGATE", "SCROLL".

**CRITICAL RULES (MUST FOLLOW OR SYSTEM WILL FAIL):**
1. Navigation commands (back, forward, refresh) MUST ALWAYS use "NAVIGATE" action, NOT DOM elements.
2. INPUT action is FORBIDDEN unless the element has "inpt:t" property. NEVER use INPUT on elements without "inpt:t".
3. CLICK action should be used for elements with "clk:t" property (buttons, links).
4. If search is requested but NO elements have "inpt:t" property, return EMPTY plan: { "plan": [] }.
5. VALIDATE: Before creating INPUT action, confirm the element has "inpt:t" property in the data above.

- For "CLICK", specify the target 'id' of a clickable element (must have "clk:t").
- For "INPUT", specify the target 'id' of an input field (must have "inpt:t") and the 'value' to type.
- For "NAVIGATE", specify 'type' for browser actions ("back", "forward", "refresh") - NO ID NEEDED.
- For "SCROLL", specify 'direction' ("up" or "down") and optionally 'target' id for specific element scrolling.
- The output MUST be a JSON object with a "plan" key, which is an array of action steps.

**EXAMPLES**
User Command: "Search for smartphones" (assuming elements {id:12,inpt:t} and {id:13,clk:t} exist)
Your Plan: { "plan": [{ "action": "INPUT", "id": 12, "value": "smartphones" }, { "action": "CLICK", "id": 13 }] }

User Command: "Search for smartphones" (when NO element has "inpt:t")
Your Plan: { "plan": [] }

User Command: "뒤로 가기" or "뒤로" or "back"
Your Plan: { "plan": [{ "action": "NAVIGATE", "type": "back" }] }

User Command: "앞으로 가기" or "앞으로" or "forward"
Your Plan: { "plan": [{ "action": "NAVIGATE", "type": "forward" }] }

User Command: "새로고침" or "refresh" or "리로드"
Your Plan: { "plan": [{ "action": "NAVIGATE", "type": "refresh" }] }

User Command: "아래로 스크롤해줘"
Your Plan: { "plan": [{ "action": "SCROLL", "direction": "down" }] }

**YOUR TURN**
User Command: "${voiceInput}"
Your Plan:
<end_of_turn>
<start_of_turn>model`;
    }
  },

  CHAT_ASSISTANT: {
    name: "Chat Assistant",
    description: "사용자와 자연스러운 대화를 나누는 채팅 어시스턴트입니다. 명령 수행이 아닌 대화만 진행합니다.",
    template: (userInput: string, _examples: any[], _crawledItems: CrawledItem[], _mode: Mode) => {
      return `<start_of_turn>user
당신은 친근하고 도움이 되는 AI 채팅 어시스턴트입니다. 사용자와 자연스러운 대화를 나누세요.

**중요 규칙:**
1. 웹 페이지 조작이나 명령 수행을 하지 마세요
2. JSON 형식이 아닌 자연스러운 텍스트로 답변하세요
3. 친근하고 도움이 되는 톤으로 대화하세요
4. 질문에 대해 정확하고 유용한 정보를 제공하세요

사용자 메시지: "${userInput}"

당신의 답변:
<end_of_turn>
<start_of_turn>model`;
    }
  },
} as const;

export const CURRENT_PROMPT = AI_PROMPTS.AGENT_PLANNER;

export function getPromptTemplate(promptName: keyof typeof AI_PROMPTS) {
  return AI_PROMPTS[promptName];
}

export function getBaseExamples(): any[] {
  return promptExamples.baseExamples;
}