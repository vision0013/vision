import { CrawledItem } from "../../../types";
import { VoiceCommandResult } from "../types/voice-types";
import { ElementMatcher } from "./element-matcher";

export const clickAction = (
  targetText: string, 
  items: CrawledItem[]
): VoiceCommandResult => {
  const matcher = new ElementMatcher();
  const foundItem = matcher.findBestMatch(targetText, items);
  
  if (foundItem?.ownerId) {
    // 직접 DOM 요소 찾아서 클릭
    const element = document.querySelector(`[data-crawler-id="${foundItem.ownerId}"]`) as HTMLElement;
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.click();
      return { type: "element_found", ownerId: foundItem.ownerId };
    }
  }
  return { type: "not_found" };
};