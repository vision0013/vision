import { CrawledItem } from "../../types";
import { HighlightManager } from "../highlighting"; // 👈 추가

import { clickAction } from "./actions/clickAction";
import { findAction } from "./actions/findAction";

export type VoiceCommandResult = 
  | { type: "element_found"; ownerId: number }
  | { type: "scroll_executed"; direction: string }
  | { type: "navigation_executed"; action: string }
  | { type: "not_found" };

export class VoiceCommandProcessor {
    private highlightManager: HighlightManager; // 👈 추가

      // 👈 생성자에서 HighlightManager 인스턴스를 받음
  constructor(highlightManager: HighlightManager) {
    this.highlightManager = highlightManager;
  }
  processCommand(command: string, items: CrawledItem[]): VoiceCommandResult {
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
        return findAction(targetText, items, this.highlightManager);
          
      default:
        return findAction(targetText, items, this.highlightManager);
    }
  }
}