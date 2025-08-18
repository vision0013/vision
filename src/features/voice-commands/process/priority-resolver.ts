import { CrawledItem } from "../../../types";
import { ELEMENT_PRIORITIES, PriorityConfig } from "../config/priorities";

export interface ScoredItem {
  item: CrawledItem;
  score: number;
  breakdown: {
    typeScore: number;
    roleScore: number;
    keywordScore: number;
    positionScore: number;
    total: number;
  };
}

function getTypeScore(config: PriorityConfig, item: CrawledItem): number {
  return config.type[item.type] || 0;
}

function getRoleScore(config: PriorityConfig, item: CrawledItem): number {
  return config.role[item.role] || 0;
}

function getKeywordScore(config: PriorityConfig, item: CrawledItem, targetText: string): number {
  const lowerTarget = targetText.toLowerCase();
  for (const [keyword, keywordConfig] of Object.entries(config.keywords)) {
    if (lowerTarget.includes(keyword.toLowerCase())) {
      let bonus = keywordConfig.weight;
      if (keywordConfig.preferredType && item.type === keywordConfig.preferredType) bonus += 50;
      if (keywordConfig.preferredRole && item.role === keywordConfig.preferredRole) bonus += 50;
      return bonus;
    }
  }
  return 0;
}

// ✨ [수정] direction 파라미터를 받아서 위치 점수를 동적으로 계산
function getPositionScore(item: CrawledItem, direction: 'up' | 'down' | null): number {
  const rect = item.rect;
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  
  const bottom = rect.top + rect.height;
  const right = rect.left + rect.width;
  
  const isInViewport = (
    rect.top < viewportHeight && bottom > 0 &&
    rect.left < viewportWidth && right > 0
  );
  
  // 1. 뷰포트 밖에 있으면 0점 (후보 탈락)
  if (!isInViewport) {
    return 0;
  }
  
  // 2. direction 값에 따라 점수 계산 방식 변경
  if (direction === 'down') {
    // "아래쪽" 명령: Y좌표가 클수록 (화면 아래에 있을수록) 높은 점수
    return rect.top;
  }
  
  // "위쪽" 명령 또는 방향 지정 없을 때 (기본값): Y좌표가 작을수록 (화면 위에 있을수록) 높은 점수
  return viewportHeight - Math.max(0, rect.top);
}

// ✨ [수정] direction 파라미터 추가
export function calculateScore(
  item: CrawledItem, 
  targetText: string, 
  direction: 'up' | 'down' | null,
  config: PriorityConfig = ELEMENT_PRIORITIES
): ScoredItem {
  const typeScore = getTypeScore(config, item);
  const roleScore = getRoleScore(config, item);
  const keywordScore = getKeywordScore(config, item, targetText);
  // ✨ [수정] getPositionScore에 direction 전달
  const positionScore = getPositionScore(item, direction);

  // 위치 점수에 압도적인 가중치(x1000)를 부여하여 다른 모든 점수보다 우선되게 함
  const total = (positionScore * 1000) + typeScore + roleScore + keywordScore;

  return {
    item,
    score: total,
    breakdown: { typeScore, roleScore, keywordScore, positionScore, total }
  };
}

// ✨ [수정] direction 파라미터 추가
export function selectBestMatch(
  candidates: CrawledItem[], 
  targetText: string, 
  direction: 'up' | 'down' | null,
  config: PriorityConfig = ELEMENT_PRIORITIES
): CrawledItem | null {
  if (candidates.length === 0) return null;
  
  // ✨ [수정] calculateScore에 direction 전달
  const scoredItems = candidates.map(item => 
    calculateScore(item, targetText, direction, config)
  );
  
  scoredItems.sort((a, b) => b.score - a.score);
  
  if (scoredItems.length > 1) {
    console.log(`🎯 Found ${scoredItems.length} candidates for "${targetText}" (direction: ${direction || 'default'}):`, 
      scoredItems.map(item => ({
        text: item.item.text || item.item.label || item.item.alt,
        type: item.item.type,
        score: item.score,
        breakdown: item.breakdown
      }))
    );
  }
  
  return scoredItems[0]?.item || null;
}
