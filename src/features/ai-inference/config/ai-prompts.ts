// src/ai-core/config/ai-prompts.ts

import { CrawledItem, Mode } from '../../../types';
import promptExamples from './prompt-examples.json';

export interface PromptExample {
  command: string;
  action: string;
  confidence: number;
  reasoning: string;
}

// ✨ [수정] template 시그니처에 mode 추가
export interface PromptTemplate {
  name: string;
  description: string;
  template: (voiceInput: string, examples: PromptExample[], crawledItems: CrawledItem[], mode: Mode) => string;
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
    template: (voiceInput: string, _examples: PromptExample[], crawledItems: CrawledItem[], mode: Mode) => {
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

**IMPORTANT: Navigation commands (back, forward, refresh) should ALWAYS use "NAVIGATE" action, NOT DOM elements.**

- For "CLICK", specify the target 'id' of the element to click.
- For "INPUT", specify the target 'id' and the 'value' to type.
- For "NAVIGATE", specify 'type' for browser actions ("back", "forward", "refresh") - NO ID NEEDED.
- For "SCROLL", specify 'direction' ("up" or "down") and optionally 'target' id for specific element scrolling.
- The output MUST be a JSON object with a "plan" key, which is an array of action steps.

**EXAMPLES**
User Command: "Search for smartphones"
Your Plan: { "plan": [{ "action": "INPUT", "id": 12, "value": "smartphones" }, { "action": "CLICK", "id": 13 }] }

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
} as const;

export const CURRENT_PROMPT = AI_PROMPTS.AGENT_PLANNER;

export function getPromptTemplate(promptName: keyof typeof AI_PROMPTS) {
  return AI_PROMPTS[promptName];
}

export function getBaseExamples(): PromptExample[] {
  return promptExamples.baseExamples;
}