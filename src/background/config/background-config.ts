// Background 설정 및 상수 정의

/**
 * 디바운싱 및 타이밍 설정
 */
export const TIMING_CONFIG = {
  URL_DEBOUNCE_DELAY: 300,          // URL 변경 디바운싱 (ms)
  AI_OPERATION_TIMEOUT: 30000,     // AI 작업 타임아웃 (ms)
  MESSAGE_RESPONSE_TIMEOUT: 5000,  // 일반 메시지 응답 타임아웃 (ms)
  OFFSCREEN_INIT_TIMEOUT: 10000    // Offscreen 초기화 타임아웃 (ms)
} as const;

/**
 * Chrome Extension API 설정
 */
export const CHROME_CONFIG = {
  SIDE_PANEL: {
    OPEN_ON_ACTION_CLICK: true
  },
  OFFSCREEN: {
    URL: 'offscreen.html',
    REASONS: ['WORKERS' as chrome.offscreen.Reason],
    JUSTIFICATION: 'AI inference using MediaPipe requires DOM context'
  }
} as const;

/**
 * 로깅 설정
 */
export const LOGGING_CONFIG = {
  ENABLED: true,
  PREFIXES: {
    ROUTER: '📨 [router]',
    VOICE_HANDLER: '🎤 [voice-handler]',
    AI_HANDLER: '🤖 [ai-handler]',
    HIGHLIGHT_HANDLER: '🎯 [highlight-handler]',
    URL_HANDLER: '🔄 [url-handler]',
    TAB_MANAGER: '📋 [tab-manager]',
    OFFSCREEN_MANAGER: '📄 [offscreen]'
  }
} as const;

/**
 * AI 액션 매핑 설정
 */
export const AI_MAPPING_CONFIG = {
  DEFAULT_CONFIDENCE: 0.5,
  MIN_CONFIDENCE: 0.3,
  
  // AI 의도별 기본 신뢰도
  INTENT_CONFIDENCE: {
    price_comparison: 0.8,
    product_search: 0.9,
    simple_find: 0.7,
    purchase_flow: 0.8,
    navigation: 0.9,
    unknown: 0.3
  },
  
  // oktjs 기반 액션별 신뢰도
  OKTJS_CONFIDENCE: {
    click: 0.8,
    input: 0.8,
    find: 0.7,
    navigation: 0.6,
    scroll: 0.5
  }
} as const;

/**
 * 메시지 액션 타입 검증용
 */
export const VALID_ACTIONS = {
  AI_ACTIONS: [
    'getAIModelStatus',
    'deleteAIModel', 
    'downloadAIModel',
    'initializeAI',
    'testAIAnalysis'
  ],
  VOICE_ACTIONS: [
    'executeVoiceCommand'
  ],
  HIGHLIGHT_ACTIONS: [
    'highlightElement',
    'setActiveElement'  
  ],
  SYSTEM_ACTIONS: [
    'offscreenReady'
  ]
} as const;

/**
 * 에러 메시지 템플릿
 */
export const ERROR_MESSAGES = {
  UNKNOWN_ACTION: 'Unknown action',
  TAB_NOT_FOUND: 'Tab not found or inaccessible',
  OFFSCREEN_NOT_READY: 'Offscreen document not ready',
  AI_OPERATION_FAILED: 'AI operation failed',
  CONTENT_SCRIPT_ERROR: 'Content script communication error',
  TIMEOUT: 'Operation timeout'
} as const;