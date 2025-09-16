// src/ai-core/config/ai-prompts.ts

import { CrawledItem } from '../../../types';
import promptExamples from './prompt-examples.json';

export interface PromptExample {
  command: string;
  action: string;
  confidence: number;
  reasoning: string;
}

// ✨ [수정] template 시그니처에 crawledItems 추가
export interface PromptTemplate {
  name: string;
  description: string;
  template: (voiceInput: string, examples: PromptExample[], crawledItems: CrawledItem[]) => string;
}

// ✨ [신규] 크롤링된 데이터를 AI 프롬프트에 맞게 변환하는 헬퍼
function formatCrawledItemsForPrompt(items: CrawledItem[]): string {
  return items
    .filter(item => !item.hidden && (item.isClickable || item.isInputtable || (item.text && item.text.length > 0)))
    .map(item => {
      const parts: string[] = [];
      parts.push(`id: ${item.id}`);
      parts.push(`type: ${item.type}`);
      if (item.text) parts.push(`text: "${item.text}"`);
      if (item.label) parts.push(`label: "${item.label}"`);
      if (item.isClickable) parts.push(`clickable`);
      if (item.isInputtable) parts.push(`inputtable`);
      return `{ ${parts.join(', ')} }`;
    })
    .join('\n');
}

export const AI_PROMPTS = {
  // ✨ [신규] AI 에이전트 계획 프롬프트
  AGENT_PLANNER: {
    name: "Agent Planner",
    description: "사용자 명령과 현재 페이지의 DOM 요소를 바탕으로 행동 계획을 JSON 시퀀스로 생성합니다.",
    template: (voiceInput: string, _examples: PromptExample[], crawledItems: CrawledItem[]) => {
      const pageElements = formatCrawledItemsForPrompt(crawledItems);

      return `<start_of_turn>user
You are a helpful AI agent controlling a web browser. Your goal is to create a plan to fulfill the user's command based on the current state of the web page.

**CONTEXT: INTERACTABLE PAGE ELEMENTS**
Here are the interactable elements currently on the page. Each element has an 'id' you MUST use to target it.


${pageElements}

**TASK**
Based on the user's command, create a JSON object representing a sequence of actions.
The valid actions are: "CLICK", "INPUT", "NAVIGATE".

- For "CLICK", specify the target 'id' of the element to click.
- For "INPUT", specify the target 'id' and the 'value' to type.
- The output MUST be a JSON object with a "plan" key, which is an array of action steps.

**EXAMPLE**
User Command: "Search for smartphones"
Your Plan: { "plan": [{ "action": "INPUT", "id": 12, "value": "smartphones" }, { "action": "CLICK", "id": 13 }] }

**YOUR TURN**
User Command: "${voiceInput}"
Your Plan:
<end_of_turn>
<start_of_turn>model`;
    }
  },
} as const;

// 현재 사용할 프롬프트 설정
export const CURRENT_PROMPT = AI_PROMPTS.AGENT_PLANNER;

// 프롬프트 전환 유틸리티
export function getPromptTemplate(promptName: keyof typeof AI_PROMPTS) {
  return AI_PROMPTS[promptName];
}

// JSON 파일에서 기본 예시 로드
export function getBaseExamples(): PromptExample[] {
  return promptExamples.baseExamples;
}
