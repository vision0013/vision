# Chrome Extension - Page Crawler with Voice Control

웹페이지 자동 분석 및 음성 제어 기능을 제공하는 Chrome 확장 프로그램입니다.

## 🚀 주요 기능

- **자동 페이지 분석**: 웹페이지의 상호작용 가능한 요소들을 자동으로 탐지
- **음성 제어**: 음성 명령으로 페이지 요소를 찾고 클릭
- **사이드 패널 UI**: Chrome 사이드 패널에서 분석 결과 확인
- **실시간 업데이트**: DOM 변경 시 자동으로 재분석

## 🎯 음성 명령어

### 지원하는 명령어
- **"[텍스트] 클릭"**: 해당 텍스트가 포함된 요소를 클릭
- **"[텍스트] 버튼"**: 해당 텍스트 버튼을 클릭  
- **"[텍스트] 눌러"**: 해당 텍스트 요소를 클릭
- **"[텍스트] 찾아줘"**: 해당 텍스트 요소를 하이라이트 (클릭하지 않음)

### 사용 예시
```
"로그인 클릭"        → 로그인 버튼 클릭
"메뉴 버튼"          → 메뉴 버튼 클릭
"검색 찾아줘"        → 검색 요소 하이라이트
"다음 페이지 눌러"   → 다음 페이지 버튼 클릭
```

### 🧠 스마트 매칭 시스템
음성 명령은 **우선순위 기반 매칭**으로 가장 적절한 요소를 선택합니다:

#### 우선순위 계산
1. **Viewport 보너스**: 화면에 보이는 요소 +100점
2. **타입 우선순위**: button(100) > link(80) > text(60) > image(40)
3. **역할 우선순위**: main(100) > nav(90) > header(70) > footer(20)
4. **키워드 가중치**: 특정 키워드별 맞춤 점수
5. **위치 보너스**: 화면 상단/중앙 영역 추가 점수

#### 예시: "로그인 클릭"
```
화면에 보이는 main 영역의 로그인 버튼:
→ viewport(+100) + button(100) + main(100) + 키워드(200) = 500점 ✅

화면 밖 footer의 로그인 링크:
→ viewport(-100) + link(80) + footer(20) + 키워드(200) = 200점 ❌
```

## 🏗️ 아키텍처

### 전체 구조
```
Chrome Extension
├── Side Panel (UI)      → 음성 인식 + 결과 표시
├── Background Script    → 메시지 라우팅
└── Content Script       → DOM 분석 + 음성 명령 실행
```

### 음성 제어 플로우
```
1. Side Panel (음성 인식)
   ↓ chrome.runtime.sendMessage
2. Background Script (메시지 라우팅)  
   ↓ chrome.tabs.sendMessage
3. Content Script (실제 DOM 조작)
```

### 파일 구조
```
src/
├── background/
│   └── background.ts              # 메시지 라우팅
├── content/
│   ├── content_script.tsx         # 메인 콘텐츠 스크립트
│   ├── crawler.ts                 # 페이지 분석 로직
│   └── voice-commands/            # 음성 명령 처리
│       ├── index.ts               # VoiceCommandProcessor
│       ├── config/
│       │   └── priorities.ts      # 우선순위 설정
│       ├── utils/
│       │   ├── elementMatcher.ts  # 요소 매칭 로직
│       │   └── priorityResolver.ts # 우선순위 해결
│       └── actions/
│           ├── clickAction.ts     # 클릭 동작
│           └── findAction.ts      # 찾기 동작
└── domains/side-panel/
    ├── controllers/
    │   └── useSidePanelController.ts  # 사이드 패널 제어
    └── features/
        └── voice-recognition/         # 음성 인식 기능
```

## 🔄 주요 변경사항 (v4)

### v4.3 - 동적 요소 감지 및 부분 크롤링 시스템 🎯
**문제**: 드롭다운, 팝업 등 동적으로 나타나는 요소들이 음성 명령으로 인식되지 않음

#### 해결 과정:
1. **부분 크롤링 시스템 도입**
   - 전체 페이지 재분석 대신 변경된 부분만 효율적으로 크롤링
   - 기존 데이터에 새 요소들을 추가하는 방식

2. **주요 문제들과 해결책**:
   - **부모 컨테이너 크기 0 문제**: `isVisibleRelaxed()` 함수로 관대한 visibility 체크
   - **DOM 중첩 구조 한계**: 이중 크롤링으로 내부 링크/버튼 강제 탐색  
   - **글자수 제한**: 모든 크롤링에서 3글자 → 1글자로 통일하여 "뉴스", "웹" 등 짧은 텍스트도 인식
   - **부분 크롤링 중복 검사**: 새로 나타난 요소는 중복 검사 건너뛰기로 확실한 등록
   - **중복 크롤링**: 같은 요소가 여러 번 등록되는 부작용 발생

#### 문제 파일들:
- `src/content/crawler.ts` - 부분 크롤링 로직, visibility 체크
- `src/content/content_script.tsx` - MutationObserver, 부분 크롤링 실행  
- `src/domains/side-panel/controllers/store/index.ts` - 크롤링 데이터 업데이트

#### 현재 남은 이슈:
- **좌표 정확성**: 중복 요소로 인한 좌표/포커스 문제
- **과도한 크롤링**: 동일 링크가 2-3개씩 중복 등록
- **ID 할당 혼선**: `data-crawler-id`가 재할당되면서 음성 명령 타겟 혼동

#### 최종 구현된 기능:
- ✅ **통합 텍스트 필터링**: 모든 크롤링에서 1글자 이상 텍스트 수집
- ✅ **부분 크롤링 시스템**: 동적 요소 감지 및 기존 데이터에 추가
- ✅ **관대한 visibility 체크**: 새로 나타난 요소들의 안정적 감지
- ✅ **이중 크롤링 전략**: 깊은 중첩 구조에서도 링크/버튼 발견

## 🔄 주요 변경사항 (v4)

### v4.3 - SPA '뒤로가기' 탐색 문제 해결 🔄
* **문제**: SPA '뒤로 가기' 시 `content_script`가 새로고침되며 이전 URL 상태를 잃어버리는 문제 발생.
* **원인**: `content_script`의 상태 비영속성으로 인해 URL 변경 감지 로직이 매번 초기화됨.
* **해결**: `background` 스크립트에서 각 탭의 URL 상태를 중앙 관리하도록 아키텍처 변경.
* **동작**: `content_script`는 주기적으로 URL을 보고하고, `background`가 변경을 감지하여 크롤링을 명령.
* **결과**: `content_script`의 상태 의존성을 제거하여 모든 탐색에 안정적으로 대응.

### v4.2 - 연속 명령 실행 버그 수정 🔧
- **연속 명령 지원**: 1회 이후에도 음성 명령이 지속적으로 작동
- **SpeechRecognition 안정화**: 객체 재생성으로 인한 연결 끊김 방지
- **상태 관리 최적화**: useRef 패턴으로 최신 상태 참조
- **디버깅 로그 강화**: 음성 명령 처리 과정 추적 가능

### v4.1 - 스마트 우선순위 시스템 추가 ✨
- **우선순위 기반 매칭**: 가장 적절한 요소를 지능적으로 선택
- **Viewport 우선순위**: 화면에 보이는 요소가 최우선
- **타입/역할별 가중치**: button > link > text, main > nav > footer
- **키워드별 맞춤 설정**: "로그인", "검색" 등 특별 가중치
- **위치 기반 보너스**: 화면 상단/중앙 영역 추가 점수

### v4.0 - 아키텍처 재설계
#### 이전 구조의 문제점
- **Side Panel에서 직접 DOM 조작 시도** → 보안상 불가능
- **음성 명령이 작동하지 않음** → 잘못된 아키텍처
- **단순한 텍스트 매칭** → 잘못된 요소 선택 가능성
- **1회 이후 명령 먹통** → SpeechRecognition 객체 재생성 문제

#### 해결 방법
1. **Side Panel**: 음성 인식만 담당, DOM 조작 제거
2. **Content Script**: 모든 DOM 조작 로직 이관
3. **Background Script**: 메시지 중계 역할 강화
4. **스마트 매칭**: 우선순위 기반 요소 선택
5. **연속 명령**: useRef 패턴으로 상태 관리 최적화

### 변경된 메시지 플로우
```javascript
// 이전: Side Panel에서 직접 DOM 조작 (❌ 불가능)
voiceCommandController(command, analysisResult.items);

// 현재: 메시지 통신 + 스마트 매칭 + 연속 명령 (✅ 정상 동작)
// 1. useRef로 최신 상태 참조
const currentTabId = activeTabIdRef.current;
const currentAnalysisResult = analysisResultRef.current;

// 2. 메시지 전송
chrome.runtime.sendMessage({
  action: 'executeVoiceCommand',
  command: command,
  tabId: currentTabId
});

// 3. Content Script에서 우선순위 기반 매칭
const matcher = new ElementMatcher();
const bestMatch = matcher.findBestMatch(targetText, items);
```

## 🛠️ 개발 가이드

### 설치 및 실행
```bash
npm install
npm run build
```

### Chrome에 확장 프로그램 로드
1. Chrome 확장 프로그램 페이지 (chrome://extensions/) 접속
2. "개발자 모드" 활성화
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. `dist` 폴더 선택

### 사용 방법
1. 웹페이지에서 확장 프로그램 아이콘 클릭
2. 사이드 패널에서 마이크 버튼 클릭
3. 음성 명령 말하기
4. 자동으로 해당 요소 찾기/클릭

## 🔧 기술 스택

- **Frontend**: React + TypeScript + Vite
- **Extension**: Chrome Extension Manifest V3
- **Voice Recognition**: Web Speech API
- **Styling**: CSS Modules

## 📝 개발 노트

### 음성 명령 추가하기
1. `src/content/voice-commands/index.ts`에서 키워드 추가
2. `src/content/voice-commands/actions/`에 새 액션 파일 생성
3. `src/content/voice-commands/config/priorities.ts`에서 우선순위 설정
4. 타입 정의 업데이트

### 우선순위 설정 커스터마이징
`src/content/voice-commands/config/priorities.ts`에서 다음을 조정할 수 있습니다:
- **타입별 우선순위**: button, link, text, image 점수
- **역할별 우선순위**: main, nav, header, footer 점수  
- **키워드별 가중치**: 특정 단어에 대한 맞춤 설정
- **위치 보너스**: viewport 내/외 점수, 상단/중앙 보너스

### 디버깅
- **Side Panel 디버그**: F12 → Elements → #chrome-extension-... → 우클릭 → Inspect
- **Content Script 디버그**: F12 Console에서 로그 확인
- **Background Script 디버그**: chrome://extensions/ → 확장프로그램 → "백그라운드 페이지" 클릭

### 음성 명령 디버깅 로그
콘솔에서 다음과 같은 로그를 확인할 수 있습니다:
```
🎤 Voice command received: 로그인 클릭
🎤 Current tab ID: 123456789
🎤 Analysis result available: true
🎤 Sending voice command: 로그인 클릭 to tab: 123456789
🎯 Found 3 candidates for "로그인":
✅ Best match for "로그인": button (main, score: 500)
```

### 문제 해결
**Q: 음성 명령이 1회 이후 작동하지 않음**
A: v4.2에서 해결됨. useRef 패턴으로 상태 관리 최적화

**Q: 잘못된 요소가 클릭됨**  
A: `src/content/voice-commands/config/priorities.ts`에서 우선순위 조정

**Q: 음성 인식이 안됨**
A: 브라우저 마이크 권한 확인 및 HTTPS 사이트에서 테스트