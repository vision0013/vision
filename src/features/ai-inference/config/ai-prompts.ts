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
 * ✨ [리팩터링] 전달받은 아이템 목록을 AI 프롬프트 형식으로 변환만 수행
 */
function formatCrawledItemsForPrompt(items: CrawledItem[]): string {
  const MAX_TEXT_LENGTH = 50; // 텍스트 길이는 계속 제한

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
