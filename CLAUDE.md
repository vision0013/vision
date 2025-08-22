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
│   │   │   └── ai-controller.ts     # Gemma 3 4B 모델 관리 (IndexedDB 캐싱)
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

# v4.18 성공 지표 (2025-01-28)

## 🎯 AI 모델 저장 시스템 최적화 (OPFS 전용)

### 핵심 성과
- **✅ 저장 공간 50% 절약**: 4.8GB → 2.4GB (IndexedDB 중복 제거)
- **✅ AI 정확도 유지**: 22/23 (95.7%) - Gemma3-4B-IT 모델
- **✅ 응답 속도**: 평균 347ms (우수)
- **✅ 카테고리별 성과**: 대부분 100% 정확도

### 기술적 개선사항
- **OPFS 스트리밍 저장**: 다운로드 중 직접 파일 시스템에 쓰기
- **Object URL 활용**: modelAssetPath 방식으로 메모리 효율적 로드
- **코드 단순화**: IndexedDB 관리 로직 완전 제거 (5KB 감소)
- **안정성 향상**: 단일 파일 시스템으로 관리 복잡도 감소

### AI 성능 세부 결과
```
📊 Overall Accuracy: 22/23 (95.7%)
⚡ Average Response Time: 347ms  
🎯 Average Confidence: 0.80

📋 Category Results:
   📂 edge_product_price: 5/5 (100.0%)
   📂 edge_ui_search: 3/4 (75.0%)
   📂 edge_nav_ui: 4/4 (100.0%)  
   📂 edge_purchase_ui: 3/3 (100.0%)
   📂 edge_purchase_nav: 1/1 (100.0%)
   📂 edge_complex: 3/3 (100.0%)
   📂 edge_natural: 3/3 (100.0%)
```

### 아키텍처 진화
**이전**: `Hugging Face` → `IndexedDB Blob` → `OPFS 복사` → `Object URL` → `ModelAssetPath`
**현재**: `Hugging Face` → `OPFS 직접 스트리밍` → `Object URL` → `ModelAssetPath`

### 트러블슈팅 해결
- **용량 문제**: IndexedDB + OPFS 이중 저장 → OPFS 단일 저장
- **상태 인식 오류**: 다운로드 중 상태 스킵 로직 → 실제 파일 존재 여부 체크
- **메모리 한계**: ArrayBuffer 2GB 제한 → Object URL 방식으로 회피

### 향후 최적화 방향
- AI 모델 응답 품질 개선 (현재 95.7% → 목표 98%+)
- 검색 UI 카테고리 정확도 향상 (현재 75% → 목표 90%+)
- 모델 로딩 시간 단축 (첫 로드 최적화)

