// src/ai-core/config/ai-prompts.ts

import { CrawledItem } from '../../../types';
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
  template: (voiceInput: string, examples: PromptExample[], crawledItems: CrawledItem[]) => string;
}

/**
 * ✨ [개선] 크롤링된 데이터를 AI 프롬프트에 맞게 요약하고 축소하는 헬퍼
 */
function formatCrawledItemsForPrompt(items: CrawledItem[]): string {
  const MAX_ITEMS_TO_SEND = 40;    // 전송 개수 대폭 감소
  const MAX_TEXT_LENGTH = 50;      // 텍스트 길이 추가 제한

  // 1. 상호작용 가능한 중요 요소 (input, button 등)를 우선적으로 필터링
  const priorityItems = items.filter(item => 
    !item.hidden && (item.type === 'button' || item.type === 'input' || item.type === 'textarea')
  );

  // 2. 그 외 클릭 가능한 링크나 텍스트 요소 필터링
  const otherItems = items.filter(item => 
    !item.hidden && 
    !(item.type === 'button' || item.type === 'input' || item.type === 'textarea') && 
    (item.isClickable || (item.text && item.text.length > 0))
  );

  // 3. 중요 요소 먼저, 그 다음 다른 요소 순으로 합치고 최대 개수 제한
  const combinedItems = [...priorityItems, ...otherItems].slice(0, MAX_ITEMS_TO_SEND);

  return combinedItems
    .map(item => {
      // ✨ [개선] 데이터 형식을 압축하여 토큰 사용량 최소화
      const parts: string[] = [];
      parts.push(`id:${item.id}`);
      parts.push(`t:${item.type}`);
      if (item.text) parts.push(`txt:"${item.text.substring(0, MAX_TEXT_LENGTH)}"`);
      if (item.label) parts.push(`l:"${item.label.substring(0, MAX_TEXT_LENGTH)}"`);
      if (item.isClickable) parts.push(`clk:t`);
      if (item.isInputtable) parts.push(`inpt:t`);
      return `{${parts.join(',')}}`;
    })
    .join(' '); // 줄바꿈 대신 공백으로 구분하여 토큰 추가 절약
}

export const AI_PROMPTS = {
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

export const CURRENT_PROMPT = AI_PROMPTS.AGENT_PLANNER;

export function getPromptTemplate(promptName: keyof typeof AI_PROMPTS) {
  return AI_PROMPTS[promptName];
}

export function getBaseExamples(): PromptExample[] {
  return promptExamples.baseExamples;
}