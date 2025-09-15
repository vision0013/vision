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
      maxTokens: 2048,
      temperature: 0.05,
      topK: 40,
      randomSeed: 42
    },
    performance: {
      avgResponseTime: 347,
      memoryUsage: '2.4GB'
    }
  },

  'phi-4-mini': {
    id: 'phi-4-mini',
    name: 'Phi-4 Mini Instruct',
    description: '소형 고효율 모델 (인증 불필요)',
    modelPath: 'https://huggingface.co/litert-community/Phi-4-mini-instruct/resolve/main/phi-4-mini-instruct-int4-web.task',
    size: '1.8GB',
    requiresToken: false,
    quantization: 'int4',
    category: 'small',
    defaultConfig: {
      maxTokens: 2048,
      temperature: 0.1,
      topK: 50,
      randomSeed: 42
    },
    performance: {
      avgResponseTime: 280,
      memoryUsage: '1.8GB'
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
  const { preferNoAuth = false, performance = 'balanced' } = requirements;

  // 인증 불필요 모델 선호
  if (preferNoAuth) {
    return 'phi-4-mini'; // 인증 불필요 모델 중 최고 성능
  }

  // 성능 기반 추천
  if (performance === 'fast') return 'phi-4-mini';
  if (performance === 'accurate') return 'gemma3-4b-it';
  return 'phi-4-mini'; // balanced - 인증 불필요하면서 성능 좋음
}

// 모델 카테고리별 필터링
export function getModelsByCategory(category: 'small' | 'medium' | 'large'): ModelInfo[] {
  return Object.values(AVAILABLE_MODELS).filter(model => model.category === category);
}

// 인증 불필요 모델들만 반환
export function getModelsWithoutAuth(): ModelInfo[] {
  return Object.values(AVAILABLE_MODELS).filter(model => !model.requiresToken);
}