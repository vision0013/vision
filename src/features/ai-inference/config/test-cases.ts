// AI 추론 시스템 테스트 케이스 정의

export interface AITestCase {
  command: string;
  expected: string;
  description: string;
  category: string;
}

export const AI_TEST_CASES: AITestCase[] = [
  // product_search (5개)
  {
    command: "아이폰 15 찾아줘",
    expected: "product_search",
    description: "기본 제품 검색",
    category: "product_search"
  },
  {
    command: "갤럭시 S24 검색해줘", 
    expected: "product_search",
    description: "다른 제품 검색",
    category: "product_search"
  },
  {
    command: "노트북 보여줘",
    expected: "product_search", 
    description: "일반 제품 검색",
    category: "product_search"
  },
  {
    command: "맥북 프로 찾아줘",
    expected: "product_search",
    description: "복합 제품명",
    category: "product_search"
  },
  {
    command: "에어팟 검색",
    expected: "product_search",
    description: "간단한 검색",
    category: "product_search"
  },

  // price_comparison (5개)
  {
    command: "최저가 알려줘",
    expected: "price_comparison",
    description: "기본 최저가 요청", 
    category: "price_comparison"
  },
  {
    command: "가격 비교해줘",
    expected: "price_comparison",
    description: "가격 비교 요청",
    category: "price_comparison"
  },
  {
    command: "더 싼 곳 있나요",
    expected: "price_comparison", 
    description: "자연스러운 가격 문의",
    category: "price_comparison"
  },
  {
    command: "할인가 찾아줘",
    expected: "price_comparison",
    description: "할인 관련",
    category: "price_comparison"
  },
  {
    command: "가격 확인해줘",
    expected: "price_comparison",
    description: "가격 확인", 
    category: "price_comparison"
  },

  // simple_find (5개)
  {
    command: "로그인 버튼 클릭해줘",
    expected: "simple_find",
    description: "기본 버튼 클릭",
    category: "simple_find"
  },
  {
    command: "검색창 찾아줘",
    expected: "simple_find",
    description: "입력창 찾기", 
    category: "simple_find"
  },
  {
    command: "메뉴 버튼 눌러줘",
    expected: "simple_find",
    description: "메뉴 조작",
    category: "simple_find"
  },
  {
    command: "회원가입 링크 클릭",
    expected: "simple_find",
    description: "링크 클릭",
    category: "simple_find" 
  },
  {
    command: "설정 아이콘 눌러줘",
    expected: "simple_find",
    description: "아이콘 조작",
    category: "simple_find"
  },

  // purchase_flow (5개)
  {
    command: "장바구니에 담아줘",
    expected: "purchase_flow",
    description: "기본 장바구니 추가",
    category: "purchase_flow"
  },
  {
    command: "결제하기 눌러줘", 
    expected: "purchase_flow",
    description: "결제 진행",
    category: "purchase_flow"
  },
  {
    command: "주문하기 클릭해줘",
    expected: "purchase_flow",
    description: "주문 진행",
    category: "purchase_flow"
  },
  {
    command: "구매하기 버튼 눌러줘",
    expected: "purchase_flow",
    description: "구매 진행",
    category: "purchase_flow"
  },
  {
    command: "카트에 추가해줘",
    expected: "purchase_flow",
    description: "영어식 표현",
    category: "purchase_flow"
  },

  // navigation (5개)
  {
    command: "이전 페이지로",
    expected: "navigation",
    description: "기본 뒤로가기",
    category: "navigation" 
  },
  {
    command: "뒤로 가줘",
    expected: "navigation",
    description: "간단한 뒤로가기",
    category: "navigation"
  },
  {
    command: "홈으로 이동해줘",
    expected: "navigation", 
    description: "홈 이동",
    category: "navigation"
  },
  {
    command: "메인 페이지로",
    expected: "navigation",
    description: "메인 이동",
    category: "navigation"
  },
  {
    command: "앞으로 이동",
    expected: "navigation",
    description: "앞으로 가기",
    category: "navigation"
  }
];

export interface AITestResult {
  testCase: AITestCase;
  actualResult: string;
  confidence: number;
  responseTime: number;
  isCorrect: boolean;
  error?: string;
}

export interface AITestSummary {
  totalTests: number;
  correctTests: number;
  accuracy: number;
  avgResponseTime: number;
  avgConfidence: number;
  categoryResults: Record<string, {
    total: number;
    correct: number; 
    accuracy: number;
  }>;
  failedTests: AITestResult[];
}