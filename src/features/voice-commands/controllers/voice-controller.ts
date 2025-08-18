import { CrawledItem } from "../../../types";
import { VoiceCommandResult } from "../types/voice-types";
import { clickAction } from "../process/click-action";
import { findAction } from "../process/find-action";

export function processVoiceCommand(command: string, items: CrawledItem[]): VoiceCommandResult {
  const lowerCommand = command.toLowerCase();
  
  // 핵심 키워드 추출
  let actionKeyword = '';
  let targetText = lowerCommand;

  if (lowerCommand.includes('클릭')) {
    actionKeyword = '클릭';
    targetText = lowerCommand.replace(/클릭/g, '').trim();
  } else if (lowerCommand.includes('버튼')) {
    actionKeyword = '버튼';
    targetText = lowerCommand.replace(/버튼/g, '').trim();
  } else if (lowerCommand.includes('눌러')) {
    actionKeyword = '눌러';
    targetText = lowerCommand.replace(/눌러/g, '').trim();
  } else if (lowerCommand.includes('찾아줘')) {
    actionKeyword = '찾아줘';
    targetText = lowerCommand.replace(/찾아줘/g, '').trim();
  }

  if (!targetText) {
    return { type: "not_found" };
  }

  // 스위치 케이스로 각 액션 파일의 메서드 호출
  switch (actionKeyword) {
    case '클릭':
    case '버튼':  
    case '눌러':
      return clickAction(targetText, items);
        
    case '찾아줘':
      return findAction(targetText, items);
        
    default:
      return findAction(targetText, items);
  }
}