# 표준 폴더 구조

## 기본 원칙

각 기능(feature)은 다음 5개 폴더로 구성됩니다:

```
src/features/{feature-name}/
├── config/        # 설정과 상수
├── types/         # 타입 정의  
├── process/       # 동적 작업과 로직
├── controllers/   # 전체 흐름 조합 및 API 제공
└── index.ts       # 모듈 export
```

## 각 폴더 역할

### 📁 config/
- **목적**: 설정값, 상수, 환경변수 관리
- **내용**: 
  - 상수 정의 (`MAX_NODES`, `TARGET_TAGS` 등)
  - 설정 객체
  - 환경별 설정
- **파일명 예시**: `constants.ts`, `settings.ts`, `env.ts`

### 📁 types/
- **목적**: 타입 정의 및 인터페이스 관리  
- **내용**:
  - 인터페이스 정의
  - 타입 별칭
  - 제네릭 타입
- **파일명 예시**: `{feature-name}-state.ts`, `api-types.ts`, `common-types.ts`

### 📁 process/
- **목적**: 모든 동적 작업, 비즈니스 로직, 유틸리티
- **내용**:
  - 핵심 비즈니스 로직
  - 데이터 처리 함수
  - 유틸리티 함수
  - 상태 관리 로직
- **파일명 규칙**: `{action}-{target}.ts` (케밥케이스)
- **파일명 예시**: 
  - `state-management.ts` - 상태 생성/관리
  - `text-processing.ts` - 텍스트 처리
  - `data-validation.ts` - 데이터 검증
  - `api-communication.ts` - API 통신

### 📁 controllers/
- **목적**: 전체 흐름 조합 및 외부 API 제공
- **내용**:
  - process 모듈들을 조합하여 완전한 기능 구현
  - 외부에서 사용할 공개 API 정의
  - 전체 흐름 제어
- **파일명 예시**: `{feature-name}-controller.ts`, `main-controller.ts`

### 📄 index.ts
- **목적**: 모듈의 공개 API 정의
- **내용**: 외부에서 사용할 함수, 객체, 타입만 export

## 적용 예시: page-analysis

```
src/features/page-analysis/
├── config/
│   └── constants.ts           # MAX_NODES, TARGET_TAGS, SKIP_TAGS
├── types/
│   └── crawler-state.ts       # CrawlerState 인터페이스
├── process/
│   ├── state-management.ts    # createCrawlerState, updateVisibility
│   ├── text-processing.ts     # normText
│   ├── element-analysis.ts    # isCurrentlyVisible, roleOf, bbox
│   └── dom-walking.ts         # walkElement, removeDuplicates
├── controllers/
│   └── crawler-controller.ts  # analyze, analyzeElements (기존 crawler.ts)
├── dynamicObserver.ts         # 기존 파일 (필요시 process/로 이동)
└── index.ts                   # pageCrawler, analyze, analyzeElements export
```

## 네이밍 컨벤션

### 폴더명
- **소문자 단수형**: `config`, `types`, `process`, `controllers`
- **복수형 사용**: `controllers` (여러 컨트롤러 파일 가능성)

### 파일명  
- **케밥케이스**: `kebab-case`
- **2-3단어 제한**: `action-target.ts`
- **컨트롤러**: `{feature-name}-controller.ts`

### 함수/변수명
- **카멜케이스**: `camelCase`
- **동사+명사**: `createState`, `processText`, `analyzeElement`

## 장점

1. **일관성**: 모든 기능이 동일한 구조
2. **확장성**: 새 기능 추가 시 표준 구조 적용
3. **유지보수성**: 파일 위치 예측 가능
4. **협업 효율성**: 팀원 모두가 동일한 구조 이해
5. **테스트 용이성**: process 단위로 테스트 작성

## 적용 완료 현황

✅ **완료된 기능들:**
- `page-analysis` - 크롤러 기능 (함수형 전환 + 표준 구조)
- `highlighting` - 하이라이팅 기능
- `voice-commands` - 음성 명령 기능  
- `voice-recognition` - 음성 인식 기능
- `filtering` - 필터링 기능
- `permissions` - 권한 관리 기능
- `side-panel-management` - 사이드패널 관리 기능 (domains에서 이동)

## 아키텍처 원칙

### features vs sections 분리
- **features/**: 비즈니스 로직과 기능 구현
- **sections/**: UI 조립과 레이아웃 관리

### 의존성 방향
```
sections/ui → features → shared utilities
```

### 빌드 명령어
```bash
npm run build  # 빌드 테스트 및 타입 체크
```