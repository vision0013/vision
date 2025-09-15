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

// 다중 모델 지원을 위한 새로운 인터페이스들
export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  modelPath: string;
  size: string; // "4.8GB", "2.4GB" 등
  requiresToken: boolean;
  quantization: 'int4' | 'int8' | 'float16';
  defaultConfig: AIModelConfig;
  category: 'small' | 'medium' | 'large';
  performance: {
    avgResponseTime: number; // ms
    memoryUsage: string;
  };
}

export interface AvailableModels {
  [key: string]: ModelInfo;
}

export interface ModelDownloadProgress {
  modelId: string;
  progress: number; // 0-100
  downloadedBytes: number;
  totalBytes: number;
  status: 'downloading' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface AIModelStatus {
  state: 1 | 2 | 3 | 4; // 1: 캐시없음, 2: 로딩중, 3: 로딩완료, 4: 캐시있음(로드안됨)
  currentModelId?: string; // 현재 로드된 모델 ID
  error?: string;
  modelSize?: number;
  loadTime?: number;
}

// AI 추론 상태 관리
export interface AIInferenceState {
  model: AIModelStatus;
  availableModels: AvailableModels;
  selectedModelId: string;
  downloadProgress?: ModelDownloadProgress;
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

// 학습 스냅샷 관리
export interface LearningSnapshot {
  id: string;
  name: string;
  createdAt: Date;
  examples: PromptExample[];
  testResults?: {
    accuracy: number;
    totalTests: number;
    correctTests: number;
    avgConfidence: number;
  };
  description?: string;
}

// 프롬프트 예시 타입
export interface PromptExample {
  command: string;
  action: string;
  confidence: number;
  reasoning: string;
}

