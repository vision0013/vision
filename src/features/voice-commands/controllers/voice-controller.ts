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
  
  // ✨ [수정] 방향성 키워드 분석 로직 추가
  let direction: 'up' | 'down' | null = null;
  const directionWords = {
    up: ['위', '위쪽', '상단'],
    down: ['아래', '아래쪽', '하단']
  };

  for (const key in directionWords) {
    for (const word of directionWords[key as keyof typeof directionWords]) {
      if (processedCommand.includes(word)) {
        direction = key as 'up' | 'down';
        processedCommand = processedCommand.replace(word, '').trim(); // 타겟 텍스트에서 방향 키워드 제거
        break;
      }
    }
    if (direction) break;
  }
  
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
        targetText = processedCommand
          .replace(keyword, '')
          .replace(/해줘/g, '')
          .replace(/주세요/g, '')
          .replace(/\s줄(\s|$)/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        console.log(`✅ Action: ${detectedAction}, target: "${targetText}", direction: ${direction}`);
        break;
      }
    }
    if (detectedAction !== 'find') break;
  }
  
  targetText = targetText
    .replace(/해줘|주세요|좀|을|를|에서|로|의|와|과|하고|그리고/g, '')
    .replace(/\s줄(\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
    
  if (!targetText && ['input', 'navigation', 'scroll'].includes(detectedAction)) {
    // targetText가 없어도 실행 가능한 액션들
  } else if (!targetText) {
    return { type: "not_found" };
  }
  
  // 액션 실행
  switch (detectedAction) {
    case 'click':
      // ✨ [수정] direction 파라미터 전달
      return clickAction(targetText, items, direction);
    case 'find':
      // ✨ [수정] direction 파라미터 전달
      return findAction(targetText, items, direction);
    case 'scroll':
      return scrollAction(targetText || lowerCommand, items);
    case 'input':
      return inputAction(command, items);
    case 'navigation':
      return navigationAction(targetText || lowerCommand, items);
    default:
      // ✨ [수정] direction 파라미터 전달
      return findAction(targetText, items, direction);
  }
}
