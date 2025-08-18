import { CrawledItem } from "../../../types";
import { VoiceCommandResult } from "../types/voice-types";
import { findBestMatch } from "./element-matcher";

export const scrollAction = (
  targetText: string, 
  items: CrawledItem[]
): VoiceCommandResult => {
  const lowerText = targetText.toLowerCase();
  let direction = 'down';
  
  if (lowerText.includes('위') || lowerText.includes('올려') || lowerText.includes('업')) {
    direction = 'up';
  } else if (lowerText.includes('아래') || lowerText.includes('내려') || lowerText.includes('다운')) {
    direction = 'down';
  }
  
  // 특정 요소로 스크롤하는 경우
  if (targetText && !['위', '아래', '올려', '내려', '위로', '아래로'].some(keyword => lowerText.includes(keyword))) {
    // ✨ [수정] findBestMatch 호출 시 direction 인수로 null 전달
    const foundItem = findBestMatch(targetText, items, null);
    
    if (foundItem?.ownerId) {
      const element = document.querySelector(`[data-crawler-id="${foundItem.ownerId}"]`) as HTMLElement;
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return { type: "element_found", ownerId: foundItem.ownerId };
      }
    }
  }
  
  // 일반 페이지 스크롤
  const scrollDistance = 300;
  const currentY = window.scrollY;
  const targetY = direction === 'up' ? currentY - scrollDistance : currentY + scrollDistance;
  
  window.scrollTo({
    top: Math.max(0, targetY),
    behavior: 'smooth'
  });
  
  return { type: "scroll_executed", direction };
};
