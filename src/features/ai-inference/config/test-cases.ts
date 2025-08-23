// AI 추론 시스템 테스트 케이스 정의

export interface AITestCase {
  command: string;
  expected: string;
  description: string;
  category: string;
}

// 기본 테스트 (카테고리별 기본 명령들)
export const AI_TEST_CASES_BASIC: AITestCase[] = [
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

// 기본 테스트 (경계선 케이스들)
export const AI_TEST_CASES_EDGE: AITestCase[] = [
  // 1. product_search vs price_comparison 경계선
  {
    command: "할인 제품 찾아줘",
    expected: "product_search", // 제품 찾기가 주목적
    description: "할인+제품 경계선 - 제품검색 우선",
    category: "edge_product_price"
  },
  {
    command: "저렴한 노트북 보여줘", 
    expected: "product_search", // 노트북 검색이 주목적
    description: "저렴+제품명 경계선",
    category: "edge_product_price"
  },
  {
    command: "특가 상품 검색해줘",
    expected: "product_search", // 상품 검색이 주목적
    description: "특가+검색 경계선",
    category: "edge_product_price"
  },
  {
    command: "이 제품 얼마예요",
    expected: "price_comparison", // 가격 문의가 주목적
    description: "제품+가격문의 경계선", 
    category: "edge_product_price"
  },
  {
    command: "아이폰 가격 비교해줘",
    expected: "price_comparison", // 가격비교가 주목적
    description: "제품명+가격비교 경계선",
    category: "edge_product_price"
  },

  // 2. simple_find vs product_search 경계선  
  {
    command: "검색 버튼 클릭해줘",
    expected: "simple_find", // UI 조작이 목적
    description: "검색+버튼 경계선 - UI조작 우선",
    category: "edge_ui_search"
  },
  {
    command: "필터 메뉴 눌러줘",
    expected: "simple_find", // UI 조작
    description: "필터+UI 조작",
    category: "edge_ui_search"
  },
  {
    command: "카테고리 선택해줘", 
    expected: "simple_find", // UI 조작
    description: "카테고리 선택 - UI조작",
    category: "edge_ui_search"
  },
  {
    command: "상품 목록 보여줘",
    expected: "product_search", // 상품 검색/표시
    description: "상품목록 - 제품검색 우선",
    category: "edge_ui_search"
  },

  // 3. navigation vs simple_find 경계선
  {
    command: "다음 페이지 버튼 클릭",
    expected: "simple_find", // 버튼 클릭 = UI 조작
    description: "페이지네이션 버튼 - UI조작 우선",
    category: "edge_nav_ui"
  },
  {
    command: "홈 버튼 눌러줘",
    expected: "simple_find", // 버튼 조작
    description: "홈버튼 클릭 - UI조작",
    category: "edge_nav_ui" 
  },
  {
    command: "상품 페이지로 가줘",
    expected: "navigation", // 페이지 이동
    description: "페이지 이동 - 네비게이션",
    category: "edge_nav_ui"
  },
  {
    command: "이전으로 돌아가줘",
    expected: "navigation", // 페이지 이동
    description: "뒤로가기 - 네비게이션",
    category: "edge_nav_ui"
  },

  // 4. purchase_flow vs simple_find 경계선
  {
    command: "구매 버튼 찾아줘",
    expected: "simple_find", // UI 요소 찾기
    description: "구매버튼 찾기 - UI조작 우선",
    category: "edge_purchase_ui"
  },
  {
    command: "결제 페이지로 이동해줘",
    expected: "navigation", // 페이지 이동
    description: "결제페이지 이동 - 네비게이션",
    category: "edge_purchase_nav"
  },
  {
    command: "주문서 작성해줘",
    expected: "purchase_flow", // 구매 프로세스
    description: "주문서 작성 - 구매플로우",
    category: "edge_purchase_ui"
  },
  {
    command: "결제 정보 입력해줘",
    expected: "purchase_flow", // 구매 프로세스  
    description: "결제정보 입력 - 구매플로우",
    category: "edge_purchase_ui"
  },

  // 5. 복합/애매한 케이스들
  {
    command: "로그인해서 구매해줘",
    expected: "purchase_flow", // 최종 목적이 구매
    description: "복합명령 - 구매가 최종목적",
    category: "edge_complex"
  },
  {
    command: "검색해서 최저가 찾아줘", 
    expected: "price_comparison", // 최저가가 최종목적
    description: "복합명령 - 가격비교가 최종목적",
    category: "edge_complex"
  },
  {
    command: "이거 장바구니에 있나 확인해줘",
    expected: "simple_find", // 확인/찾기가 목적
    description: "장바구니 확인 - 찾기 우선",
    category: "edge_complex"
  },

  // 6. 자연어/구어체 경계선
  {
    command: "이거 사고싶어",
    expected: "purchase_flow", // 구매 의사
    description: "구매 의사 표현 - 구어체",
    category: "edge_natural"
  },
  {
    command: "얼마야 이거", 
    expected: "price_comparison", // 가격 문의
    description: "가격 문의 - 구어체",
    category: "edge_natural"
  },
  {
    command: "어디에 있지",
    expected: "simple_find", // 찾기
    description: "UI 요소 찾기 - 구어체", 
    category: "edge_natural"
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

// 자연어/구어체 테스트
export const AI_TEST_CASES_NATURAL: AITestCase[] = [
  {
    command: "이거 사고싶어",
    expected: "purchase_flow",
    description: "구매 의사 표현 - 구어체",
    category: "natural_purchase"
  },
  {
    command: "얼마야 이거",
    expected: "price_comparison", 
    description: "가격 문의 - 구어체",
    category: "natural_price"
  },
  {
    command: "어디에 있지",
    expected: "simple_find",
    description: "UI 요소 찾기 - 구어체",
    category: "natural_find" 
  },
  {
    command: "좀 찾아봐",
    expected: "product_search",
    description: "검색 요청 - 구어체",
    category: "natural_search"
  },
  {
    command: "뭐가 더 싸?",
    expected: "price_comparison",
    description: "가격 비교 - 구어체",
    category: "natural_price"
  }
];

// 복합 명령 테스트
export const AI_TEST_CASES_COMPLEX: AITestCase[] = [
  {
    command: "로그인해서 구매해줘",
    expected: "purchase_flow",
    description: "복합명령 - 구매가 최종목적",
    category: "complex_purchase"
  },
  {
    command: "검색해서 최저가 찾아줘",
    expected: "price_comparison", 
    description: "복합명령 - 가격비교가 최종목적",
    category: "complex_price"
  },
  {
    command: "이거 장바구니에 있나 확인해줘",
    expected: "simple_find",
    description: "장바구니 확인 - 찾기 우선",
    category: "complex_find"
  },
  {
    command: "메뉴에서 할인 상품 찾아줘",
    expected: "product_search",
    description: "복합명령 - 제품검색이 최종목적",
    category: "complex_search"
  },
  {
    command: "카테고리 선택하고 정렬해줘",
    expected: "simple_find",
    description: "복합 UI 조작",
    category: "complex_ui"
  }
];

// 테스트 세트 맵
export const AI_TEST_SETS = {
  basic: {
    name: "기본 테스트",
    description: "카테고리별 기본 명령어들",
    cases: AI_TEST_CASES_BASIC
  },
  edge: {
    name: "경계선 테스트", 
    description: "애매한 경계선 케이스들",
    cases: AI_TEST_CASES_EDGE
  },
  natural: {
    name: "자연어 테스트",
    description: "구어체/자연스러운 표현들", 
    cases: AI_TEST_CASES_NATURAL
  },
  complex: {
    name: "복합 명령 테스트",
    description: "여러 동작을 포함한 복합 명령들",
    cases: AI_TEST_CASES_COMPLEX
  }
} as const;

export type AITestSetKey = keyof typeof AI_TEST_SETS;

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