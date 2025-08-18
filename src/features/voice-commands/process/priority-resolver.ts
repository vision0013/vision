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
  
  // 키워드별 특별 가중치 확인
  for (const [keyword, keywordConfig] of Object.entries(config.keywords)) {
    if (lowerTarget.includes(keyword.toLowerCase())) {
      let bonus = keywordConfig.weight;
      
      // 선호하는 타입이면 추가 보너스
      if (keywordConfig.preferredType && item.type === keywordConfig.preferredType) {
        bonus += 50;
      }
      
      // 선호하는 역할이면 추가 보너스
      if (keywordConfig.preferredRole && item.role === keywordConfig.preferredRole) {
        bonus += 50;
      }
      
      return bonus;
    }
  }
  
  return 0;
}

function getPositionScore(config: PriorityConfig, item: CrawledItem): number {
  const rect = item.rect;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // ✨ viewport 내에 있는지 먼저 체크
  const bottom = rect.top + rect.height;
  const right = rect.left + rect.width;
  
  const isInViewport = (
    rect.top < viewportHeight &&
    bottom > 0 &&
    rect.left < viewportWidth &&
    right > 0
  );
  
  // viewport 밖에 있으면 큰 페널티
  if (!isInViewport) {
    return -100; // 큰 마이너스 점수
  }
  
  // viewport 내에 있으면 기본 보너스
  let score = 100; // viewport 내 기본 보너스
  
  // 화면 상단 20% 영역 추가 보너스
  if (rect.top < viewportHeight * 0.2) {
    score += config.position.topAreaBonus;
  }
  
  // 화면 중앙 50% 영역 추가 보너스 (20% ~ 70%)
  else if (rect.top < viewportHeight * 0.7) {
    score += config.position.centerAreaBonus;
  }
  
  return score;
}

export function calculateScore(item: CrawledItem, targetText: string, config: PriorityConfig = ELEMENT_PRIORITIES): ScoredItem {
  const typeScore = getTypeScore(config, item);
  const roleScore = getRoleScore(config, item);
  const keywordScore = getKeywordScore(config, item, targetText);
  const positionScore = getPositionScore(config, item);

  const total = typeScore + roleScore + keywordScore + positionScore;

  return {
    item,
    score: total,
    breakdown: {
      typeScore,
      roleScore,
      keywordScore,
      positionScore,
      total
    }
  };
}

export function selectBestMatch(candidates: CrawledItem[], targetText: string, config: PriorityConfig = ELEMENT_PRIORITIES): CrawledItem | null {
  if (candidates.length === 0) return null;
  
  const scoredItems = candidates.map(item => 
    calculateScore(item, targetText, config)
  );
  
  // 점수 기준으로 정렬 (높은 점수가 먼저)
  scoredItems.sort((a, b) => b.score - a.score);
  
  // 디버깅용 로그
  if (scoredItems.length > 1) {
    console.log(`🎯 Found ${scoredItems.length} candidates for "${targetText}":`, 
      scoredItems.map(item => ({
        text: item.item.text || item.item.label || item.item.alt,
        type: item.item.type,
        role: item.item.role,
        score: item.score,
        breakdown: item.breakdown
      }))
    );
  }
  
  return scoredItems[0]?.item || null;
}