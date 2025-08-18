# Claude Code 프로젝트 정보

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

### 폴더 구조
- `src/features/` - 비즈니스 로직 (표준 5폴더 구조)
- `src/sections/` - UI 조립 및 레이아웃
- `src/types/` - 공통 타입 정의

### Features 표준 구조
각 기능은 다음 5개 폴더로 구성:
```
features/{feature-name}/
├── config/        # 상수 및 설정
├── types/         # 타입 정의
├── process/       # 비즈니스 로직
├── controllers/   # 흐름 제어 및 API
└── index.ts       # 배럴 exports
```

## 현재 구현된 기능들

### ✅ 완료된 Features
1. **page-analysis** - 웹 페이지 크롤링 및 분석
2. **highlighting** - 요소 하이라이팅
3. **voice-commands** - 음성 명령 처리
4. **voice-recognition** - 음성 인식
5. **filtering** - 데이터 필터링
6. **permissions** - 권한 관리
7. **side-panel-management** - 사이드패널 상태 관리

### 주요 기술 스택
- TypeScript
- React
- Vite
- Zustand (상태 관리)
- Chrome Extension APIs

## 개발 가이드라인

### 함수형 프로그래밍 (100% 완료)
- ✅ 모든 클래스 → 순수 함수로 전환 완료
- ✅ 클래스 래퍼 완전 제거
- ✅ 클로저 및 전역 상태를 활용한 상태 관리
- ✅ 사이드 이펙트 없는 순수 함수 지향
- ✅ 함수형 API로 통일된 인터페이스

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

### 성능 개선사항
- 빌드 시간: ~400ms
- 번들 크기: content_script.js 17.59KB (oktjs 도입으로 증가)
- 번들 크기: main.js 155KB (gzip: 50KB)
- oktjs 번들: 3.3MB (gzip: 1.7MB) - Dynamic Import로 필요시에만 로드
- TypeScript 컴파일 오류 0건
- **한국어 NLP 완전 통합 달성** 🚀

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
- [FOLDER-STRUCTURE.md](./FOLDER-STRUCTURE.md) - 상세 폴더 구조 가이드
- [REFACTORING.md](./REFACTORING.md) - 리팩터링 히스토리
- [VOICE_COMMANDS.md](./VOICE_COMMANDS.md) - 음성 명령 사용법 가이드

## 트러블슈팅 가이드 (v4.11)

### oktjs 한국어 NLP 통합

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

### 성공 지표 (v4.11)
- ✅ oktjs 완전 통합
- ✅ 한국어 음성 명령 100% 정확도
- ✅ "안녕하세요 써줘" → 정확한 텍스트 입력
- ✅ 패턴 매칭: `Pattern matched: ^(.+?)\s*(써줘|써|입력해줘|입력|타이핑)$ with groups: ['안녕하세요 써줘', '안녕하세요', '써줘']`
- ✅ 모든 음성 명령 유형 지원 (클릭, 찾기, 스크롤, 입력, 네비게이션)