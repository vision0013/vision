// AI 출력을 voice-commands 액션 시퀀스로 변환하는 매퍼

import { AIAnalysisResult } from '../../ai-inference/types/ai-types';

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
 * AI 분석 결과를 voice-commands 액션 시퀀스로 변환
 */
export function mapAIToVoiceActions(aiResult: AIAnalysisResult, userInput: string): VoiceActionSequence {
  console.log(`🔄 [ai-action-mapper] Converting AI result to voice actions: ${aiResult.intent.action}`);

  const sequence: VoiceActionSequence = {
    steps: [],
    description: `${userInput} → ${aiResult.intent.action}`,
    confidence: aiResult.intent.confidence
  };

  switch (aiResult.intent.action) {
    case "product_search":
      sequence.steps = generateProductSearchSteps(userInput);
      break;

    case "simple_find":
      sequence.steps = generateSimpleFindSteps(userInput);
      break;

    case "purchase_flow":
      sequence.steps = generatePurchaseFlowSteps(userInput);
      break;

    case "navigation":
      sequence.steps = generateNavigationSteps(userInput);
      break;

    case "price_comparison":
      sequence.steps = generatePriceComparisonSteps(userInput);
      break;

    default:
      console.warn(`⚠️ [ai-action-mapper] Unknown AI action: ${aiResult.intent.action}`);
      sequence.steps = generateFallbackSteps(userInput);
  }

  console.log(`✅ [ai-action-mapper] Generated ${sequence.steps.length} voice action steps`);
  return sequence;
}

/**
 * 제품 검색 액션 시퀀스 생성
 * 예: "아이폰17 찾아줘" → [검색창 찾기, 텍스트 입력, 검색 버튼 클릭]
 */
function generateProductSearchSteps(userInput: string): VoiceActionStep[] {
  // 사용자 입력에서 제품명 추출 (간단한 패턴 매칭)
  const productName = extractProductName(userInput);

  return [
    {
      action: "find_action",
      target: "검색창",
      priority: "high",
      waitFor: 500
    },
    {
      action: "input_action",
      value: productName,
      priority: "high",
      waitFor: 300
    },
    {
      action: "click_action",
      target: "검색",
      priority: "high",
      waitFor: 1000
    }
  ];
}

/**
 * 단순 UI 요소 찾기/클릭
 * 예: "로그인 버튼 클릭해줘" → [로그인 버튼 찾기, 클릭]
 */
function generateSimpleFindSteps(userInput: string): VoiceActionStep[] {
  // 사용자 입력에서 타겟 요소 추출
  const target = extractTargetElement(userInput);

  if (userInput.includes("클릭") || userInput.includes("눌러") || userInput.includes("누르")) {
    return [
      {
        action: "find_action",
        target: target,
        priority: "high",
        waitFor: 300
      },
      {
        action: "click_action",
        target: target,
        priority: "high",
        waitFor: 500
      }
    ];
  } else {
    // 단순히 찾기만
    return [
      {
        action: "find_action",
        target: target,
        priority: "high"
      }
    ];
  }
}

/**
 * 구매 플로우 액션 시퀀스
 * 예: "장바구니에 담아줘" → [장바구니 버튼 찾기, 클릭]
 */
function generatePurchaseFlowSteps(userInput: string): VoiceActionStep[] {
  if (userInput.includes("장바구니") || userInput.includes("카트")) {
    return [
      {
        action: "find_action",
        target: "장바구니",
        priority: "high",
        waitFor: 300
      },
      {
        action: "click_action",
        target: "장바구니",
        priority: "high",
        waitFor: 800
      }
    ];
  } else if (userInput.includes("결제") || userInput.includes("주문") || userInput.includes("구매")) {
    return [
      {
        action: "find_action",
        target: "결제하기",
        priority: "high",
        waitFor: 300
      },
      {
        action: "click_action",
        target: "결제하기",
        priority: "high",
        waitFor: 1000
      }
    ];
  }

  // 기본 구매 플로우
  return [
    {
      action: "find_action",
      target: "구매하기",
      priority: "high",
      waitFor: 300
    },
    {
      action: "click_action",
      target: "구매하기",
      priority: "high"
    }
  ];
}

/**
 * 네비게이션 액션 시퀀스
 * 예: "뒤로 가줘" → [뒤로가기 실행]
 */
function generateNavigationSteps(userInput: string): VoiceActionStep[] {
  if (userInput.includes("뒤로") || userInput.includes("이전")) {
    return [
      {
        action: "navigation_action",
        target: "back",
        priority: "high"
      }
    ];
  } else if (userInput.includes("앞으로")) {
    return [
      {
        action: "navigation_action",
        target: "forward",
        priority: "high"
      }
    ];
  } else if (userInput.includes("홈") || userInput.includes("메인")) {
    return [
      {
        action: "navigation_action",
        target: "home",
        priority: "high"
      }
    ];
  }

  // 기본 뒤로가기
  return [
    {
      action: "navigation_action",
      target: "back",
      priority: "high"
    }
  ];
}

/**
 * 가격 비교 액션 시퀀스
 * 예: "최저가 알려줘" → [가격 정보 찾기]
 */
function generatePriceComparisonSteps(_userInput: string): VoiceActionStep[] {
  return [
    {
      action: "find_action",
      target: "가격",
      priority: "high",
      waitFor: 500
    },
    {
      action: "find_action",
      target: "최저가",
      priority: "medium"
    }
  ];
}

/**
 * 알 수 없는 명령에 대한 기본 처리
 */
function generateFallbackSteps(userInput: string): VoiceActionStep[] {
  return [
    {
      action: "find_action",
      target: userInput,
      priority: "low"
    }
  ];
}

/**
 * 사용자 입력에서 제품명 추출
 * 예: "아이폰17 찾아줘" → "아이폰17"
 */
function extractProductName(userInput: string): string {
  // 불필요한 단어들 제거
  const cleanInput = userInput
    .replace(/찾아줘|검색해줘|보여줘|검색/g, '')
    .trim();

  return cleanInput || userInput;
}

/**
 * 사용자 입력에서 타겟 UI 요소 추출
 * 예: "로그인 버튼 클릭해줘" → "로그인"
 */
function extractTargetElement(userInput: string): string {
  // 액션 관련 단어들 제거하고 핵심 요소만 추출
  const cleanInput = userInput
    .replace(/클릭해줘|눌러줘|누르|찾아줘|버튼|링크|아이콘/g, '')
    .trim();

  return cleanInput || userInput;
}