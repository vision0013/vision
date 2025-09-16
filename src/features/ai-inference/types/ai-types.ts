// AI 추론 관련 타입 정의

// ✨ [신규] AI가 생성하는 행동 계획의 단일 스텝
export interface AIActionStep {
  action: 'CLICK' | 'INPUT' | 'NAVIGATE' | 'SCROLL';
  id?: number;      // CLICK, INPUT 대상 요소의 ID
  value?: string;   // INPUT 액션에 사용될 값
  url?: string;     // NAVIGATE 액션에 사용될 URL
  type?: string;    // NAVIGATE 액션의 타입 (back, forward, refresh)
  direction?: string; // SCROLL 액션의 방향 (up, down)
  target?: string;  // SCROLL 액션의 특정 요소 타겟 (선택사항)
  reasoning?: string; // AI가 이 행동을 선택한 이유
}

// ✨ [수정] AI 분석 결과가 단일 의도가 아닌, 행동 '계획'을 담도록 변경
export interface AIAnalysisResult {
  plan: AIActionStep[];
  reasoning?: string; // 전체 계획에 대한 AI의 요약 설명
  rawResponse?: string; // 디버깅을 위한 원본 응답
}

export interface AIModelConfig {
  modelPath?: string;
  maxTokens?: number;
  temperature?: number;
  topK?: number;
  randomSeed?: number;
}

// --- [복구] 실수로 삭제되었던 타입들 복원 ---

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  modelPath: string;
  size: string;
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
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  status: 'downloading' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface AIModelStatus {
  state: 1 | 2 | 3 | 4; // 1: 캐시없음, 2: 로딩중, 3: 로딩완료, 4: 캐시있음(로드안됨)
  currentModelId?: string;
  error?: string;
  modelSize?: number;
  loadTime?: number;
}

export interface AIInferenceState {
  model: AIModelStatus;
  availableModels: AvailableModels;
  selectedModelId: string;
  downloadProgress?: ModelDownloadProgress;
  lastAnalysis?: AIAnalysisResult;
  analysisHistory: AIAnalysisResult[];
}

export interface AnalysisComparison {
  oktjsResult?: any;
  aiResult?: AIAnalysisResult;
  usedMethod: 'oktjs' | 'ai' | 'hybrid';
  processingTime: number;
  finalResult: any;
}

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

export interface PromptExample {
  command: string;
  action: string;
  confidence: number;
  reasoning: string;
}
