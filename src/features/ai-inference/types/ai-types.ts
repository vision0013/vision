// AI 추론 관련 타입 정의

export interface VoiceIntent {
  action: 'price_comparison' | 'product_search' | 'simple_find' | 'purchase_flow' | 'navigation' | 'unknown';
  product?: string;
  target?: string;
  detail?: string;
  context?: any;
  confidence: number; // 0-1 사이의 신뢰도
    reasoning?: string; // ✨ 추가
}

export interface AIAnalysisResult {
  intent: VoiceIntent;
  reasoning?: string; // AI가 이런 결론을 내린 이유
  suggestions?: string[]; // 대안 해석들
}

export interface AIModelConfig {
  modelPath?: string;
  maxTokens?: number;
  temperature?: number;
  topK?: number;
  randomSeed?: number;
}

export interface AIModelStatus {
  state: 1 | 2 | 3 | 4; // 1: 캐시없음, 2: 로딩중, 3: 로딩완료, 4: 캐시있음(로드안됨)
  error?: string;
  modelSize?: number;
  loadTime?: number;
}

// AI 추론 상태 관리
export interface AIInferenceState {
  model: AIModelStatus;
  lastAnalysis?: AIAnalysisResult;
  analysisHistory: AIAnalysisResult[];
}

// oktjs 결과와 AI 결과 비교용
export interface AnalysisComparison {
  oktjsResult?: any;
  aiResult?: AIAnalysisResult;
  usedMethod: 'oktjs' | 'ai' | 'hybrid';
  processingTime: number;
  finalResult: any; // 최종 선택된 분석 결과
}

