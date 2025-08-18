import { CrawledItem } from "../../../types";
import { VoiceCommandResult } from "../types/voice-types";
import { clickAction } from "../process/click-action";
import { findAction } from "../process/find-action";
import { scrollAction } from "../process/scroll-action";
import { inputAction } from "../process/input-action";
import { navigationAction } from "../process/navigation-action";

export function processVoiceCommand(command: string, items: CrawledItem[]): VoiceCommandResult {
  let lowerCommand = command.toLowerCase().trim();
  
  let processedCommand = lowerCommand;
  
  // 향상된 키워드 기반 의도 분석
  let detectedAction = 'find'; // 기본값
  let targetText = processedCommand;
  
  const simplePatterns = [
    { keywords: ['써줘', '써', '입력해줘', '입력', '타이핑'], action: 'input' },
    { keywords: ['클릭해줘', '클릭', '눌러줘', '눌러'], action: 'click' },
    { keywords: ['찾아줘', '찾아', '검색해줘', '검색'], action: 'find' },
    { keywords: ['스크롤해줘', '스크롤', '내려줘', '올려줘'], action: 'scroll' }
  ];
  
  for (const pattern of simplePatterns) {
    for (const keyword of pattern.keywords) {
      if (processedCommand.includes(keyword)) {
        detectedAction = pattern.action;
        // 키워드와 관련 패턴 모두 제거
        targetText = processedCommand
          .replace(keyword, '')
          .replace(/해줘/g, '')
          .replace(/주세요/g, '')
          .replace(/\s줄(\s|$)/g, ' ')  // "써 줄" → "써"로 인식된 경우만 "줄" 제거 (단어 경계)
          .replace(/\s+/g, ' ')  // 중복 공백 정리
          .trim();
        
        console.log(`✅ Action: ${detectedAction}, target: "${targetText}"`);
        break;
      }
    }
    if (detectedAction !== 'find') break;
  }
  
  // 추가 불용어 제거 및 정리
  targetText = targetText
    .replace(/해줘|주세요|좀|을|를|에서|로|의|와|과|하고|그리고/g, '')
    .replace(/\s줄(\s|$)/g, ' ')  // "써 줄" 형태에서만 "줄" 제거
    .replace(/\s+/g, ' ')  // 중복 공백 정리
    .trim();
    
  
  // 타겟이 비어있는 경우 처리
  if (!targetText && detectedAction === 'input') {
    console.log('⚠️ Empty target for input command, using placeholder');
    targetText = '텍스트';  // 기본 입력 텍스트
  }
  
  if (!targetText && ['input', 'navigation', 'scroll'].includes(detectedAction)) {
    // 이런 액션들은 targetText가 없어도 실행 가능
  } else if (!targetText) {
    return { type: "not_found" };
  }
  
  // 액션 실행
  switch (detectedAction) {
    case 'click':
      return clickAction(targetText, items);
    case 'find':
      return findAction(targetText, items);
    case 'scroll':
      return scrollAction(targetText || lowerCommand, items);
    case 'input':
      return inputAction(command, items);
    case 'navigation':
      return navigationAction(targetText || lowerCommand, items);
    case 'refresh':
      return navigationAction('새로고침 ' + lowerCommand, items);
    case 'close':
      return navigationAction('닫기 ' + lowerCommand, items);
    default:
      return findAction(targetText, items);
  }
}