import { CrawledItem } from "../../../types";
import { selectBestMatch } from "./priority-resolver";

function findCandidates(targetText: string, items: CrawledItem[]): CrawledItem[] {
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

export function findBestMatch(targetText: string, items: CrawledItem[]): CrawledItem | null {
  // 1단계: 텍스트 매칭으로 후보군 추출
  const candidates = findCandidates(targetText, items);
  
  if (candidates.length === 0) {
    console.log(`❌ No candidates found for "${targetText}"`);
    return null;
  }

  // 2단계: 우선순위 기반으로 최적 매치 선택
  const bestMatch = selectBestMatch(candidates, targetText);
  
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

export function findExactMatch(targetText: string, items: CrawledItem[]): CrawledItem | null {
  const lowerTarget = targetText.toLowerCase().trim();
  
  // 정확히 일치하는 항목 찾기
  const exactMatches = items.filter(item => {
    const itemText = (item.text || item.label || item.alt || "").toLowerCase().trim();
    return itemText === lowerTarget;
  });

  if (exactMatches.length > 0) {
    return selectBestMatch(exactMatches, targetText);
  }

  // 정확한 매치가 없으면 일반 매칭으로 fallback
  return findBestMatch(targetText, items);
}