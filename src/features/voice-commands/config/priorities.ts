import { ItemType } from "../../../types";

export interface PriorityConfig {
  // 타입별 기본 우선순위 (높을수록 우선)
  type: Record<ItemType, number>;
  
  // 역할별 우선순위
  role: Record<string, number>;
  
  // 특정 키워드별 가중치 설정
  keywords: Record<string, {
    preferredType?: ItemType;
    preferredRole?: string;
    weight: number;
  }>;
  
  // 위치별 가중치 (화면 상단일수록 높은 점수)
  position: {
    topAreaBonus: number;
    centerAreaBonus: number;
  };
}

export const ELEMENT_PRIORITIES: PriorityConfig = {
  // 타입별 우선순위
  type: {
    'button': 100,    // 버튼이 최우선
    'link': 80,       // 링크 2번째
    'text': 60,       // 일반 텍스트 3번째
    'image': 40,       // 이미지 4번째
    'container' : 20 // 컨테이너 5번째
  },
  
  // 역할별 우선순위
  role: {
    'main': 100,      // 메인 콘텐츠 최우선
    'nav': 90,        // 네비게이션 두 번째
    'header': 70,     // 헤더 세 번째
    'article': 60,    // 아티클 네 번째
    'section': 50,    // 섹션 다섯 번째
    'sidebar': 30,    // 사이드바 여섯 번째
    'footer': 20,     // 푸터 일곱 번째
    'block': 10       // 기본 블록 마지막
  },
  
  // 특정 키워드별 설정
  keywords: {
    '로그인': {
      preferredType: 'button',
      preferredRole: 'main',
      weight: 200
    },
    '회원가입': {
      preferredType: 'button',
      preferredRole: 'main',
      weight: 200
    },
    '검색': {
      preferredType: 'button',
      preferredRole: 'nav',
      weight: 180
    },
    '메뉴': {
      preferredType: 'button',
      preferredRole: 'nav',
      weight: 150
    },
    '다음': {
      preferredType: 'button',
      preferredRole: 'main',
      weight: 160
    },
    '이전': {
      preferredType: 'button',
      preferredRole: 'main',
      weight: 160
    },
    '확인': {
      preferredType: 'button',
      preferredRole: 'main',
      weight: 180
    },
    '취소': {
      preferredType: 'button',
      preferredRole: 'main',
      weight: 170
    },
    '저장': {
      preferredType: 'button',
      preferredRole: 'main',
      weight: 190
    },
    '삭제': {
      preferredType: 'button',
      preferredRole: 'main',
      weight: 190
    }
  },
  
  // 위치별 가중치
  position: {
    topAreaBonus: 20,     // 화면 상단 20% 영역 보너스
    centerAreaBonus: 10   // 화면 중앙 50% 영역 보너스
  }
};