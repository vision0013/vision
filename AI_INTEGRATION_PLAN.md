# 🤖 Chrome Extension AI 통합 계획서

## 📋 프로젝트 개요

**목표**: oktjs 기반 토큰화 → Gemma-3 1B 기반 AI 추론으로 전환  
**핵심**: 음성 명령 "아이폰15 최저가 찾아서 화면에 표시해줘" 같은 복잡한 추론 처리

## 🎯 최종 목표 기능들

### 현재 (oktjs)
```
"로그인 버튼 클릭해줘" → 단순 키워드 매칭 → 클릭
```

### 목표 (Gemma-3 1B AI)
```
"아이폰15 최저가 찾아서 화면에 표시해줘" → AI 의도분석 → 가격비교 + UI표시
"무선 이어폰 찾아서 검색해줘" → AI 카테고리추론 → 검색창 자동입력
"이것보다 싼 거 있나 찾아봐" → AI 상품인식 → 경쟁상품 검색
"비슷한 제품들 비교해서 보여줘" → AI 특성분석 → 비교표 생성
```

## 📊 기술 스택 비교

| 항목 | 현재 (oktjs) | 목표 (MediaPipe + Gemma-3 1B) |
|------|--------------|-------------------------------|
| **용도** | 한국어 토큰화만 | 완전한 AI 추론 |
| **파일크기** | 3.4MB | 529MB (int4) + 40MB 런타임 |
| **기능** | 형태소 분석 | 의도 이해, 맥락 분석, 추론 |
| **성능** | 즉시 | ~1초 (추론 시간) |
| **오프라인** | ✅ | ✅ |
| **한국어** | ✅ | ✅ (대폭 개선) |

## 🗂️ 폴더 구조 계획

### 새로운 AI 관련 폴더들
```
src/features/
├── ai-inference/                 # 🆕 AI 추론 엔진
│   ├── controllers/
│   │   └── ai-controller.ts     # AI 모델 관리
│   ├── process/
│   │   ├── mediapipe-llm.ts     # MediaPipe LLM 통합
│   │   ├── intent-analyzer.ts   # 의도 분석
│   │   └── context-manager.ts   # 맥락 관리
│   └── types/
│       └── ai-types.ts          # AI 관련 타입들

├── smart-shopping/               # 🆕 스마트 쇼핑 기능
│   ├── controllers/
│   │   └── shopping-controller.ts
│   ├── process/
│   │   ├── price-hunter.ts      # 가격 비교
│   │   ├── product-finder.ts    # 상품 검색
│   │   └── comparison-engine.ts # 비교 분석
│   └── ui/
│       ├── price-overlay.tsx    # 가격 비교 오버레이
│       └── search-helper.tsx    # 검색 도우미

└── voice-commands/               # 🔄 기존 확장
    ├── process/
    │   ├── ai-action-router.ts   # 🆕 AI 기반 액션 라우팅
    │   ├── smart-find-action.ts  # 🆕 지능적 검색
    │   └── shopping-action.ts    # 🆕 쇼핑 액션들
    └── ...
```

## 🚀 단계별 구현 계획

### Phase 1: MediaPipe 기반 구축 (1주)
**목표**: AI 추론 인프라 구축

#### 1.1 패키지 설치 및 기본 설정
```bash
npm install @mediapipe/tasks-genai
```

#### 1.2 AI Controller 구현
```typescript
// src/features/ai-inference/controllers/ai-controller.ts
export class AIController {
  private llm: LlmInference | null = null;
  
  async initialize() {
    // Gemma-3 1B 모델 로드
  }
  
  async analyzeIntent(voiceInput: string) {
    // 음성 명령 의도 분석
  }
}
```

#### 1.3 Background Script 통합
```typescript
// src/background/background.ts 수정
import { AIController } from '../features/ai-inference';

const aiController = new AIController();

// oktjs 로직을 AI 추론으로 대체
```

#### 성공 기준
- ✅ Gemma-3 1B 모델 로드 성공
- ✅ 기본 AI 추론 ("안녕하세요" → 인사 의도 분석)
- ✅ 기존 oktjs 코드와 병행 동작

---

### Phase 2: 음성 명령 AI 분석 (1주)
**목표**: 복잡한 음성 명령을 AI로 분석

#### 2.1 의도 분석기 구현
```typescript
// src/features/ai-inference/process/intent-analyzer.ts
export interface VoiceIntent {
  action: 'price_comparison' | 'product_search' | 'simple_find' | 'purchase_flow';
  product?: string;
  detail?: string;
  context?: any;
}

export async function analyzeVoiceIntent(command: string): Promise<VoiceIntent>
```

#### 2.2 AI 기반 액션 라우팅
```typescript
// src/features/voice-commands/process/ai-action-router.ts
export async function routeAIAction(intent: VoiceIntent, items: CrawledItem[])
```

#### 2.3 기존 액션들 확장
- `click-action.ts` → AI 의도에 맞는 클릭
- `find-action.ts` → 맥락 기반 검색
- 새로운 `shopping-action.ts` 추가

#### 성공 기준
- ✅ "아이폰 찾아줘" → AI 분석 → 상품 검색 의도
- ✅ "클릭해줘" → AI 분석 → 클릭 의도
- ✅ 복잡한 명령 ("최저가 찾아줘") 의도 인식

---

### Phase 3: 스마트 쇼핑 기능 (2주)
**목표**: 가격 비교, 상품 검색 등 핵심 기능

#### 3.1 가격 헌터 구현
```typescript
// src/features/smart-shopping/process/price-hunter.ts
export async function findBestPrice(product: string) {
  // 1. 현재 페이지에서 상품 정보 추출
  // 2. 다른 쇼핑몰 가격 검색 (API 또는 크롤링)
  // 3. 가격 비교 결과 반환
}
```

#### 3.2 상품 검색기 구현
```typescript
// src/features/smart-shopping/process/product-finder.ts
export async function smartProductSearch(query: string, category?: string)
```

#### 3.3 가격 비교 UI
```typescript
// src/features/smart-shopping/ui/price-overlay.tsx
// 사이드패널에 가격 비교 결과 표시
```

#### 성공 기준
- ✅ "아이폰15 최저가 찾아줘" 완전 구현
- ✅ 가격 비교 결과 UI 표시
- ✅ 다중 사이트 가격 수집

---

### Phase 4: 고도화 및 최적화 (1주)
**목표**: 성능 최적화 및 추가 기능

#### 4.1 성능 최적화
- 모델 캐싱 및 지연 로딩
- AI 응답 스트리밍
- 메모리 사용량 최적화

#### 4.2 맥락 관리
```typescript
// src/features/ai-inference/process/context-manager.ts
// 이전 명령 기억, 페이지 상태 추적
```

#### 4.3 추가 쇼핑 기능
- 상품 북마크
- 가격 알림
- 구매 히스토리

#### 성공 기준
- ✅ AI 응답 시간 1초 이하
- ✅ 맥락 기반 연속 명령 지원
- ✅ 고급 쇼핑 어시스턴트 기능

---

## 🔄 마이그레이션 전략

### 점진적 전환 방식
1. **Phase 1**: oktjs + MediaPipe 병행
2. **Phase 2**: 간단한 명령은 oktjs, 복잡한 건 AI
3. **Phase 3**: AI 위주, oktjs는 백업용
4. **Phase 4**: 완전 AI 기반 (oktjs 제거)

### 호환성 유지
```typescript
// 기존 oktjs 코드 래핑
async function processVoiceCommand(command: string) {
  if (isComplexCommand(command)) {
    return await processWithAI(command);
  } else {
    return await processWithOktjs(command); // 기존 방식
  }
}
```

## 📋 체크리스트

### Phase 1 완료 기준
- [ ] @mediapipe/tasks-genai 설치
- [ ] Gemma-3 1B 모델 다운로드 및 로드
- [ ] AIController 기본 구현
- [ ] Background Script 통합
- [ ] 기본 AI 추론 테스트 성공

### Phase 2 완료 기준
- [ ] VoiceIntent 타입 정의
- [ ] intent-analyzer.ts 구현
- [ ] ai-action-router.ts 구현
- [ ] 복잡한 음성 명령 분석 성공
- [ ] 기존 액션과 연동

### Phase 3 완료 기준
- [ ] price-hunter.ts 구현
- [ ] product-finder.ts 구현
- [ ] 가격 비교 UI 완성
- [ ] "최저가 찾아줘" 명령 완전 구현

### Phase 4 완료 기준
- [ ] 성능 최적화 완료
- [ ] 맥락 관리 구현
- [ ] 추가 쇼핑 기능 완성
- [ ] oktjs 의존성 제거

## 🚨 리스크 및 대응방안

### 리스크 1: 모델 크기 (529MB)
**대응**: 지연 로딩 + CDN 캐싱

### 리스크 2: AI 응답 속도
**대응**: 스트리밍 + 캐싱 + 프롬프트 최적화

### 리스크 3: WebGPU 호환성
**대응**: CPU 백업 + 호환성 체크

### 리스크 4: Chrome Extension CSP
**대응**: WASM 파일 web_accessible_resources 설정

## 🎯 예상 결과

### 기능적 성과
- ✅ 자연어 이해 기반 음성 명령
- ✅ 지능적 쇼핑 어시스턴트
- ✅ 맥락 인식 대화형 인터페이스

### 기술적 성과
- ✅ 완전 오프라인 AI 추론
- ✅ Chrome Extension에서 LLM 활용
- ✅ 확장 가능한 AI 아키텍처

---

**시작일**: 2025년 1월 20일  
**완료 목표**: 2025년 2월 17일 (4주)  
**담당자**: Claude Code Assistant

*"oktjs 토큰화에서 Gemma-3 1B 지능형 어시스턴트로의 대변환! 🚀"*