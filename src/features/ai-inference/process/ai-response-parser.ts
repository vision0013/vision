import { VoiceIntent, AIAnalysisResult } from '../types/ai-types';

/**
 * AI 응답 파싱 및 폴백 처리
 */
export class AIResponseParser {
  /**
   * AI 응답을 파싱하여 AIAnalysisResult로 변환
   */
  static parseAIResponse(response: string, originalCommand: string): AIAnalysisResult {
    try {
      console.log('🔍 [ai-response-parser] Raw AI response:', response);

      const firstBrace = response.indexOf('{');
      const lastBrace = response.lastIndexOf('}');

      if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
        console.warn('⚠️ [ai-response-parser] No valid JSON object found in response, using fallback.');
        const fallbackAction = this.guessActionFromText(originalCommand);
        const intent: VoiceIntent = {
          action: fallbackAction,
          confidence: 0.8,
          reasoning: 'Fallback analysis (No JSON found)'
        };
        return { intent };
      }

      let jsonString = response.substring(firstBrace, lastBrace + 1);

      // JSON 정리 로직
      jsonString = this.sanitizeJsonString(jsonString);

      const parsedResponse = JSON.parse(jsonString);

      const intent: VoiceIntent = {
        action: parsedResponse.action || 'unknown',
        product: parsedResponse.product,
        target: parsedResponse.target,
        detail: parsedResponse.detail,
        confidence: parsedResponse.confidence ?? 0.8,
        reasoning: parsedResponse.reasoning ?? 'AI analysis complete'
      };

      return {
        intent
      };
    } catch (error: any) {
      console.error('❌ [ai-response-parser] Failed to parse AI response:', error);
      console.error('❌ [ai-response-parser] Response was:', response);

      // fallback 처리
      const fallbackAction = this.guessActionFromText(originalCommand);
      const intent: VoiceIntent = {
        action: fallbackAction,
        confidence: 0.7,
        reasoning: 'Fallback analysis (JSON parsing failed)'
      };
      return { intent };
    }
  }

  /**
   * JSON 문자열 정리
   */
  private static sanitizeJsonString(jsonString: string): string {
    try {
      // reasoning 값 내부의 따옴표 문제 해결
      const reasoningMatch = jsonString.match(/"reasoning":\s*"([^"]*(?:"[^"]*"[^"]*)*[^"]*)"/);
      if (reasoningMatch) {
        const originalReasoning = reasoningMatch[1];
        // 내부 따옴표를 작은따옴표로 변경
        const cleanReasoning = originalReasoning.replace(/"/g, "'");
        jsonString = jsonString.replace(reasoningMatch[0], `"reasoning": "${cleanReasoning}"`);
      }

      // 기타 일반적인 JSON 오류 수정
      jsonString = jsonString.replace(/[\r\n\t]/g, ' '); // 개행문자 제거
      jsonString = jsonString.replace(/,\s*}/g, '}');    // 마지막 콤마 제거

      console.log('🔧 [ai-response-parser] Sanitized JSON:', jsonString);
      return jsonString;
    } catch (error) {
      console.warn('⚠️ [ai-response-parser] JSON sanitization failed:', error);
      return jsonString; // 원본 반환
    }
  }

  /**
   * 폴백 분석 - 텍스트 기반 의도 추정
   */
  private static guessActionFromText(text: string): VoiceIntent['action'] {
    const lower = text.toLowerCase();
    console.log('🔍 [ai-response-parser] Fallback analysis for:', lower);

    if ((lower.includes('아이폰') || lower.includes('갤럭시') || lower.includes('노트북')) &&
        (lower.includes('찾아') || lower.includes('검색'))) {
      return 'product_search';
    }
    if (lower.includes('최저가') || lower.includes('가격') || lower.includes('비교')) return 'price_comparison';
    if (lower.includes('버튼') || lower.includes('클릭') || lower.includes('눌러')) return 'simple_find';
    if (lower.includes('장바구니') || lower.includes('구매') || lower.includes('결제')) return 'purchase_flow';
    if (lower.includes('이전') || lower.includes('뒤로') || lower.includes('이동')) return 'navigation';
    if (lower.includes('찾아') || lower.includes('검색')) return 'product_search';

    return 'unknown';
  }
}