import { CrawledItem } from "../../../types";
import { VoiceCommandResult } from "../types/voice-types";
import { applyHighlightToElement } from "../../highlighting";
import { findBestMatch } from "./element-matcher";

// ✨ [수정] direction 파라미터 추가
export const findAction = (
  targetText: string, 
  items: CrawledItem[],
  direction: 'up' | 'down' | null
): VoiceCommandResult => {
  // ✨ [수정] findBestMatch에 direction 전달
  const foundItem = findBestMatch(targetText, items, direction);
  
  if (foundItem?.ownerId) {
    const element = document.querySelector(`[data-crawler-id="${foundItem.ownerId}"]`) as HTMLElement;
    if (element) {
      applyHighlightToElement(element);
      return { type: "element_found", ownerId: foundItem.ownerId };
    }
  }
  return { type: "not_found" };
};
