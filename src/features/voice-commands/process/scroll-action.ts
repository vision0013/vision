import { CrawledItem } from "@/types";
import { VoiceCommandResult } from "../types/voice-types";
import { findBestMatch } from "./element-matcher";

// ✨ [수정] direction 파라미터를 받도록 함수 시그니처 변경
export const scrollAction = (
  targetText: string, 
  items: CrawledItem[],
  direction: 'up' | 'down' | null 
): VoiceCommandResult => {

  // Case 1: 스크롤할 특정 대상이 명시된 경우 ("더보기로 스크롤")
  if (targetText) {
    // findBestMatch는 이제 direction을 받아 "위쪽 더보기" 같은 명령도 처리 가능
    const foundItem = findBestMatch(targetText, items, direction);
    
    if (foundItem?.ownerId) {
      const element = document.querySelector(`[data-crawler-id="${foundItem.ownerId}"]`) as HTMLElement;
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return { type: "element_found", ownerId: foundItem.ownerId };
      }
    }
  }
  
  // Case 2: 특정 대상 없이 일반적인 페이지 스크롤을 하는 경우 ("아래로 스크롤")
  const scrollDirection = direction || 'down'; // direction이 없으면 기본값 'down'
  const scrollDistance = 300;
  const currentY = window.scrollY;
  const targetY = scrollDirection === 'up' ? currentY - scrollDistance : currentY + scrollDistance;
  
  window.scrollTo({
    top: Math.max(0, targetY),
    behavior: 'smooth'
  });
  
  return { type: "scroll_executed", direction: scrollDirection };
};
