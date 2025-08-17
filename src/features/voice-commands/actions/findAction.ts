import { CrawledItem } from "../../../types";
import { VoiceCommandResult } from "../index";
import { ElementMatcher } from "../utils/elementMatcher";

export const findAction = (
  targetText: string, 
  items: CrawledItem[]
): VoiceCommandResult => {
  const matcher = new ElementMatcher();
  const foundItem = matcher.findBestMatch(targetText, items);
  
  if (foundItem?.ownerId) {
    // 하이라이트만 (클릭하지 않음)
    const element = document.querySelector(`[data-crawler-id="${foundItem.ownerId}"]`) as HTMLElement;
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.style.outline = '3px solid #007AFF';
      element.style.boxShadow = '0 0 15px rgba(0, 122, 255, 0.5)';
      
      // 2.5초 후 하이라이트 제거
      setTimeout(() => {
        element.style.outline = '';
        element.style.boxShadow = '';
      }, 2500);
      
      return { type: "element_found", ownerId: foundItem.ownerId };
    }
  }
  return { type: "not_found" };
};