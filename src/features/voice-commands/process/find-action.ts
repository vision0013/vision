import { CrawledItem } from "../../../types";
import { VoiceCommandResult } from "../types/voice-types";
import { HighlightManager } from "../../highlighting";
import { ElementMatcher } from "./element-matcher";

export const findAction = (
  targetText: string, 
  items: CrawledItem[],
    highlightManager: HighlightManager // 👈 HighlightManager를 인자로 받음

): VoiceCommandResult => {
  const matcher = new ElementMatcher();
  const foundItem = matcher.findBestMatch(targetText, items);
  
 if (foundItem?.ownerId) {
    const element = document.querySelector(`[data-crawler-id="${foundItem.ownerId}"]`) as HTMLElement;
    if (element) {
      // 👇 HighlightManager를 사용하여 하이라이트 적용
      highlightManager.apply(element);
      return { type: "element_found", ownerId: foundItem.ownerId };
    }
  }
  return { type: "not_found" };
};