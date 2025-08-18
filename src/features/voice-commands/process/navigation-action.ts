import { CrawledItem } from "../../../types";
import { VoiceCommandResult } from "../types/voice-types";
import { findBestMatch } from "./element-matcher";

export const navigationAction = (
  targetText: string, 
  items: CrawledItem[]
): VoiceCommandResult => {
  const lowerText = targetText.toLowerCase();
  
  // 네비게이션 명령 분석
  if (lowerText.includes('뒤로') || lowerText.includes('돌아가')) {
    if (window.history.length > 1) {
      window.history.back();
      return { type: "navigation_executed", action: "back" };
    }
    return { type: "not_found", message: "뒤로 갈 수 있는 페이지가 없습니다" };
  }
  
  if (lowerText.includes('앞으로') || lowerText.includes('다음')) {
    window.history.forward();
    return { type: "navigation_executed", action: "forward" };
  }
  
  if (lowerText.includes('새로고침') || lowerText.includes('리프레시') || lowerText.includes('갱신')) {
    window.location.reload();
    return { type: "navigation_executed", action: "refresh" };
  }
  
  if (lowerText.includes('닫기') || lowerText.includes('끄기') || lowerText.includes('종료')) {
    try {
      window.close();
      return { type: "navigation_executed", action: "close" };
    } catch (error) {
      return { type: "not_found", message: "창을 닫을 수 없습니다" };
    }
  }
  
  if (lowerText.includes('홈') || lowerText.includes('메인')) {
    const homeUrl = window.location.origin;
    window.location.href = homeUrl;
    return { type: "navigation_executed", action: "home" };
  }
  
  const urlPattern = /https?:\/\/[^\s]+/;
  const urlMatch = targetText.match(urlPattern);
  if (urlMatch) {
    window.location.href = urlMatch[0];
    return { type: "navigation_executed", action: "navigate_url" };
  }
  
  // 링크 요소 찾아서 클릭
  if (targetText && !['뒤로', '앞으로', '새로고침', '닫기', '홈'].some(keyword => lowerText.includes(keyword))) {
    // ✨ [수정] findBestMatch 호출 시 direction 인수로 null 전달
    const foundItem = findBestMatch(targetText, items, null);
    
    if (foundItem?.ownerId) {
      const element = document.querySelector(`[data-crawler-id="${foundItem.ownerId}"]`) as HTMLElement;
      if (element) {
        if (element.tagName === 'A' || element.closest('a')) {
          const linkElement = element.tagName === 'A' ? element : element.closest('a');
          if (linkElement) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            linkElement.click();
            return { type: "element_found", ownerId: foundItem.ownerId };
          }
        }
        
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.click();
        return { type: "element_found", ownerId: foundItem.ownerId };
      }
    }
  }
  
  return { type: "not_found", message: "해당 네비게이션 명령을 실행할 수 없습니다" };
};
