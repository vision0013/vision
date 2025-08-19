import { CrawledItem } from "@/types";
import { VoiceCommandResult } from "../types/voice-types";
import { clickAction } from "../process/click-action";
import { findAction } from "../process/find-action";
import { scrollAction } from "../process/scroll-action";
import { inputAction } from "../process/input-action";
import { navigationAction } from "../process/navigation-action";

// ✨ [개선] 함수에 전달될 파라미터를 위한 인터페이스 정의
interface CommandPayload {
  detectedAction: string;
  targetText: string;
  direction: 'up' | 'down' | null;
  originalCommand: string;
  items: CrawledItem[];
}

/**
 * background.ts에서 미리 분석된 명령어 정보를 받아,
 * 적절한 액션 함수를 호출하는 라우터 역할을 합니다.
 * @param payload 명령어 분석 결과가 담긴 객체
 * @returns VoiceCommandResult 액션 실행 결과
 */
export function processVoiceCommand(payload: CommandPayload): VoiceCommandResult {
  // ✨ [개선] 객체에서 필요한 정보를 바로 구조 분해 할당하여 사용
  const { detectedAction, targetText, direction, originalCommand, items } = payload;

  console.log(`✅ [CONTROLLER] Executing: ${detectedAction}, Target: "${targetText}", Direction: ${direction}`);

  if (!targetText && ['click', 'find'].includes(detectedAction)) {
    return { type: "not_found", message: "대상을 찾을 수 없습니다." };
  }

  switch (detectedAction) {
    case 'click':
      return clickAction(targetText, items, direction);
    
    case 'find':
      return findAction(targetText, items, direction);
    
    case 'scroll':
      return scrollAction(targetText, items, direction);
    
    case 'input':
      return inputAction(originalCommand, items);
    
    case 'navigation':
      return navigationAction(targetText || originalCommand, items);
    
    default:
      return findAction(targetText, items, direction);
  }
}
