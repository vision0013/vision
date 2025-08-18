# Claude Code 프로젝트 정보

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
- 빌드 시간: ~421ms
- 번들 크기: content_script.js 13.23KB (0.69KB 감소)
- 번들 크기: main.js 153KB (gzip: 49KB)
- TypeScript 컴파일 오류 0건
- **100% 함수형 프로그래밍 달성** 🚀

## 음성 명령 처리 흐름

### 전체 아키텍처
```
음성 인식 → Panel → Background → Content Script → Voice Controller → Action
```

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