// 지원되는 AI 모델들의 중앙 레지스트리

import { AvailableModels, ModelInfo } from '../types/ai-types';

export const AVAILABLE_MODELS: AvailableModels = {
  'gemma3-4b-it': {
    id: 'gemma3-4b-it',
    name: 'Gemma 3 4B IT',
    description: '4B 파라미터 고성능 모델 (현재 사용 중)',
    modelPath: 'https://huggingface.co/litert-community/Gemma3-4B-IT/resolve/main/gemma3-4b-it-int4-web.task',
    size: '2.4GB',
    requiresToken: true,
    quantization: 'int4',
    category: 'medium',
    defaultConfig: {
      maxTokens: 8192,
      temperature: 0.05,
      topK: 40,
      randomSeed: 42
    },
    performance: {
      avgResponseTime: 347,
      memoryUsage: '2.4GB'
    }
  },

  // Phi-4 Mini는 MediaPipe 호환성 이슈로 제거됨 (ArrayBuffer allocation failed)
  // 'phi-4-mini': { ... }

  'gemma3-12b-it': {
    id: 'gemma3-12b-it',
    name: 'Gemma 3 12B IT',
    description: '12B 파라미터 고성능 대형 모델 (8GB+ VRAM 필요)',
    modelPath: 'https://huggingface.co/litert-community/Gemma3-12B-IT/resolve/main/gemma3-12b-it-int4-web.task',
    size: '7.55GB',
    requiresToken: true,
    quantization: 'int4',
    category: 'large',
    defaultConfig: {
      maxTokens: 8192,
      temperature: 0.05,
      topK: 40,
      randomSeed: 42
    },
    performance: {
      avgResponseTime: 500,
      memoryUsage: '7.55GB'
    }
  },

};

export const DEFAULT_MODEL_ID = 'gemma3-4b-it';

// 모델 추천 로직
export function getRecommendedModel(requirements: {
  preferNoAuth?: boolean;
  maxSize?: string;
  performance?: 'fast' | 'balanced' | 'accurate';
}): string {
  const { performance = 'balanced' } = requirements;

  // 현재 안정적으로 지원되는 모델만 사용
  if (performance === 'fast') return 'gemma3-4b-it';
  if (performance === 'accurate') return 'gemma3-12b-it';
  return 'gemma3-4b-it'; // balanced - 기본 권장 모델
}

// 모델 카테고리별 필터링
export function getModelsByCategory(category: 'small' | 'medium' | 'large'): ModelInfo[] {
  return Object.values(AVAILABLE_MODELS).filter(model => model.category === category);
}

// 인증 불필요 모델들만 반환 (현재는 모든 안정 모델이 토큰 필요)
export function getModelsWithoutAuth(): ModelInfo[] {
  return Object.values(AVAILABLE_MODELS).filter(model => !model.requiresToken);
}