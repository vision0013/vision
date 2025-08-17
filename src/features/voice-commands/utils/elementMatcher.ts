import { CrawledItem } from "../../../types";
import { PriorityResolver } from "./priorityResolver";

export class ElementMatcher {
  private priorityResolver: PriorityResolver;

  constructor() {
    this.priorityResolver = new PriorityResolver();
  }

  findBestMatch(targetText: string, items: CrawledItem[]): CrawledItem | null {
    // 1단계: 텍스트 매칭으로 후보군 추출
    const candidates = this.findCandidates(targetText, items);
    
    if (candidates.length === 0) {
      console.log(`❌ No candidates found for "${targetText}"`);
      return null;
    }

    // 2단계: 우선순위 기반으로 최적 매치 선택
    const bestMatch = this.priorityResolver.selectBestMatch(candidates, targetText);
    
    if (bestMatch) {
      console.log(`✅ Best match for "${targetText}":`, {
        text: bestMatch.text || bestMatch.label || bestMatch.alt,
        type: bestMatch.type,
        role: bestMatch.role,
        tag: bestMatch.tag
      });
    }

    return bestMatch;
  }

  private findCandidates(targetText: string, items: CrawledItem[]): CrawledItem[] {
    const lowerTarget = targetText.toLowerCase();
    
    return items.filter(item => {
      // 텍스트 내용 매칭
      if (item.text?.toLowerCase().includes(lowerTarget)) {
        return true;
      }
      
      // 버튼 라벨 매칭
      if (item.label?.toLowerCase().includes(lowerTarget)) {
        return true;
      }
      
      // 이미지 alt 텍스트 매칭
      if (item.alt?.toLowerCase().includes(lowerTarget)) {
        return true;
      }
      
      // 이미지 title 매칭
      if (item.title?.toLowerCase().includes(lowerTarget)) {
        return true;
      }
      
      return false;
    });
  }

  // 정확히 일치하는 텍스트를 우선적으로 찾는 메서드
  findExactMatch(targetText: string, items: CrawledItem[]): CrawledItem | null {
    const lowerTarget = targetText.toLowerCase().trim();
    
    // 정확히 일치하는 항목 찾기
    const exactMatches = items.filter(item => {
      const itemText = (item.text || item.label || item.alt || "").toLowerCase().trim();
      return itemText === lowerTarget;
    });

    if (exactMatches.length > 0) {
      return this.priorityResolver.selectBestMatch(exactMatches, targetText);
    }

    // 정확한 매치가 없으면 일반 매칭으로 fallback
    return this.findBestMatch(targetText, items);
  }
}