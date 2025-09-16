// src/features/ai-inference/controllers/ai-controller.ts

import { AIAnalysisResult, AIModelConfig, AIModelStatus, ModelDownloadProgress, LearningSnapshot } from '../types/ai-types';
import { CrawledItem } from '../../../types';
import { AVAILABLE_MODELS, DEFAULT_MODEL_ID } from '../config/model-registry';
import { LearningDataManager } from '../process/learning-data-manager';
import { SnapshotManager } from '../process/snapshot-manager';
import { ModelManager } from './model-manager';
import { InferenceEngine } from './inference-engine';
import { AI_PROMPTS } from '../config/ai-prompts';

/**
 * AI 기능의 Facade 역할을 하는 메인 컨트롤러.
 * ModelManager와 InferenceEngine의 복잡한 상호작용을 조정합니다.
 */
export class AIController {
  private modelManager: ModelManager;
  private inferenceEngine: InferenceEngine;
  private isLearning: boolean = false;

  constructor(config: AIModelConfig = {}, modelId?: string) {
    const targetModelId = modelId || DEFAULT_MODEL_ID;
    const modelInfo = AVAILABLE_MODELS[targetModelId];
    const fullConfig = { ...modelInfo.defaultConfig, ...config };

    this.modelManager = new ModelManager(fullConfig, targetModelId);
    this.inferenceEngine = new InferenceEngine(null);
  }

  async initialize(): Promise<boolean> {
    const success = await this.modelManager.initialize();
    if (success) {
      this.inferenceEngine.setLlm(this.modelManager.getLlm());
    }
    return success;
  }

  /**
   * ✅ [BUG FIX] 이전 offscreen.ts와의 호환성을 위해 downloadAndCacheModelAsPath 메서드를 유지합니다.
   * 이 메서드는 내부적으로 새로운 downloadAndCacheModel을 호출합니다.
   */
  async downloadAndCacheModelAsPath(token: string, modelId?: string): Promise<boolean> {
    console.log('💾 [ai-controller] Maintaining compatibility for downloadAndCacheModelAsPath call...');
    return this.downloadAndCacheModel(token, modelId);
  }

  async downloadAndCacheModel(token: string, modelId?: string): Promise<boolean> {
    return this.modelManager.downloadAndCacheModel(token, modelId);
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

  async analyzeIntent(voiceInput: string, crawledItems: CrawledItem[]): Promise<AIAnalysisResult> {
    return this.inferenceEngine.analyzeIntent(voiceInput, crawledItems);
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

  async learnFromFailedTests(failedTests: Array<{ command: string; expected: string; description: string }>): Promise<void> {
    if (this.isLearning) return;
    this.isLearning = true;
    try {
      const failedCommands = failedTests.map(t => t.command).join(', ');
      const snapshotDescription = `Before learning ${failedTests.length} failed cases: ${failedCommands.substring(0, 100)}`;
      await SnapshotManager.createSnapshot(snapshotDescription);
      await LearningDataManager.learnFromFailedTests(failedTests);
    } finally {
      this.isLearning = false;
    }
  }

  async clearLearnedExamples(): Promise<void> {
    await LearningDataManager.clearLearnedExamples();
  }

  async getLearnedExamplesStats(): Promise<{count: number, size: number}> {
    return LearningDataManager.getLearnedExamplesStats();
  }

  async createSnapshot(description?: string): Promise<LearningSnapshot> {
    return SnapshotManager.createSnapshot(description);
  }

  async rollbackToSnapshot(snapshotId: string): Promise<boolean> {
    return SnapshotManager.rollbackToSnapshot(snapshotId);
  }

  async getSnapshots(): Promise<LearningSnapshot[]> {
    return SnapshotManager.getSnapshots();
  }

  async deleteSnapshot(snapshotId: string): Promise<boolean> {
    return SnapshotManager.deleteSnapshot(snapshotId);
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