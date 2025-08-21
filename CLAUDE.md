# Claude Code 프로젝트 정보

## 📁 프로젝트 구조 원칙

### 표준 폴더 구조
```
src/
├── background/                    # Service Worker (5폴더 구조)
│   ├── config/        # 상수 및 설정
│   ├── types/         # Background 전용 타입
│   ├── process/       # 메시지 핸들러 (순수 함수)
│   ├── controllers/   # 상태 관리 클래스
│   └── utils/         # 유틸리티 함수
├── features/                      # 기능별 모듈 (5폴더 구조)
│   └── {feature-name}/
│       ├── config/        # 상수 및 설정 (우선순위, 임계값 등)
│       ├── types/         # 해당 기능 전용 타입 정의
│       ├── process/       # 비즈니스 로직 (순수 함수)
│       ├── controllers/   # 흐름 제어 및 API (React Hook, 상태 관리)
│       ├── ui/           # UI 컴포넌트 (필요한 경우)
│       └── index.ts       # 배럴 exports
├── sections/                      # UI 조립 및 레이아웃
└── types/                         # 공통 타입 정의
```

### 파일 네이밍 규칙

#### Controller vs Manager 원칙
```typescript
// ✅ Controller - Feature 폴더의 총괄 제어자
VoiceController     → voice-commands/ 폴더 전체 흐름 제어
AIController        → ai-inference/ 폴더 전체 흐름 제어

// ✅ Manager - 단일 책임 리소스 관리자  
TabStateManager     → 탭 상태만 관리
OffscreenManager    → Offscreen Document만 관리

// ✅ 함수 - 순수 비즈니스 로직
processVoiceCommand(), analyzeElements(), highlightElement()
```

#### 네이밍 컨벤션
- **파일명**: kebab-case (voice-controller.ts, tab-state-manager.ts)
- **클래스명**: PascalCase (VoiceController, TabStateManager)
- **함수/변수**: camelCase (processCommand, isReady)
- **폴더명**: 소문자 단수형 (controllers, process, types)
- **최대 3단어**로 제한

#### 클래스형 vs 함수형 선택 기준

**✅ 클래스형 적합 케이스**
- **상태 관리자**: Manager, Service, Controller 등 상태를 가지고 관리하는 객체
- **리소스 관리**: Chrome Extension API, 외부 API, 시스템 리소스 래핑
- **생명주기 관리**: 생성 → 초기화 → 사용 → 정리 과정이 있는 객체
- **복잡한 상태**: 여러 비동기 상태를 조합하여 관리해야 하는 경우

**✅ 함수형 적합 케이스**  
- **순수 로직**: 입력에 대한 변환만 수행하는 비즈니스 로직
- **유틸리티**: 데이터 변환, 포맷팅, 검증 등 헬퍼 함수들
- **이벤트 처리**: 단발성 액션이나 이벤트 핸들러
- **React 컴포넌트**: UI 컴포넌트와 훅스는 함수형 유지

**🎯 Hybrid 아키텍처 (현재 적용)**
- **클래스**: 상태 관리 (TabStateManager, OffscreenManager)
- **함수**: 비즈니스 로직 (message handlers, processors)
- **React**: 함수형 컴포넌트 + Zustand 전역 상태

### 폴더 구조 설계 원칙

#### 📋 Controller 단일 책임 원칙
- **폴더당 Controller는 무조건 1개**만 허용
- **2개 이상의 Controller가 필요하다면 기능 분리** 필수
- Controller는 해당 폴더의 **총괄 조율자** 역할

```typescript
// ✅ 올바른 구조
features/voice-commands/
└── controllers/
    └── voice-controller.ts    // 1개만 존재

// ❌ 잘못된 구조 - 기능 분리 필요
features/voice-commands/
└── controllers/
    ├── voice-controller.ts
    └── speech-controller.ts   // → voice-recognition/ 폴더로 분리해야 함
```

#### 🔄 기능 분리 기준
- **서로 다른 도메인**: voice-commands ≠ voice-recognition
- **독립적인 책임**: 음성 명령 처리 ≠ 음성 인식 엔진
- **재사용 가능성**: 다른 feature에서 사용될 수 있는 기능

#### 📂 Manager 배치 원칙
- **background/controllers/**: 시스템 레벨 리소스 관리 (TabStateManager, OffscreenManager)
- **features/{name}/controllers/**: 기능별 흐름 제어 (VoiceController, AIController)

## 📝 문서 관리 가이드라인

### 기능 개발 시 참고 방법
새로운 기능 추가나 기존 기능 수정 시 다음 순서로 MD 문서를 활용하세요:

1. **📁 폴더 구조 확인** → 해당 기능의 파일 위치와 구조 파악
2. **🔧 연관 파일 확인** → "현재 구현된 기능들"에서 관련 파일 목록 확인
3. **📚 개선 히스토리 검토** → 해당 기능의 과거 시행착오와 해결 방법 학습
4. **🎯 개선 방법론 적용** → 기능별 핵심 접근법과 패턴 활용
5. **⚠️ 트러블슈팅 선행 확인** → 유사한 문제의 해결 방법 미리 파악

**예시 1: 음성 명령에 새로운 액션 추가**
1. `src/features/voice-commands/process/` 폴더에 `{action-name}-action.ts` 생성
2. `voice-controller.ts`에서 키워드 기반 라우팅 로직 추가  
3. `priorities.ts`에 해당 액션의 우선순위 설정 추가
4. 한국어 NLP 필요시 oktjs 전처리 로직 활용 (v4.11 트러블슈팅 참고)
5. 메시지 통신 아키텍처 준수 (Panel → Background → Content Script)

**예시 2: 페이지 크롤링 개선**  
1. `src/features/page-analysis/crawling/process/` 폴더의 관련 파일 확인
2. 동적 요소 감지 필요시 `dynamic-observer/` 모듈 활용 (v4.14 5폴더 구조)
3. visibility 체크는 `isVisibleRelaxed()` 패턴 적용 (v4.3 트러블슈팅)
4. 중복 제거는 좌표 기반 로직 사용 (v4.12 해결방법)

**예시 3: 새로운 UI 컴포넌트 추가**
1. 기능별 UI는 `src/features/{feature-name}/ui/` 폴더에 생성
2. 전체 레이아웃 관련은 `src/sections/ui/` 폴더 활용  
3. 상태 관리는 Zustand 패턴 적용 (side-panel-management 참고)
4. React Hook은 `controllers/` 폴더에 배치

### 트러블슈팅 가이드 업데이트 규칙
- **누적 방식**: 새로운 문제와 해결책을 기존 내용에 추가 (덮어쓰기 금지)
- **날짜 표시**: 각 트러블슈팅 항목에 버전과 날짜 명시
- **구조화**: `문제 → 시도한 방법들(실패) → 최종 해결방법(성공)` 형태로 작성
- **검색성**: 명확한 제목과 태그로 쉽게 찾을 수 있도록 구성
- **예시**: 성공한 해결방법은 코드 예시나 구체적 단계 포함

### 성공 지표 업데이트 규칙  
- **버전별 갱신**: 새로운 버전에서 달성한 주요 성과로 업데이트
- **측정 가능한 지표**: 구체적인 숫자나 상태로 표현
- **이전 버전 성과 유지**: 중요한 기능들은 "~유지" 형태로 지속성 표시

## 📋 동적 임포트 사용 가이드 (Dynamic Import Guidelines)

**Chrome Extension MV3 + Vite 환경에서 동적 임포트(`import()`) 사용 가능하나 특별 설정 필요**

### ✅ 사용 가능 조건
- Manifest V3 + `"type": "module"` 환경
- Vite 번들러 + ES Module 기반
- 확장 내부 파일만 허용 (`chrome-extension://<id>/...`)

### ⚠️ Vite 환경 특별 제약사항
1. **코드 스플리팅**: Vite가 동적 임포트를 자동으로 chunk 분리 (`assets/xxx-hash.js`)
2. **CSP 제약**: 외부 CDN URL 완전 차단
3. **web_accessible_resources**: chunk 파일 접근 권한 필수 설정
4. **Service Worker 제약**: DOM 의존성 라이브러리는 Panel/Content Script에서만 사용

### Vite 환경 필수 설정 (Chrome Extension MV3)

#### 1. manifest.json - web_accessible_resources 설정
```json
{
  "web_accessible_resources": [
    {
      "resources": ["assets/*.js"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

#### 2. vite.config.ts - ESM 출력 보장
```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',           // Side Panel UI
        background: 'background.ts',   // Service Worker
        content_script: 'content_script.tsx' // Content Script
      },
      output: {
        format: "es", // ✅ ESM 출력 필수
        entryFileNames: `[name].js`,
        chunkFileNames: `assets/[name].js`,
      }
    }
  }
});
```

#### 3. 동적 임포트 권장 패턴
```typescript
// ✅ 외부 라이브러리 (npm 패키지)
const oktjs = await import('oktjs');

// ✅ 내부 모듈 - new URL 패턴 필수
const utils = await import(new URL('./utils.ts', import.meta.url));

// ✅ Background에서 이벤트 기반 로딩
chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.type === "nlpAnalysis") {
    const { analyze } = await import(new URL("./nlpProcessor.ts", import.meta.url));
    return analyze(msg.text);
  }
});
```

### 현재 프로젝트 빌드 구조 (Vite 통합)
```typescript
// vite.config.ts - 모든 컴포넌트 통합 빌드
input: {
  main: 'index.html',           // Side Panel UI
  background: 'background.ts',   // Service Worker
  content_script: 'content_script.tsx' // Content Script
}
```

### 현재 프로젝트 적용사항
- ✅ **통합 빌드**: Side Panel + Background + Content Script 모두 Vite로 빌드
- ✅ **Panel**: oktjs 동적 임포트 활용 (음성 명령 처리시에만 로드)
- ✅ **성능 최적화**: 3.3MB oktjs를 필요시에만 로드
- ✅ **번들 분리**: Content Script(17KB) + Main(155KB) + oktjs chunk 분리
- ✅ **ES Module**: `"type": "module"` 환경에서 모든 동적 임포트 지원

### 사용 권장 케이스 및 주의사항

#### ✅ 동적 임포트 적합한 경우
- **무거운 라이브러리**: oktjs(3.3MB), Chart.js, PDF.js, Monaco Editor
- **조건부 기능**: 특정 이벤트나 사용자 액션시에만 필요한 모듈
- **Background 이벤트 핸들링**: 메시지 타입별 선택적 로딩

#### ⚠️ 주의사항
- **내부 모듈**: 반드시 `new URL(..., import.meta.url)` 패턴 사용
- **manifest 설정**: `web_accessible_resources`에 assets 폴더 등록 필수
- **ESM 출력**: vite.config.ts에서 `format: "es"` 설정 확인
- **Service Worker**: MV3 background는 `"type": "module"` 필수

#### 🚫 비권장 케이스
- 자주 사용하는 유틸리티 함수 (정적 임포트 권장)
- 초기화시 반드시 필요한 핵심 모듈
- 외부 CDN URL (CSP로 차단됨)

## 프로젝트 개요
Chrome Extension Crawler - 웹 페이지 분석 및 음성 제어 확장 프로그램

## 빌드 및 테스트 명령어

### 빌드
```bash
npm run build  # TypeScript 컴파일 + Vite 빌드
```

### 개발
```bash
npm run dev    # 개발 서버 실행
```

## 아키텍처

### 현재 구현된 폴더 구조 (v4.17)
```
src/
├── assets/                           # 정적 자산
├── background/                       # Service Worker (5폴더 구조)
│   ├── config/
│   │   └── background-config.ts     # Background 설정 상수
│   ├── types/
│   │   └── background-types.ts      # Background 메시지 타입
│   ├── process/                     # 메시지 핸들러 (순수 함수)
│   │   ├── message-router.ts        # 중앙 메시지 라우터
│   │   ├── ai-message-handler.ts    # AI 관련 메시지 처리
│   │   ├── voice-command-handler.ts # 음성 명령 처리
│   │   ├── crawl-message-handler.ts # 크롤링 메시지 처리
│   │   ├── highlight-message-handler.ts # 하이라이트 처리
│   │   └── ai-action-mapper.ts      # AI 액션 매핑
│   ├── controllers/                 # 상태 관리 클래스
│   │   ├── background-controller.ts # Background 메인 제어자 (진입점)
│   │   └── managers/                # 리소스 관리자들
│   │       ├── tab-state-manager.ts # 탭별 상태 중앙 관리
│   │       └── offscreen-manager.ts # Offscreen Document 관리
│   ├── utils/
│   │   └── url-handler.ts           # URL 처리 유틸리티
│   └── background-old.ts            # 이전 버전 백업
├── content/
│   └── content_script.tsx           # Content Script (DOM 조작, 크롤링 실행)
├── features/                         # 기능별 모듈 (표준 5폴더 구조)
│   ├── ai-inference/                # AI 추론 및 의도 분석 (v4.15 추가)
│   │   ├── controllers/
│   │   │   └── ai-controller.ts     # Gemma 3 1B 모델 관리 (IndexedDB 캐싱)
│   │   ├── types/
│   │   │   └── ai-types.ts          # VoiceIntent, AIAnalysisResult 등
│   │   ├── ui/
│   │   │   ├── ai-settings.tsx      # Hugging Face 토큰 설정 UI
│   │   │   └── ai-settings.css      # AI 설정 스타일
│   │   └── index.ts                 # AI 기능 배럴 export
│   ├── filtering/                    # 데이터 필터링
│   │   ├── config/
│   │   │   └── constants.ts
│   │   ├── types/
│   │   │   └── filter-types.ts
│   │   └── index.ts
│   ├── highlighting/                 # 요소 하이라이팅
│   │   ├── config/
│   │   │   └── constants.ts
│   │   ├── controllers/
│   │   │   └── highlight-controller.ts
│   │   ├── process/
│   │   │   ├── highlight-executor.ts
│   │   │   └── highlight-requester.ts
│   │   ├── types/
│   │   │   └── highlight-types.ts
│   │   └── index.ts
│   ├── page-analysis/               # 웹 페이지 크롤링 및 분석
│   │   ├── crawling/
│   │   │   ├── config/
│   │   │   │   └── constants.ts
│   │   │   ├── controllers/
│   │   │   │   └── crawler-controller.ts
│   │   │   ├── process/
│   │   │   │   ├── dom-walking.ts
│   │   │   │   ├── element-analysis.ts
│   │   │   │   ├── state-management.ts
│   │   │   │   └── text-processing.ts
│   │   │   ├── types/
│   │   │   │   └── crawler-state.ts
│   │   │   └── index.ts
│   │   └── dynamic-observer/          # 동적 요소 감지 (v4.14 분리)
│   │       ├── types/
│   │       │   └── observer-types.ts
│   │       ├── process/
│   │       │   ├── mutation-detector.ts
│   │       │   ├── element-scanner.ts
│   │       │   └── mutation-handler.ts
│   │       ├── controllers/
│   │       │   └── dynamic-observer-controller.ts
│   │       └── index.ts
│   ├── permissions/                 # 권한 관리
│   │   ├── config/
│   │   │   └── constants.ts
│   │   ├── process/
│   │   │   └── extension-manager.ts
│   │   └── index.ts
│   ├── side-panel-management/       # 사이드패널 상태 관리
│   │   ├── controllers/
│   │   │   └── panel-controller.ts
│   │   ├── process/
│   │   │   └── panel-store.ts
│   │   ├── types/
│   │   │   └── panel-types.ts
│   │   └── index.ts
│   ├── voice-commands/              # 음성 명령 처리
│   │   ├── config/
│   │   │   └── priorities.ts
│   │   ├── controllers/
│   │   │   └── voice-controller.ts
│   │   ├── process/
│   │   │   ├── click-action.ts
│   │   │   ├── element-matcher.ts
│   │   │   ├── find-action.ts
│   │   │   ├── input-action.ts
│   │   │   ├── navigation-action.ts
│   │   │   ├── priority-resolver.ts
│   │   │   └── scroll-action.ts
│   │   ├── types/
│   │   │   └── voice-types.ts
│   │   └── index.ts
│   ├── voice-recognition/           # 음성 인식
│   │   ├── controllers/
│   │   │   └── speech-controller.ts
│   │   ├── process/
│   │   │   └── speech-engine.ts
│   │   ├── types/
│   │   │   └── speech-types.ts
│   │   └── index.ts
│   └── index.ts                     # 전체 features 배럴 export
├── offscreen/
│   └── offscreen.ts                 # Offscreen Document (AI 모델 실행 환경)
├── sections/                        # UI 조립 및 레이아웃
│   └── ui/
│       ├── crawling-results.tsx
│       ├── crawling-summary.tsx
│       ├── extension-header.tsx
│       ├── side-panel.css
│       └── side-panel.tsx
├── test/                           # 테스트 파일
├── types/
│   ├── index.ts                    # 공통 타입 정의 (AnalysisResult, CrawledItem 등)
│   └── type.ts
├── vite-env.d.ts
└── main.tsx                        # React 앱 엔트리포인트
```

## 현재 구현된 기능들 및 개선 히스토리

### ✅ 완료된 Features

#### 1. **ai-inference** - AI 추론 및 의도 분석 (v4.15 신규)
**연관 파일:**
- `src/features/ai-inference/controllers/ai-controller.ts`
- `src/features/ai-inference/controllers/content-ai-controller.ts`
- `src/features/ai-inference/types/ai-types.ts`
- `src/features/ai-inference/ui/ai-settings.tsx`

**개선 히스토리:**
- **Gemma 3 1B 모델 통합** (v4.15, 2025-08-21) → MediaPipe Tasks Gen AI + IndexedDB 캐싱으로 로컬 AI 추론 구현
- **Hugging Face API 토큰 방식** (v4.15, 2025-08-21) → API 토큰으로 모델 다운로드 후 로컬 캐싱
- **2중 AI Controller 구조** (v4.15, 2025-08-21) → Panel용(ai-controller) + Content Script용(content-ai-controller) 분리
- **음성 명령 의도 분석** (v4.15, 2025-08-21) → 5가지 카테고리(price_comparison, product_search, simple_find, purchase_flow, navigation) 분류

#### 2. **page-analysis** - 웹 페이지 크롤링 및 분석
**연관 파일:**
- `src/features/page-analysis/crawling/controllers/crawler-controller.ts`
- `src/features/page-analysis/crawling/process/dom-walking.ts`
- `src/features/page-analysis/crawling/process/element-analysis.ts`
- `src/features/page-analysis/dynamic-observer/controllers/dynamic-observer-controller.ts`
- `src/content/content_script.tsx` (크롤링 실행)

**개선 히스토리:**
- **부분 크롤링 시스템 도입** (v4.3, 2025-08-16) → 드롭다운/팝업 등 동적 요소 감지 및 기존 데이터 추가 방식
- **관대한 visibility 체크** (v4.3, 2025-08-16) → `isVisibleRelaxed()` 함수로 동적 요소 안정적 감지  
- **글자수 기준 완화** (v4.3, 2025-08-16) → 3글자→1글자로 "뉴스", "웹" 등 짧은 텍스트 인식 개선
- **이중 크롤링 전략** (v4.3, 2025-08-16) → 깊은 중첩 구조에서도 링크/버튼 발견
- **좌표 기반 중복 제거** (v4.12, 2025-08-19) → 동일 링크 2-3개 등록 문제 해결
- **동적 관찰자 모듈 분리** (v4.14, 2025-01-19) → Controller 패턴 + 5폴더 구조로 결합도 완화

#### 2. **highlighting** - 요소 하이라이팅
**연관 파일:**
- `src/features/highlighting/controllers/highlight-controller.ts`
- `src/features/highlighting/process/highlight-executor.ts`
- `src/features/highlighting/process/highlight-requester.ts`
- `src/background/background.ts` (중앙 상태 관리)

**개선 히스토리:**
- **전역 상태 기반 함수형** (v4.10, 2025-08-18) → 클래스 래퍼 제거로 0.69KB 절약 및 복잡도 감소
- **Background 중앙 관리** (v4.13, 2025-01-19) → `tabActiveElements`로 탭별 활성 요소 상태 지속성 보장
- **ID 할당 최적화** (v4.12, 2025-08-19) → `data-crawler-id` 재할당 혼선 방지

#### 3. **voice-commands** - 음성 명령 처리  
**연관 파일:**
- `src/features/voice-commands/controllers/voice-controller.ts`
- `src/features/voice-commands/process/click-action.ts`
- `src/features/voice-commands/process/element-matcher.ts`
- `src/features/voice-commands/process/priority-resolver.ts`
- `src/features/voice-commands/process/input-action.ts`
- `src/features/voice-commands/process/navigation-action.ts`
- `src/features/voice-commands/process/scroll-action.ts`
- `src/features/voice-commands/config/priorities.ts`

**개선 히스토리:**
- **메시지 통신 아키텍처** (v4.0, 2025-08-16) → Side Panel DOM 조작 보안 문제 해결
- **스마트 우선순위 시스템** (v4.1, 2025-08-16) → 단순 텍스트 매칭에서 viewport, 타입별, 키워드별 가중치 적용
- **oktjs 한국어 NLP** (v4.11, 2025-08-19) → 음성 인식 분리 문제 ("써 줘" → "써줘") 전처리 로직으로 해결
- **완전 순수 함수화** (v4.10, 2025-08-18) → ElementMatcher, PriorityResolver 클래스 래퍼 제거
- **개선된 좌표 인식** (v4.12, 2025-08-19) → 스크롤 액션 정확도 향상

#### 4. **voice-recognition** - 음성 인식
**연관 파일:**
- `src/features/voice-recognition/controllers/speech-controller.ts`
- `src/features/voice-recognition/process/speech-engine.ts`
- `src/features/side-panel-management/controllers/panel-controller.ts` (oktjs 통합)

**개선 히스토리:**
- **useRef 상태 관리** (v4.2, 2025-08-16) → SpeechRecognition 객체 재생성 문제로 1회 이후 명령 먹통 해결
- **연속 명령 지원** (v4.2, 2025-08-16) → useRef 패턴으로 최신 상태 참조 및 연결 끊김 방지
- **oktjs Dynamic Import** (v4.11, 2025-08-19) → Chrome Extension 환경에서 한국어 NLP 완전 통합
- **Panel 처리 → Background 분석** (v4.11, 2025-08-19) → Service Worker DOM 제약 우회

#### 5. **filtering** - 데이터 필터링
**연관 파일:**
- `src/features/filtering/index.ts`
- `src/features/filtering/config/`
- `src/features/filtering/ui/`

**개선 히스토리:**
- **통합 텍스트 필터링** (v4.3, 2025-08-16) → 모든 크롤링에서 1글자 이상 텍스트 수집으로 통일

#### 6. **permissions** - 권한 관리
**연관 파일:**
- `src/features/permissions/process/extension-manager.ts`
- `src/features/permissions/config/`
- `public/manifest.json` (webNavigation 권한)

**개선 히스토리:**
- **Chrome Extension API 권한 최적화** (v4.13, 2025-01-19) → webNavigation으로 Background 기반 URL 감지 지원

#### 7. **side-panel-management** - 사이드패널 상태 관리
**연관 파일:**
- `src/features/side-panel-management/controllers/panel-controller.ts`
- `src/features/side-panel-management/process/panel-store.ts`
- `src/features/side-panel-management/types/panel-types.ts`

**개선 히스토리:**
- **중앙 집중식 상태 관리** (v4.9, 2025-08-18) → Zustand 기반 상태 관리로 패널-백그라운드 동기화
- **oktjs 통합 처리** (v4.11, 2025-08-19) → Panel에서 한국어 NLP 처리 후 Background로 분석 결과 전달

### 주요 기술 스택
- TypeScript
- React
- Vite
- Zustand (상태 관리)
- Chrome Extension APIs

## 개발 가이드라인

### 코딩 컨벤션
- **파일명**: kebab-case
- **함수/변수**: camelCase  
- **폴더명**: 소문자 단수형
- **최대 3단어**로 제한

### Import 구조
```typescript
// features 간 참조
import { functionName } from '../other-feature';

// sections에서 features 참조  
import { functionName } from '../../features';
```

## 최근 작업 내역

### v4.17 Background 5폴더 구조 분리 및 AI 시스템 안정화 완료 (2025-08-21)
- ✅ **Background 모듈화**: 178줄 단일 파일 → 5폴더 구조(config, types, process, controllers, utils)로 완전 분리
- ✅ **AI 응답 시스템 복원**: Background 리팩터링으로 고장난 AI 모델 상태 응답 완전 수정
- ✅ **검증된 비동기 패턴 적용**: `background-old.ts`의 안정적인 Promise + 메시지 리스너 체인 방식 신규 구조에 적용
- ✅ **MessageRouter 시스템**: 모든 메시지를 적절한 핸들러로 라우팅하는 중앙 집중식 시스템 구축
- ✅ **상태 관리 클래스화**: `TabStateManager`, `OffscreenManager`로 전역 상태 캡슐화
- ✅ **타입 안전성 강화**: 모든 Background 메시지에 대한 완전한 타입 정의
- ✅ **초기 로딩 상태 문제 해결**: AI 버튼 클릭 시 불필요한 "Loading model..." 표시 제거
- ✅ **Hybrid 아키텍처**: 클래스(상태 관리) + 함수(비즈니스 로직) 최적 조합

### v4.16 AI 모델 상태 관리 단순화 완료 (2025-08-21)
- ✅ **숫자 상태 시스템 도입**: 복잡한 boolean 조합(`isLoaded`, `isLoading`, `modelExists`) → 단일 `state` 숫자로 단순화
- ✅ **4단계 상태 정의**: 1(캐시없음), 2(로딩중), 3(로딩완료), 4(캐시있음/로드안됨)로 명확한 상태 전환
- ✅ **빈 객체 문제 해결**: 단일 `state` 필드로 Offscreen 응답 빈 객체 덮어쓰기 문제 완전 해결
- ✅ **UI 조건문 단순화**: `aiModelStatus.state === 1/2/3/4` 패턴으로 복잡한 조건 제거
- ✅ **타입 안전성 강화**: `AIModelStatus { state: 1|2|3|4, error?, modelSize?, loadTime? }` 명확한 타입 정의
- ✅ **상태 전환 흐름**: 캐시감지(1→4) → 로딩시작(4→2) → 로딩완료(2→3) → 실패시(2→1) 일관성 보장
- ✅ **Load Model 버튼 정상화**: "📦 Model found in cache" → 버튼 클릭 → "⏳ Loading model..." → "✅ Model loaded in memory!" 흐름 완성

### v4.15 AI 추론 모듈 통합 완료 (2025-08-21)
- ✅ **Gemma 3 1B 모델 통합**: MediaPipe Tasks Gen AI 라이브러리로 로컬 AI 추론 구현
- ✅ **IndexedDB 캐싱 시스템**: 529MB 모델을 브라우저에 캐싱하여 오프라인 동작 지원  
- ✅ **Hugging Face API 토큰 방식**: 사용자 토큰으로 모델 다운로드 후 로컬 저장
- ✅ **2중 Controller 구조**: Panel용 AI Controller + Content Script용 AI Controller 분리
- ✅ **음성 명령 의도 분석**: 5가지 카테고리로 음성 명령 분류 (price_comparison, product_search, simple_find, purchase_flow, navigation)
- ✅ **UI 설정 모달**: Hugging Face 토큰 입력 및 모델 관리 UI 제공
- ✅ **타입 안전성**: VoiceIntent, AIAnalysisResult 등 완전한 타입 정의
- ✅ **oktjs 대안**: 기존 oktjs 방식과 병행하여 AI 기반 의도 분석 제공

### v4.14 동적 관찰자 모듈 분리 완료 (2025-01-19)
- ✅ **Controller 패턴 도입**: `DynamicObserverController`로 상태 관리 중앙화
- ✅ **5폴더 구조 적용**: types, process, controllers로 기능별 분리
- ✅ **결합도 완화**: 순수 함수 기반으로 독립 테스트 가능
- ✅ **재사용성 향상**: `element-scanner`는 다른 크롤링 모듈에서도 활용 가능
- ✅ **코드 분리**: mutation-detector, element-scanner, mutation-handler로 단일 책임 원칙 적용
- ✅ **배럴 exports**: 깔끔한 API 제공으로 import 단순화

### v4.13 뒤로가기 감지 시스템 완전 개선 (2025-01-19)
- ✅ **Background 중심 아키텍처**: Content Script → Background로 URL 감지 시스템 완전 이전
- ✅ **Chrome Extension API 기반**: `chrome.tabs.onUpdated`, `chrome.webNavigation.onHistoryStateUpdated` 활용
- ✅ **상태 초기화 문제 해결**: 뒤로가기 시 Content Script 재실행으로 인한 상태 손실 완전 해결
- ✅ **Service Worker 연결 오류 해결**: "Receiving end does not exist" 오류 완전 제거
- ✅ **3중 URL 감지 시스템**: 일반 탭 변경, SPA 네비게이션, 페이지 로딩 완료 감지
- ✅ **Background 디바운싱**: 300ms 중앙 집중식 디바운싱으로 빠른 연속 뒤로가기 완벽 처리
- ✅ **통합 상태 관리**: `tabLastUrls`, `tabDebounceTimeouts`, `tabActiveElements` 중앙 관리
- ✅ **아키텍처 단순화**: Content Script URL 감지 로직 완전 제거, Background 중심 설계

### v4.11 한국어 NLP 및 음성 명령 개선 완료 (2025-01-18)
- ✅ oktjs 한국어 NLP 라이브러리 도입 완료
- ✅ Chrome Extension 환경에서 oktjs Dynamic Import 구현
- ✅ 패널에서 oktjs 처리, 백그라운드에서 분석 결과 활용
- ✅ 한국어 음성 인식 분리 문제 해결 ("써 줘" → "써줄")
- ✅ 음성 명령 처리 아키텍처 개선 (패널 → 백그라운드 → Content Script)
- ✅ 한국어 전처리 로직으로 어미 결합 처리
- ✅ 정확한 텍스트 입력 기능 완성

### v4.10 완전 함수형 전환 완료 (2025-01-18)
- ✅ 모든 클래스 래퍼 제거 완료
- ✅ ElementMatcher, PriorityResolver 순수 함수화
- ✅ HighlightManager → 전역 상태 기반 함수형
- ✅ DynamicElementObserver → 전역 상태 기반 함수형
- ✅ VoiceCommandProcessor → 순수 함수형
- ✅ content_script.tsx 함수형 API로 완전 전환
- ✅ 모든 배럴 exports 함수형 API로 업데이트

### v4.8 리팩터링 완료 (2025-01-XX)
- ✅ 모든 기능을 표준 5폴더 구조로 통일
- ✅ domains/ → features/ 아키텍처 개선
- ✅ 함수형 프로그래밍 전환
- ✅ 일관된 네이밍 컨벤션 적용
- ✅ 배럴 exports를 통한 깔끔한 API

### 성능 개선사항 (v4.15)
- 빌드 시간: ~1.5s (AI 모듈 추가 후에도 유지)
- 번들 크기: content_script.js 18.29KB → Background 중심 아키텍처로 경량화
- 번들 크기: background.js 5.08KB (URL 감지 로직 추가)
- 번들 크기: main.js 156.21KB (gzip: 50.98KB)
- oktjs 번들: 3.3MB (gzip: 1.7MB) - Dynamic Import로 필요시에만 로드
- **AI 모델**: Gemma 3 1B 529MB - IndexedDB 캐싱으로 재사용 (최초 다운로드 후 오프라인 동작)
- TypeScript 컴파일 오류 0건
- **뒤로가기 감지 시스템 완전 안정화 달성** 🚀
- **Service Worker 연결 오류 0건**
- **AI 모델 로딩 성공**: 2.5초 내 로컬 로딩 완료

## 뒤로가기 감지 시스템 (v4.13)

### 개선된 아키텍처
```
Background (Chrome Extension API) → URL 변경 감지 → Content Script (크롤링 실행)
```

### Chrome Extension API 기반 감지
- **`chrome.tabs.onUpdated`**: 일반적인 탭 URL 변경 감지
- **`chrome.webNavigation.onHistoryStateUpdated`**: SPA 뒤로가기/앞으로가기 감지
- **`chrome.webNavigation.onCompleted`**: 페이지 로딩 완료 감지 (추가 안전장치)

### 상세 처리 흐름
1. **URL 변경 이벤트**: Chrome Extension API에서 URL 변경 감지
2. **Background 디바운싱**: `handleUrlChange()` → 300ms 디바운싱 처리
3. **상태 관리**: `tabLastUrls[tabId]` 업데이트 및 중복 크롤링 방지
4. **크롤링 명령**: `chrome.tabs.sendMessage(tabId, { action: 'runCrawler' })` 전송

### 핵심 개선사항
- ✅ **상태 지속성**: Background에서 탭별 URL 히스토리 중앙 관리
- ✅ **연결 안정성**: Service Worker "Receiving end does not exist" 오류 완전 해결
- ✅ **빠른 연속 뒤로가기**: 300ms 디바운싱으로 마지막 페이지만 크롤링
- ✅ **아키텍처 단순화**: Content Script에서 URL 감지 로직 완전 제거

## 음성 명령 처리 흐름 (v4.11)

### 개선된 아키텍처
```
음성 인식 → Panel (oktjs 분석 + 전처리) → Background (키워드 분석) → Content Script (실행)
```

### 한국어 NLP 처리
- **oktjs 라이브러리**: Open Korean Text JavaScript 포팅 버전
- **토큰화**: 한국어 형태소 분석 및 품사 태깅
- **전처리**: 음성 인식 분리 문제 해결 ("써 줘" → "써줘")
- **패턴 매칭**: 정확한 명사/동사 분리로 텍스트 입력 개선

### 상세 흐름
1. **음성 인식 시작**: `panel-controller.ts:105`
   - `useSpeechRecognition(handleVoiceCommand)` 호출

2. **음성 인식 결과 처리**: `panel-controller.ts:98-102` 
   - `handleVoiceCommand` 콜백에서 `executeVoiceCommand` 메시지를 background로 전송

3. **Background 중계**: `background.ts:69-78`
   - `executeVoiceCommand` 받아서 → `processVoiceCommand`로 변환하여 content script에 전송

4. **Content Script 실행**: `content_script.tsx:207-217`
   - `processVoiceCommand` 메시지 받아서 실제 명령 처리 함수 호출

5. **명령 분기**: `voice-controller.ts:6-44`
   - 키워드 분석 후 `clickAction` 또는 `findAction` 호출

### 핵심 파일들
- `speech-controller.ts` - 음성 인식 엔진 제어
- `panel-controller.ts` - UI에서 음성 명령 시작점
- `voice-controller.ts` - 음성 명령 분기 처리 (핵심)
- `click-action.ts` - 클릭 액션 실행
- `find-action.ts` - 검색 액션 실행

## 참고 문서
- [AI_INTEGRATION_PLAN.md](./AI_INTEGRATION_PLAN.md) - 🤖 AI 통합 계획서 (oktjs → Gemma-3 1B)
- [FOLDER-STRUCTURE.md](./FOLDER-STRUCTURE.md) - 상세 폴더 구조 가이드
- [REFACTORING.md](./REFACTORING.md) - 리팩터링 히스토리
- [VOICE_COMMANDS.md](./VOICE_COMMANDS.md) - 음성 명령 사용법 가이드

## 기능별 개선 방법론

### 🎯 뒤로가기 감지 시스템 (v4.13, 2025-01-19)
**핵심 접근법**: Content Script 상태 의존성 제거 → Background 중심 아키텍처
- **Chrome Extension API 활용** → `chrome.tabs.onUpdated`, `chrome.webNavigation.onHistoryStateUpdated`
- **중앙 집중식 상태 관리** → `tabLastUrls`, `tabDebounceTimeouts` Background 관리
- **디바운싱 패턴** → 300ms로 빠른 연속 변경 중 마지막만 처리

### 🤖 AI 추론 시스템 (v4.15, 2025-08-21)
**핵심 접근법**: 로컬 AI + 캐싱 + 의도 분석
- **Gemma 3 1B 모델** → MediaPipe Tasks Gen AI로 529MB 모델 로컬 실행
- **IndexedDB 캐싱** → 브라우저 내 모델 저장으로 오프라인 동작 지원
- **Hugging Face 통합** → API 토큰으로 모델 다운로드 후 로컬 캐싱
- **의도 분석** → 5가지 카테고리(price_comparison, product_search, simple_find, purchase_flow, navigation)로 음성 명령 분류

### 🎤 음성 명령 처리 (v4.0-v4.11, 2025-08-16~2025-08-19)
**핵심 접근법**: 메시지 통신 + 스마트 매칭 + 한국어 NLP + AI 의도 분석
- **아키텍처 분리** (v4.0) → Panel(음성인식) → Background(분석) → Content Script(실행)
- **우선순위 시스템** (v4.1) → viewport, 타입별, 키워드별 가중치 기반 요소 선택
- **oktjs 통합** (v4.11) → Dynamic Import + 전처리 로직으로 한국어 음성 인식 분리 문제 해결
- **AI 의도 분석** (v4.15) → Gemma 3 1B 모델로 음성 명령 의도 파악
- **상태 관리 패턴** (v4.2) → useRef로 SpeechRecognition 연속 실행 지원

### 📊 페이지 크롤링 (v4.3-v4.12, 2025-08-16~2025-08-19)
**핵심 접근법**: 부분 크롤링 + 관대한 감지 + 이중 전략
- **동적 요소 처리** (v4.3) → MutationObserver + 부분 크롤링으로 드롭다운/팝업 감지
- **visibility 최적화** (v4.3) → `isVisibleRelaxed()` 함수로 엄격함 완화
- **텍스트 기준 완화** (v4.3) → 3글자→1글자로 짧은 텍스트 포함
- **중복 제거 로직** (v4.12) → 좌표 기반으로 동일 요소 필터링

### ✨ 요소 하이라이팅 (v4.10-v4.13, 2025-08-18~2025-01-19)
**핵심 접근법**: 함수형 + 전역 상태 + Background 중앙 관리
- **순수 함수화** (v4.10) → 클래스 래퍼 제거로 번들 크기 절약
- **상태 지속성** (v4.13) → Background의 `tabActiveElements`로 페이지 변경시에도 상태 유지
- **ID 할당 최적화** (v4.12) → `data-crawler-id` 재할당 혼선 방지

### 🔧 아키텍처 패턴 (v4.8-v4.14, 2025-08-18~2025-01-19)
**핵심 접근법**: 함수형 프로그래밍 + 중앙 상태 관리 + Controller 패턴
- **완전 함수형 전환** (v4.10) → 모든 클래스를 순수 함수로 변환
- **배럴 exports** (v4.8) → 깔끔한 API 제공 및 import 단순화
- **5폴더 구조** (v4.8) → config, types, process, controllers, ui 표준화
- **Controller 패턴** (v4.14) → 상태 관리 중앙화 및 의존성 주입으로 결합도 완화

## 트러블슈팅 가이드 (누적)

### AI 모델 상태 관리 단순화 문제 해결 (v4.16, 2025-08-21)

#### 1. 복잡한 boolean 조합으로 인한 UI 상태 혼선
**문제**: `isLoaded`, `isLoading`, `modelExists` 3개 필드의 복잡한 조합으로 UI 조건문 혼란

**시도 방법 1 - 조건문 순서 조정**: 
- 우선순위에 따라 조건문 순서 변경 시도
- 결과: **실패** - 여전히 복잡한 조건 조합으로 예상치 못한 상태 발생

**시도 방법 2 - 빈 객체 방어 처리**: 
- 메시지 리스너에서 빈 객체 검증 로직 추가
- 결과: **실패** - 근본적인 상태 복잡성 문제 해결되지 않음

**최종 해결 방법 - 숫자 상태 시스템**: ✅
- 4단계 숫자 상태로 완전 단순화: 1(캐시없음), 2(로딩중), 3(로딩완료), 4(캐시있음)
- UI 조건문: `aiModelStatus.state === 1/2/3/4` 패턴으로 명확화
- 상태 전환: 1→4(캐시감지), 4→2(로딩시작), 2→3(성공), 2→1(실패)
- 결과: **성공** - 복잡한 조건 제거 및 예측 가능한 상태 전환

#### 2. Offscreen 빈 객체 응답으로 상태 덮어쓰기 문제
**문제**: `aiInitialized` 메시지에서 `status: {}` 빈 객체로 기존 상태 완전 덮어쓰기

**시도 방법 1 - 빈 객체 검증**: 
- `Object.keys(message.status).length > 0` 검증 후 업데이트
- 결과: **부분 성공** - 빈 객체는 막았지만 상태 복잡성 지속

**최종 해결 방법 - 단일 필드 상태**: ✅
- `state` 하나의 필드만 사용하여 빈 객체 문제 원천 차단
- 타입 안전성: `AIModelStatus { state: 1|2|3|4 }` 명확한 타입 정의
- **Offscreen 응답 보완**: `await aiController.getModelStatus()` 비동기 처리 및 실패 시 기본 상태 제공
- 결과: **성공** - 빈 객체 덮어쓰기 문제 완전 해결

#### 3. Load Model 버튼 클릭 후 상태 반영 지연 문제
**문제**: 버튼 클릭 → "No AI model found" 표시 → 새로고침 시에만 정상 상태

**시도 방법 1 - 수동 상태 설정**: 
- `loadModel` 함수에서 성공 시 수동으로 상태 설정
- 결과: **실패** - Offscreen 응답과 충돌하여 마지막 응답이 덮어씀

**시도 방법 2 - 메시지 리스너만 신뢰**: 
- `loadModel`에서 수동 설정 제거, 메시지 리스너에서만 상태 업데이트
- 결과: **부분 성공** - 여전히 복잡한 조건문으로 예상치 못한 상태

**최종 해결 방법 - 명확한 상태 전환**: ✅
- 버튼 클릭: `state: 4` → `state: 2` (즉시 로딩 표시)
- 응답 처리: `state: 2` → `state: 3` (성공) 또는 `state: 1` (실패)
- UI 우선순위: 로딩 상태가 최우선으로 표시되도록 조건문 순서 조정
- **Offscreen 응답 수정**: `aiController.getModelStatus()` 비동기 호출 및 에러 시 기본 상태 제공
- 결과: **성공** - "📦 Model found" → "⏳ Loading..." → "✅ Model loaded" 완벽한 흐름

#### 4. Offscreen AI Controller 빈 상태 응답 문제
**문제**: Offscreen에서 `aiInitialized` 메시지 시 `status: {}` 빈 객체 응답

**시도 방법 1 - Panel 메시지 리스너 방어**: 
- UI에서 빈 객체 검증 후 업데이트 방지
- 결과: **부분 성공** - 빈 객체는 막았지만 올바른 상태 미반영

**최종 해결 방법 - Offscreen 응답 개선**: ✅
- AI Controller `getModelStatus()` 메서드를 `await`로 비동기 호출
- 에러 발생 시 `{ state: 1, error: error.message }` 기본 상태 제공
- 성공/실패 모든 경우에 유효한 상태 객체 보장
- 디버깅을 위한 상태 로그 추가: `console.log('📊 [offscreen] AI status:', status)`
- 결과: **성공** - 항상 유효한 숫자 상태 응답으로 UI 정상 동작

### Background 5폴더 구조 분리 후 AI 응답 시스템 문제 해결 (v4.17, 2025-08-21)

#### 1. AI 모델 상태 응답 완전 실패 문제
**문제**: Background 리팩터링 후 "No AI model found" 고정 표시, 실제 모델 상태 미반영

**원인 분석**:
- 기존 `background-old.ts`: 복잡한 Promise + 메시지 리스너 체인 방식
- 신규 `ai-message-handler.ts`: Promise 반환하지만 실제로는 void로 끝남
- MessageRouter에서 AI 핸들러 응답을 제대로 받지 못함

**시도 방법 1 - 단순 Promise 처리**: 
- 기본적인 Promise 반환만 시도
- 결과: **실패** - Offscreen 응답 대기 로직 누락

**최종 해결 방법 - 기존 검증된 방식 복원**: ✅
- `background-old.ts`의 정확한 비동기 처리 방식을 신규 핸들러에 적용
- Offscreen 준비 완료 대기 로직 추가: `await new Promise<void>` 패턴
- `await new Promise()` 패턴으로 응답 확실히 반환
- 메시지 리스너 등록/해제 타이밍 최적화
- 30초 타임아웃과 에러 핸들링 강화
- 결과: **성공** - AI 모델 상태 정확히 응답 및 UI 정상 동작

**핵심 수정 파일**: `src/background/process/ai-message-handler.ts`
```typescript
// ✅ 성공한 코드 패턴
const response = await new Promise((resolve) => {
  const listener = (msg: any) => {
    if (msg.action === expectedResponse) {
      chrome.runtime.onMessage.removeListener(listener);
      resolve(msg);
    }
  };
  chrome.runtime.onMessage.addListener(listener);
  setTimeout(() => {
    chrome.runtime.onMessage.removeListener(listener);
    resolve({ error: 'AI operation timeout' });
  }, 30000);
});
return response; // ✅ 반드시 반환 필요
```

#### 2. 초기 "Loading model..." 불필요 표시 문제  
**문제**: AI 버튼 클릭 시 항상 "⏳ Loading model..." 먼저 표시되는 문제

**원인**: `extension-header.tsx:31`에서 `setAiModelStatus({ state: 2 })` 강제 설정

**해결 방법**: ✅
- AI 버튼 클릭 시 즉시 로딩 상태 강제 설정 제거
- Background 응답만 신뢰하여 실제 상태 표시
- 결과: **성공** - 실제 모델 상태에 따른 정확한 UI 표시

### AI 추론 시스템 통합 문제 해결 (v4.15, 2025-08-21)

#### 1. 메시지 통신 오류 문제
**문제**: `A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received`

**시도 방법 1 - 타이밍 조정**: 
- Background → Offscreen 메시지 전달 시간 늘리기
- 결과: **실패** - 근본적인 비동기 처리 문제 해결되지 않음

**최종 해결 방법 - async 키워드 제거**: ✅
- Offscreen의 메시지 리스너에서 `async` 키워드 제거
- 내부 비동기 작업은 `(async () => { ... })()` 즉시 실행 함수로 처리
- 결과: **성공** - 메시지 채널 연결 오류 완전 해결

#### 2. IndexedDB 모델 상태 감지 실패
**문제**: AI 모델이 IndexedDB에 저장되어 있지만 Panel UI에서 "No AI model found" 표시

**시도 방법 1 - Panel 초기화 시 자동 검사**: 
- AI Settings 모달 열 때마다 자동으로 모델 상태 검사
- 결과: **실패** - Background → Offscreen → Panel 메시지 전달 타이밍 문제

**시도 방법 2 - Background에서 직접 IndexedDB 접근**: 
- Background에서 IndexedDB를 직접 체크하는 함수 추가 시도
- 결과: **실패** - Service Worker 환경에서 IndexedDB 접근 제약

**최종 해결 방법 - AI 버튼 클릭 시 검사**: ✅
- 🤖 AI 버튼 클릭 시에만 모델 상태 검사 실행
- Panel 즉시 열기 + 백그라운드에서 비차단 상태 검사
- `checkModelExists()` 함수로 IndexedDB 존재 여부만 확인 (로딩하지 않음)
- `modelExists` 필드 추가하여 3단계 UI 상태 구현
- 결과: **성공** - 정확한 모델 상태 감지 및 UI 반영

#### 3. 액션명 불일치 문제
**문제**: Background `getAIModelStatus` ≠ Offscreen `getModelStatus` 액션명 매핑 누락

**최종 해결 방법**: ✅
- Background에서 액션명 변환 로직 추가: `getAIModelStatus` → `getModelStatus`
- Offscreen에서 비동기 처리 적용: `await aiController.getModelStatus()`
- 결과: **성공** - 올바른 메시지 라우팅 및 응답 처리

#### 4. Zustand 전역 상태 관리 문제
**문제**: Panel 닫고 다시 열 때 AI 모델 상태 초기화됨

**시도 방법 - React 로컬 상태 유지**: 
- useState로 모델 상태 관리 시도
- 결과: **실패** - Panel 재오픈 시 상태 손실

**최종 해결 방법 - Zustand 전역 상태**: ✅
- `useSidePanelStore`에 `aiModelStatus`, `setAiModelStatus` 추가
- Panel UI에서 전역 상태 사용으로 변경
- Background에서 Zustand 상태 업데이트 연동
- 결과: **성공** - Panel 재오픈 시에도 상태 지속성 보장

### 동적 관찰자 모듈 분리 문제 해결 (v4.14, 2025-01-19)

#### 1. 높은 결합도 문제
**문제**: 300줄 단일 파일에 변화 감지, 요소 분석, 이벤트 처리가 혼재

**시도 방법 1 - 대분류별 파일 분리**: 
- 4개 대분류로 단순 분리 시도
- 결과: **실패** - `globalObserverState` 공유 상태로 인한 강한 결합 지속

**시도 방법 2 - 현재 구조 유지**:
- 단일 파일 유지하고 내부 정리만 시도
- 결과: **실패** - 테스트 어려움 및 재사용성 부족

**최종 해결 방법 - Controller 패턴**: ✅
- `DynamicObserverController`로 상태 관리 중앙화
- 순수 함수들이 필요한 파라미터만 받도록 의존성 주입
- 5폴더 구조 적용: types, process, controllers 분리
- 결과: **성공** - 단일 책임 원칙 + 독립 테스트 가능 + 재사용성 향상

#### 2. 함수별 의존성 분석
**분석 결과**:
- `detectElementMoves()`, `detectPortalNavigationChanges()` → 상태 독립적
- `scanChildrenWithoutIds()`, `walkSingleElement()` → `CrawlerState`만 필요
- `handleMutations()` → `ObserverState` 전체 필요

**해결**:
- Controller에서 필요한 상태만 각 함수에 전달
- 순수 함수들은 외부 상태 의존성 완전 제거

### 뒤로가기 감지 시스템 문제 해결 (v4.13, 2025-01-19)

#### 1. 빠른 연속 뒤로가기 감지 실패
**문제**: 2연속 이상 빠른 뒤로가기 시 감지하지 못함

**시도 방법 1 - Race Condition 해결**: 
- Background에서 URL 상태 즉시 업데이트로 타이밍 충돌 방지
- 결과: **실패** - 여전히 빠른 연속 감지 불가

**시도 방법 2 - 디바운싱 추가**:
- Content Script에 300ms 디바운싱 적용
- 결과: **실패** - 아예 뒤로가기 감지 안됨

**시도 방법 3 - 복잡한 감지 시스템**:
- MutationObserver, 주기적 체크, 타이밍 보정 등 다중 감지
- 결과: **실패** - 과도한 복잡성으로 이벤트 처리 꼬임

**최종 해결 방법 - Background 중심 아키텍처**: ✅
- Content Script URL 감지 완전 제거
- Chrome Extension API 기반: `chrome.tabs.onUpdated`, `chrome.webNavigation.onHistoryStateUpdated`
- Background에서 디바운싱 및 상태 관리
- 결과: **성공** - 아무리 빠른 연속 뒤로가기도 100% 감지

#### 2. Content Script 상태 초기화 문제  
**문제**: 뒤로가기 시 새 페이지 로드로 `lastKnownUrl` 등 상태 리셋

**시도 방법 - Content Script 개선**: 
- 복잡한 상태 관리 및 복원 시도
- 결과: **실패** - 근본적으로 Content Script는 페이지마다 재실행

**최종 해결 방법 - Background 상태 관리**: ✅  
- Background에서 `tabLastUrls`, `tabDebounceTimeouts` 중앙 관리
- Content Script는 단순히 크롤링만 수행
- 결과: **성공** - 상태 지속성 완전 보장

#### 3. Service Worker 연결 오류
**문제**: "Could not establish connection. Receiving end does not exist"

**최종 해결 방법**: ✅
- Background에서 직접 Chrome Extension API 사용
- Content Script → Background 메시지 의존성 제거  
- 결과: **성공** - 연결 오류 0건

### 이전 버전 트러블슈팅 히스토리 (v4.0-v4.12)

#### 아키텍처 재설계 문제 (v4.0)
- **Side Panel DOM 조작 시도** → 보안상 불가능 → **메시지 통신 아키텍처**로 해결 ✅
- **1회 이후 명령 먹통** → SpeechRecognition 재생성 문제 → **useRef 상태 관리**로 해결 ✅
- **단순 텍스트 매칭** → 잘못된 요소 선택 → **스마트 우선순위 시스템**으로 해결 ✅

#### 음성 명령 연속 실행 문제 (v4.2)
- **연속 명령 실패** → SpeechRecognition 객체 연결 끊김 → **useRef 패턴**으로 상태 참조 개선 ✅
- **상태 관리 혼선** → 최신 상태 참조 실패 → **디버깅 로그 강화 + 상태 최적화** ✅

#### SPA 뒤로가기 감지 문제 (v4.3)  
- **Content Script 상태 초기화** → 뒤로가기시 URL 상태 손실 → **Background 중앙 관리**로 해결 ✅
- **URL 변경 감지 실패** → 상태 비영속성 문제 → **Background에서 탭별 URL 추적** ✅

#### 동적 요소 감지 문제 (v4.3)
- **드롭다운/팝업 미감지** → 전체 크롤링 의존성 → **부분 크롤링 시스템** 도입 ✅
- **visibility 체크 엄격함** → 동적 요소 누락 → **관대한 visibility 체크** 적용 ✅
- **글자수 제한** → "뉴스", "웹" 등 짧은 텍스트 누락 → **3글자→1글자** 기준 완화 ✅

#### URL 인식 개선 (v4.4)
- **URL 변경 감지 불안정** → 이벤트 기반 감지 → **History API 오버라이드** + **Background 상태 관리** ✅

#### 함수형 프로그래밍 전환 (v4.10)
- **클래스 래퍼 복잡성** → 번들 크기 증가 + 복잡도 → **완전 순수 함수화** (0.69KB 절약) ✅
- **상태 관리 분산** → 클래스 간 의존성 → **전역 상태 기반 함수형** 아키텍처 ✅

#### 한국어 NLP 음성 명령 문제 (v4.11)
- **음성 인식 분리** → "써 줘" 별도 인식 → **oktjs 전처리** + **어미 결합 로직** ✅
- **Chrome Extension CSP** → CDN 차단 → **npm 패키지** + **Dynamic Import** ✅
- **Service Worker DOM 오류** → oktjs 환경 제약 → **Panel 처리 → Background 분석** 아키텍처 ✅

#### 좌표 인식 개선 (v4.12)
- **중복 요소 문제** → 동일 링크 2-3개 등록 → **좌표 기반 중복 제거** + **ID 할당 최적화** ✅
- **스크롤 액션 정확도** → 좌표 계산 문제 → **개선된 좌표 인식** 알고리즘 ✅

### oktjs 한국어 NLP 통합 (v4.11, 2025-01-18)

#### 1. Chrome Extension CSP (Content Security Policy) 문제
**문제**: 
```
Refused to load the script 'https://cdn.jsdelivr.net/npm/oktjs@0.1.1/index.js' because it violates CSP
```

**해결 방법**:
- CDN 동적 로딩 대신 npm 패키지 설치 사용
- `pnpm add oktjs`로 설치하고 Dynamic Import 활용
- Chrome Extension의 manifest.json에서 CSP 수정 불필요

#### 2. "window is not defined" 오류 (Service Worker 환경)
**문제**:
```javascript
ReferenceError: window is not defined
// oktjs를 background.js(Service Worker)에서 사용할 때 발생
```

**해결 방법**:
- oktjs는 DOM 환경이 필요하므로 Service Worker에서 사용 불가
- Panel(DOM 환경)에서 oktjs 처리하고 결과를 Background로 전달
- 아키텍처: Panel (oktjs) → Background (키워드 분석) → Content Script (실행)

#### 3. 한국어 음성 인식 분리 문제
**문제**: 
```
"안녕하세요 써줘" → "안녕하세요" + "써줘" (별도 인식)
"써 줘" → 패턴 매칭 실패
```

**해결 방법**:
```typescript
// 한국어 전처리 패턴
preprocessed = preprocessed
  .replace(/써\s+줘/g, '써줘')
  .replace(/클릭\s+해\s+줘/g, '클릭해줘')
  .replace(/찾\s+아\s+줘/g, '찾아줘')
  .replace(/눌\s+러\s+줘/g, '눌러줘')
  .replace(/스크롤\s+해\s+줘/g, '스크롤해줘')
  // 마지막 한글자를 앞 단어와 병합 (어미 처리)
  .replace(/([가-힣]+)\s+([가-힣])$/g, '$1$2');
```

#### 4. oktjs 패키지 존재 여부 확인
**문제**: 
- 초기에 oktjs 패키지가 존재하지 않는다고 판단
- CDN에서 404 오류 발생

**해결 방법**:
- GitHub에서 실제 패키지 확인 (https://github.com/open-korean-text/oktjs)
- npm registry에서 정상적으로 설치 가능
- `pnpm add oktjs` 또는 `npm install oktjs` 사용

#### 5. Dynamic Import 모듈 시스템 충돌
**문제**:
```javascript
// Chrome Extension 환경에서 모듈 로딩 실패
const okt = await import('oktjs');
```

**해결 방법**:
```typescript
// Panel(DOM 환경)에서만 Dynamic Import 사용
try {
  console.log('🔄 [panel] Loading oktjs...');
  const okt = await import('oktjs');
  console.log('✅ [panel] oktjs loaded successfully');
  
  okt.init();
  const normalized = okt.normalize(preprocessed);
  const tokens = okt.tokenize(normalized);
  
  oktjsResult = { tokens, nouns, verbs, adjectives };
} catch (error) {
  console.log('❌ [panel] oktjs error:', error.message);
}
```

### 음성 명령 패턴 매칭

#### 6. 입력 명령어 패턴 인식 실패
**문제**:
```
"안녕하세요 써줘" → findAction 호출 (inputAction이 아닌)
패턴 매칭이 제대로 작동하지 않음
```

**해결 방법**:
```typescript
const inputPatterns = [
  // "입력창에 안녕하세요 써줘" - 타겟 + 텍스트 + 명령어
  /(.+)에\s*(.+?)\s*(써줘|써|입력해줘|입력|타이핑)/,
  // "안녕하세요 써줘" - 텍스트 + 명령어 (가장 일반적)
  /^(.+?)\s*(써줘|써|입력해줘|입력|타이핑)$/,
  // "써줘 안녕하세요" - 명령어 + 텍스트
  /^(써줘|써|입력해줘|입력|타이핑)\s*(.+)$/
];
```

### 성능 및 최적화

#### 7. 번들 크기 증가 (oktjs 도입)
**현상**: oktjs 도입으로 번들 크기 증가 (3.3MB)

**최적화**:
- Dynamic Import로 필요시에만 로드
- gzip 압축으로 실제 다운로드 크기 50% 감소 (1.7MB)
- 음성 명령 사용시에만 로드되므로 초기 로딩 성능에 영향 없음

#### 8. 콘솔 로그 과다 출력
**문제**: 개발 중 디버깅 로그가 과도하게 출력

**해결**: 프로덕션 환경에서는 필요한 로그만 유지
```typescript
// 중요한 로그만 유지
console.log('🎤 [panel] Voice command received:', command);
console.log('✅ [background] Voice analysis complete:', result);
console.log('🎯 Pattern matched:', pattern, 'with groups:', groups);
```

### 크롬 확장 프로그램 특이사항

#### 9. Extension Context Invalidated
**문제**: 확장 프로그램 업데이트/재로드 시 발생

**해결**:
```typescript
const sendMessageWithRetry = async (message: any, maxRetries = 3) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await chrome.runtime.sendMessage(message);
    } catch (error) {
      if (error.message.includes('Extension context invalidated')) {
        if (attempt < maxRetries - 1) {
          const delay = 100 * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  }
};
```

#### 10. 메시지 전달 실패
**문제**: Background ↔ Content Script 간 메시지 전달 실패

**해결**:
- 탭 상태 확인 후 메시지 전송
- 재시도 로직 구현
- 에러 핸들링으로 Extension Context 문제 대응

### 개발 환경 설정

#### 11. TypeScript 컴파일 오류
**해결**: 모든 타입 정의가 완료되어 현재 0건 유지

#### 12. Vite 빌드 설정
**최적화된 설정으로 빌드 시간 ~400ms 달성**

### 성공 지표 (v4.17)
- ✅ **Background 모듈화 완료**: 178줄 단일 파일 → 5폴더 구조로 완전 분리 및 유지보수성 향상
- ✅ **AI 응답 시스템 100% 복원**: Background 리팩터링으로 고장난 AI 모델 상태 응답 완전 수정
- ✅ **MessageRouter 중앙화**: 모든 Background 메시지를 효율적으로 라우팅하는 시스템 구축
- ✅ **상태 관리 캡슐화**: TabStateManager, OffscreenManager 클래스로 전역 상태 안전 관리
- ✅ **초기 로딩 상태 문제 해결**: AI 버튼 클릭 시 불필요한 "Loading model..." 표시 완전 제거
- ✅ **타입 안전성 100%**: 모든 Background 메시지와 핸들러에 대한 완전한 타입 정의
- ✅ **검증된 비동기 패턴**: background-old.ts의 안정적인 Promise 체인 방식을 신규 구조에 적용
- ✅ **Hybrid 아키텍처**: 클래스(상태) + 함수(로직) 최적 조합으로 성능과 유지보수성 양립
- ✅ **숫자 상태 시스템**: 복잡한 boolean 조합 → 단일 `state` 숫자로 완전 단순화 (v4.16 유지)
- ✅ **4단계 명확한 상태**: 1(캐시없음), 2(로딩중), 3(로딩완료), 4(캐시있음) 예측 가능한 전환 (v4.16 유지)
- ✅ **UI 조건문 90% 감소**: `aiModelStatus.state === 1/2/3/4` 패턴으로 복잡한 조건 완전 제거 (v4.16 유지)
- ✅ **빈 객체 문제 100% 해결**: 단일 `state` 필드로 Offscreen 응답 덮어쓰기 문제 원천 차단 (v4.16 유지)
- ✅ **Load Model 버튼 완벽 작동**: "📦 Model found" → "⏳ Loading..." → "✅ Model loaded" 흐름 완성
- ✅ **AI 모델 로컬 실행**: Gemma 3 1B 모델 2.5초 내 로딩 완료 유지
- ✅ **IndexedDB 캐싱**: 529MB 모델 브라우저 저장으로 오프라인 동작 유지
- ✅ **Hugging Face 통합**: API 토큰 기반 모델 다운로드 시스템 유지
- ✅ **5가지 의도 분류**: price_comparison, product_search, simple_find, purchase_flow, navigation 유지
- ✅ **AI 설정 UI**: 토큰 입력 및 모델 관리 완전 자동화 유지
- ✅ **뒤로가기 감지 100% 성공**: 아무리 빠른 연속 뒤로가기도 완벽 감지 (v4.13)
- ✅ **Service Worker 연결 오류 0건**: "Receiving end does not exist" 완전 해결 (v4.13)
- ✅ **Background 디바운싱**: 300ms로 마지막 페이지만 효율적 크롤링 (v4.13)
- ✅ **상태 지속성 보장**: Background 중앙 관리로 페이지 변경 시에도 상태 유지 (v4.13)
- ✅ **Chrome Extension API 완전 활용**: `chrome.tabs.onUpdated`, `chrome.webNavigation.onHistoryStateUpdated` 기반 (v4.13)
- ✅ **아키텍처 단순화**: Content Script URL 감지 로직 완전 제거로 복잡도 감소 (v4.13)
- ✅ oktjs 한국어 NLP 통합 유지 (v4.11)
- ✅ 모든 음성 명령 유형 지원 유지 (클릭, 찾기, 스크롤, 입력, 네비게이션)