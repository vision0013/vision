// AI 의도 → Content Script 액션 매핑 로직 (순수 함수)

import { ActionPayload } from '../types/background-types';
import { AIAnalysisResult, VoiceIntent } from '../../features/ai-inference/types/ai-types';

/**
 * AI 분석 결과를 Content Script가 실행할 수 있는 액션으로 매핑
 */
export function mapAIIntentToAction(
  aiResult?: AIAnalysisResult,
  oktjsResult?: any,
  command?: string
): ActionPayload {
  // AI 분석 결과가 있으면 우선 사용
  if (aiResult?.intent) {
    return mapAIIntent(aiResult.intent, command || '');
  }
  
  // oktjs 결과로 폴백
  if (oktjsResult) {
    return mapOktjsResult(oktjsResult, command || '');
  }
  
  // 마지막 폴백: 단순 텍스트 분석
  return mapSimpleText(command || '');
}

/**
 * AI 의도를 액션으로 변환
 */
function mapAIIntent(intent: VoiceIntent, command: string): ActionPayload {
  switch (intent.action) {
    case 'price_comparison':
      return {
        detectedAction: 'find',
        targetText: intent.product || extractPriceKeywords(command),
        originalCommand: command,
        confidence: intent.confidence
      };
      
    case 'product_search':
      return {
        detectedAction: 'input',
        targetText: intent.product || extractProductName(command),
        originalCommand: command,
        confidence: intent.confidence
      };
      
    case 'simple_find':
      return {
        detectedAction: 'click',
        targetText: intent.target || extractTargetElement(command),
        originalCommand: command,
        confidence: intent.confidence
      };
      
    case 'purchase_flow':
      return {
        detectedAction: 'click',
        targetText: intent.target || extractPurchaseElement(command),
        originalCommand: command,
        confidence: intent.confidence
      };
      
    case 'navigation':
      return {
        detectedAction: 'navigation',
        targetText: intent.target || extractNavigationDirection(command),
        direction: extractDirection(command),
        originalCommand: command,
        confidence: intent.confidence
      };
      
    default:
      return mapSimpleText(command);
  }
}

/**
 * oktjs 결과를 액션으로 변환 (기존 로직 활용)
 */
function mapOktjsResult(oktjsResult: any, command: string): ActionPayload {
  const { nouns, verbs } = oktjsResult;
  
  // 동사 기반 액션 결정
  if (verbs.some((v: string) => ['클릭', '눌러', '선택'].includes(v))) {
    return {
      detectedAction: 'click',
      targetText: nouns.join(' ') || extractTargetElement(command),
      originalCommand: command,
      confidence: 0.8
    };
  }
  
  if (verbs.some((v: string) => ['찾아', '검색', '탐색'].includes(v))) {
    return {
      detectedAction: 'find',
      targetText: nouns.join(' ') || extractTargetElement(command),
      originalCommand: command,
      confidence: 0.7
    };
  }
  
  if (verbs.some((v: string) => ['써', '입력', '타이핑'].includes(v))) {
    return {
      detectedAction: 'input',
      targetText: nouns.join(' ') || command.replace(/써줘|입력해줘/g, '').trim(),
      originalCommand: command,
      confidence: 0.8
    };
  }
  
  // 기본값: find
  return {
    detectedAction: 'find',
    targetText: nouns.join(' ') || extractTargetElement(command),
    originalCommand: command,
    confidence: 0.6
  };
}

/**
 * 단순 텍스트 분석 (최종 폴백)
 */
function mapSimpleText(command: string): ActionPayload {
  const lower = command.toLowerCase();
  
  // 클릭 패턴
  if (lower.includes('클릭') || lower.includes('눌러')) {
    return {
      detectedAction: 'click',
      targetText: extractTargetElement(command),
      originalCommand: command,
      confidence: 0.5
    };
  }
  
  // 입력 패턴
  if (lower.includes('써줘') || lower.includes('입력')) {
    return {
      detectedAction: 'input', 
      targetText: command.replace(/써줘|입력해줘|해줘/g, '').trim(),
      originalCommand: command,
      confidence: 0.5
    };
  }
  
  // 네비게이션 패턴
  if (lower.includes('뒤로') || lower.includes('이전') || lower.includes('다음')) {
    return {
      detectedAction: 'navigation',
      targetText: extractNavigationDirection(command),
      direction: extractDirection(command),
      originalCommand: command,
      confidence: 0.6
    };
  }
  
  // 기본값: find
  return {
    detectedAction: 'find',
    targetText: extractTargetElement(command),
    originalCommand: command,
    confidence: 0.4
  };
}

// ===== 텍스트 추출 유틸리티 함수들 =====

function extractPriceKeywords(command: string): string {
  const priceKeywords = ['최저가', '가격', '할인', '세일', '특가'];
  for (const keyword of priceKeywords) {
    if (command.includes(keyword)) return keyword;
  }
  return '가격';
}

function extractProductName(command: string): string {
  // "아이폰 15 찾아줘" → "아이폰 15"
  const match = command.match(/^(.+?)\s*(찾아줘|검색해줘|보여줘)/);
  return match ? match[1].trim() : command.replace(/찾아줘|검색해줘|보여줘/g, '').trim();
}

function extractTargetElement(command: string): string {
  // "로그인 버튼 클릭해줘" → "로그인"
  const patterns = [
    /(.+?)\s*(버튼|링크|메뉴)\s*(클릭|눌러)/,
    /(.+?)\s*(클릭|눌러|찾아)/,
    /(.+?)\s*(해줘|줘)/
  ];
  
  for (const pattern of patterns) {
    const match = command.match(pattern);
    if (match) return match[1].trim();
  }
  
  return command.replace(/해줘|줘|클릭|눌러/g, '').trim();
}

function extractPurchaseElement(command: string): string {
  if (command.includes('장바구니')) return '장바구니';
  if (command.includes('결제')) return '결제';
  if (command.includes('구매')) return '구매';
  if (command.includes('주문')) return '주문';
  return '구매';
}

function extractNavigationDirection(command: string): string {
  if (command.includes('뒤로') || command.includes('이전')) return '뒤로';
  if (command.includes('다음') || command.includes('앞으로')) return '다음';
  if (command.includes('홈')) return '홈';
  return '뒤로';
}

function extractDirection(command: string): 'up' | 'down' | null {
  if (command.includes('위로') || command.includes('상단')) return 'up';
  if (command.includes('아래') || command.includes('하단')) return 'down';
  return null;
}