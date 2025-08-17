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

### 함수형 프로그래밍
- 클래스 기반 → 함수형으로 전환 완료
- 클로저를 활용한 상태 관리
- 순수 함수 지향

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

### v4.8 리팩터링 완료 (2025-01-XX)
- ✅ 모든 기능을 표준 5폴더 구조로 통일
- ✅ domains/ → features/ 아키텍처 개선
- ✅ 함수형 프로그래밍 전환
- ✅ 일관된 네이밍 컨벤션 적용
- ✅ 배럴 exports를 통한 깔끔한 API

### 성능 개선사항
- 빌드 시간: ~400ms
- 번들 크기: main.js 153KB (gzip: 49KB)
- TypeScript 컴파일 오류 0건

## 참고 문서
- [FOLDER-STRUCTURE.md](./FOLDER-STRUCTURE.md) - 상세 폴더 구조 가이드
- [REFACTORING.md](./REFACTORING.md) - 리팩터링 히스토리