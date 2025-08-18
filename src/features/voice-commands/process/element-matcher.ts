import { CrawledItem } from "../../../types";
import { selectBestMatch } from "./priority-resolver";

function findCandidates(targetText: string, items: CrawledItem[]): CrawledItem[] {
  const lowerTarget = targetText.toLowerCase();
  
  return items.filter(item => {
    if (item.text?.toLowerCase().includes(lowerTarget)) return true;
    if (item.label?.toLowerCase().includes(lowerTarget)) return true;
    if (item.alt?.toLowerCase().includes(lowerTarget)) return true;
    if (item.title?.toLowerCase().includes(lowerTarget)) return true;
    return false;
  });
}

// ✨ [수정] direction 파라미터 추가
export function findBestMatch(
  targetText: string, 
  items: CrawledItem[], 
  direction: 'up' | 'down' | null
): CrawledItem | null {
  let candidates = findCandidates(targetText, items);
  
  if (candidates.length === 0 && targetText.includes(' ')) {
    const compactText = targetText.replace(/\s+/g, '');
    candidates = findCandidates(compactText, items);
  }
  
  if (candidates.length === 0 && !targetText.includes(' ')) {
    const spacedText = targetText.replace(/([가-힣])([가-힣])/g, '$1 $2');
    if (spacedText !== targetText) {
      candidates = findCandidates(spacedText, items);
    }
  }
  
  if (candidates.length === 0) {
    return null;
  }

  // ✨ [수정] selectBestMatch에 direction 전달
  const bestMatch = selectBestMatch(candidates, targetText, direction);
  
  if (bestMatch) {
    console.log(`✅ Best match for "${targetText}" (direction: ${direction || 'default'}):`, {
      text: bestMatch.text || bestMatch.label || bestMatch.alt,
      type: bestMatch.type,
      role: bestMatch.role,
      tag: bestMatch.tag
    });
  }

  return bestMatch;
}

// ✨ [수정] direction 파라미터 추가
export function findExactMatch(
  targetText: string, 
  items: CrawledItem[],
  direction: 'up' | 'down' | null
): CrawledItem | null {
  const lowerTarget = targetText.toLowerCase().trim();
  
  const exactMatches = items.filter(item => {
    const itemText = (item.text || item.label || item.alt || "").toLowerCase().trim();
    return itemText === lowerTarget;
  });

  if (exactMatches.length > 0) {
    // ✨ [수정] selectBestMatch에 direction 전달
    return selectBestMatch(exactMatches, targetText, direction);
  }

  // ✨ [수정] findBestMatch에 direction 전달
  return findBestMatch(targetText, items, direction);
}
