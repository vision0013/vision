// src/features/ai-inference/controllers/ai-controller.ts

import { AIAnalysisResult, AIModelConfig, AIModelStatus, ModelDownloadProgress } from '../types/ai-types';
import { CrawledItem, Mode } from '../../../types';
import { AVAILABLE_MODELS, DEFAULT_MODEL_ID } from '../config/model-registry';
import { ModelManager } from './model-manager';
import { InferenceEngine } from './inference-engine';
import { AI_PROMPTS } from '../config/ai-prompts';

export class AIController {
  private modelManager: ModelManager;
  private inferenceEngine: InferenceEngine;
  private isInitialized: boolean = false; // ✨ [신규] 초기화 상태 플래그

  constructor(config: AIModelConfig = {}, modelId?: string) {
    const targetModelId = modelId || DEFAULT_MODEL_ID;
    const modelInfo = AVAILABLE_MODELS[targetModelId];
    const fullConfig = { ...modelInfo.defaultConfig, ...config };

    this.modelManager = new ModelManager(fullConfig, targetModelId);
    // ✨ [수정] InferenceEngine에 컨트롤러 인스턴스 전달
    this.inferenceEngine = new InferenceEngine(null, this);
  }

  async initialize(): Promise<boolean> {
    this.isInitialized = false; // 초기화 시작 시 플래그 리셋
    const success = await this.modelManager.initialize();
    if (success) {
      this.inferenceEngine.setLlm(this.modelManager.getLlm());
      this.isInitialized = true; // ✨ [신규] 성공 시 플래그 설정
    }
    return success;
  }

  // ✨ [신규] 추론 가능 상태 확인 메소드
  public isReadyForInference(): boolean {
    return this.isInitialized;
  }

  async downloadAndCacheModel(token: string, modelId?: string): Promise<boolean> {
    this.isInitialized = false; // 다운로드 시작 시 초기화 상태 해제
    return this.modelManager.downloadAndCacheModel(token, modelId);
  }

  async downloadAndCacheModelAsPath(token: string, modelId?: string): Promise<boolean> {
    return this.downloadAndCacheModel(token, modelId);
  }

  cancelDownload(): void {
    this.modelManager.cancelDownload();
  }

  async deleteCachedModel(modelId?: string): Promise<void> {
    await this.modelManager.deleteCachedModel(modelId);
  }

  async getModelStatus(modelId?: string): Promise<AIModelStatus> {
    return this.modelManager.getModelStatus(modelId);
  }

  getDownloadProgress(): ModelDownloadProgress | null {
    return this.modelManager.getDownloadProgress();
  }

  async analyzeIntent(voiceInput: string, crawledItems: CrawledItem[], mode: Mode): Promise<AIAnalysisResult> {
    return this.inferenceEngine.analyzeIntent(voiceInput, crawledItems, mode);
  }

  setPromptTemplate(promptName: keyof typeof AI_PROMPTS): void {
    this.inferenceEngine.setPromptTemplate(promptName);
  }

  getCurrentPrompt(): string {
    return this.inferenceEngine.getCurrentPrompt();
  }
  
  getAvailablePrompts() {
    return this.inferenceEngine.getAvailablePrompts();
  }


  getAvailableModels() {
    return AVAILABLE_MODELS;
  }

  getCurrentModelId(): string {
    return this.modelManager.getCurrentModelId();
  }

  isModelLoaded(): boolean {
    return this.modelManager.isModelLoaded();
  }

  async switchModel(modelId: string, token?: string, autoLoad: boolean = false): Promise<boolean> {
    this.isInitialized = false; // 모델 전환 시 초기화 상태 해제
    const modelInfo = AVAILABLE_MODELS[modelId];
    if (!modelInfo) return false;

    await this.modelManager.switchModel(modelId);
    this.inferenceEngine.setLlm(null);

    const modelExists = await this.modelManager.getModelStatus(modelId).then(s => s.state === 4);
    if (modelExists) {
      if (autoLoad) return this.initialize();
      return true;
    }

    if (modelInfo.requiresToken && !token) return false;

    const downloadSuccess = await this.downloadAndCacheModel(token || '', modelId);
    if (downloadSuccess && autoLoad) {
      return this.initialize();
    }
    return downloadSuccess;
  }
  
  async getAllModelsStatus(): Promise<Record<string, { exists: boolean; size?: number }>> {
    return this.modelManager.getAllModelsStatus();
  }
}

let aiControllerInstance: AIController | null = null;

export function getAIController(modelId?: string): AIController {
  if (!aiControllerInstance || (modelId && modelId !== aiControllerInstance.getCurrentModelId())) {
    aiControllerInstance = new AIController({}, modelId);
  }
  return aiControllerInstance;
}

export function resetAIController(): void {
  aiControllerInstance = null;
}