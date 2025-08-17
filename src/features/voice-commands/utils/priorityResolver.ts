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

export class PriorityResolver {
  private config: PriorityConfig;

  constructor(config: PriorityConfig = ELEMENT_PRIORITIES) {
    this.config = config;
  }

  calculateScore(item: CrawledItem, targetText: string): ScoredItem {
    const typeScore = this.getTypeScore(item);
    const roleScore = this.getRoleScore(item);
    const keywordScore = this.getKeywordScore(item, targetText);
    const positionScore = this.getPositionScore(item);

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

  private getTypeScore(item: CrawledItem): number {
    return this.config.type[item.type] || 0;
  }

  private getRoleScore(item: CrawledItem): number {
    return this.config.role[item.role] || 0;
  }

  private getKeywordScore(item: CrawledItem, targetText: string): number {
    const lowerTarget = targetText.toLowerCase();
    
    // 키워드별 특별 가중치 확인
    for (const [keyword, config] of Object.entries(this.config.keywords)) {
      if (lowerTarget.includes(keyword.toLowerCase())) {
        let bonus = config.weight;
        
        // 선호하는 타입이면 추가 보너스
        if (config.preferredType && item.type === config.preferredType) {
          bonus += 50;
        }
        
        // 선호하는 역할이면 추가 보너스
        if (config.preferredRole && item.role === config.preferredRole) {
          bonus += 50;
        }
        
        return bonus;
      }
    }
    
    return 0;
  }

  private getPositionScore(item: CrawledItem): number {
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
      score += this.config.position.topAreaBonus;
    }
    
    // 화면 중앙 50% 영역 추가 보너스 (20% ~ 70%)
    else if (rect.top < viewportHeight * 0.7) {
      score += this.config.position.centerAreaBonus;
    }
    
    return score;
  }

  selectBestMatch(candidates: CrawledItem[], targetText: string): CrawledItem | null {
    if (candidates.length === 0) return null;
    
    const scoredItems = candidates.map(item => 
      this.calculateScore(item, targetText)
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
}