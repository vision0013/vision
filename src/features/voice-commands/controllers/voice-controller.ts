import { CrawledItem } from "../../../types";
import { VoiceCommandResult } from "../types/voice-types";
import { clickAction } from "../process/click-action";
import { findAction } from "../process/find-action";
import { scrollAction } from "../process/scroll-action";
import { inputAction } from "../process/input-action";
import { navigationAction } from "../process/navigation-action";

export function processVoiceCommand(command: string, items: CrawledItem[]): VoiceCommandResult {
  let lowerCommand = command.toLowerCase().trim();
  
  // 자연스러운 "XX" + "줘" 패턴을 "XX줘"로 합치기
  lowerCommand = lowerCommand.replace(/(써|해|보여|찾아)\s+줘/g, '$1줘');
  
  // 현재 구현된 액션만 포함
  const actionPatterns = [
    { keywords: ['클릭', '눌러', '버튼', '선택', '터치'], action: 'click' },
    { keywords: ['찾아', '검색', '보여', '표시'], action: 'find' },
    { keywords: ['스크롤', '내려', '올려', '아래로', '위로', '밑으로'], action: 'scroll' },
    { keywords: ['입력', '타이핑', '써줘', '써', '작성', '쳐'], action: 'input' },
    { keywords: ['뒤로', '앞으로', '돌아가', '이동', '가기'], action: 'navigation' },
    { keywords: ['새로고침', '리프레시', '갱신'], action: 'refresh' },
    { keywords: ['닫기', '끄기', '종료'], action: 'close' }
  ];
  
  let detectedAction = 'find'; // 기본값
  let targetText = lowerCommand;
  
  // 패턴 매칭
  for (const pattern of actionPatterns) {
    for (const keyword of pattern.keywords) {
      if (lowerCommand.includes(keyword)) {
        detectedAction = pattern.action;
        targetText = lowerCommand.replace(new RegExp(keyword, 'g'), '').trim();
        break;
      }
    }
    if (detectedAction !== 'find') break;
  }
  
  // 불용어 제거
  targetText = targetText.replace(/해줘|주세요|좀|을|를|에서|로|의|와|과|하고|그리고/g, '').trim();
  
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
      return inputAction(lowerCommand, items);
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