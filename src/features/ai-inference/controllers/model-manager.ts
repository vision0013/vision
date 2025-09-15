// src/features/ai-inference/controllers/model-manager.ts

import { LlmInference, FilesetResolver } from '@mediapipe/tasks-genai';
import { AIModelConfig, AIModelStatus, ModelDownloadProgress } from '../types/ai-types';
import { AVAILABLE_MODELS, DEFAULT_MODEL_ID } from '../config/model-registry';
import { OPFSFileManager } from '../process/opfs-file-manager';
import { DOWNLOAD_TIMEOUT_MS } from '../config/opfs-config';

/**
 * AI 모델의 생명주기(다운로드, 로드, 상태)를 관리하는 클래스
 */
export class ModelManager {
  private llm: LlmInference | null = null;
  private status: AIModelStatus = { state: 1 };
  private currentModelId: string = DEFAULT_MODEL_ID;
  private downloadProgress: ModelDownloadProgress | null = null;
  private downloadAbortController: AbortController | null = null;

  constructor(private config: AIModelConfig, modelId?: string) {
    this.currentModelId = modelId || DEFAULT_MODEL_ID;
    this.status.currentModelId = this.currentModelId;
  }

  getLlm(): LlmInference | null {
    return this.llm;
  }

  getCurrentModelId(): string {
    return this.currentModelId;
  }

  isModelLoaded(): boolean {
    return this.status.state === 3 && this.llm !== null;
  }

  async initialize(): Promise<boolean> {
    if (this.status.state === 3) return true;
    if (this.status.state === 2) return false;

    try {
      this.status = { ...this.status, state: 2 };
      const startTime = Date.now();

      const modelExists = await OPFSFileManager.checkModelExists(this.currentModelId);
      if (!modelExists) {
        this.status = { state: 1, currentModelId: this.currentModelId, error: 'Model not found in OPFS.' };
        return false;
      }

      const modelFilePath = await OPFSFileManager.getModelFileURL(this.currentModelId);
      const wasmPath = chrome.runtime.getURL("wasm_files/");
      const genaiFileset = await FilesetResolver.forGenAiTasks(wasmPath);

      this.llm = await LlmInference.createFromOptions(genaiFileset, {
        baseOptions: { modelAssetPath: modelFilePath },
        maxTokens: this.config.maxTokens!,
        temperature: this.config.temperature!,
        topK: this.config.topK!,
        randomSeed: this.config.randomSeed!
      });

      const loadTime = Date.now() - startTime;
      this.status = { state: 3, loadTime, currentModelId: this.currentModelId };
      console.log(`✅ [model-manager] Model loaded in ${loadTime}ms`);
      return true;

    } catch (error: any) {
      this.status = { state: 1, error: error.message, currentModelId: this.currentModelId };
      console.error('❌ [model-manager] FAILED to initialize model:', error);
      return false;
    }
  }

  async downloadAndCacheModel(token: string, modelId?: string): Promise<boolean> {
    const targetModelId = modelId || this.currentModelId;
    const modelInfo = AVAILABLE_MODELS[targetModelId];
    if (!modelInfo) return false;

    this.downloadProgress = { modelId: targetModelId, progress: 0, downloadedBytes: 0, totalBytes: 0, status: 'downloading' };
    this.status = { state: 2, currentModelId: targetModelId };

    this.downloadAbortController = new AbortController();
    const timeout = setTimeout(() => this.downloadAbortController?.abort(), DOWNLOAD_TIMEOUT_MS);

    try {
      const result = await OPFSFileManager.downloadModelToOPFS(
        targetModelId, modelInfo, token,
        (progress) => {
          this.downloadProgress = progress;
          this.broadcastDownloadProgress();
        },
        this.downloadAbortController.signal
      );

      clearTimeout(timeout);
      if (result) {
        this.status = { state: 4, currentModelId: targetModelId };
      }
      this.downloadAbortController = null;
      return result;

    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        this.status = { state: 1, currentModelId: targetModelId, error: 'Download cancelled' };
        await OPFSFileManager.deleteModel(targetModelId).catch(e => console.warn(e));
      } else {
        this.status = { state: 1, currentModelId: targetModelId, error: error.message };
      }
      this.downloadAbortController = null;
      return false;
    }
  }

  cancelDownload(): void {
    this.downloadAbortController?.abort();
  }

  async deleteCachedModel(modelId?: string): Promise<void> {
    const targetModelId = modelId || this.currentModelId;
    await OPFSFileManager.deleteModel(targetModelId);
    if (targetModelId === this.currentModelId) {
      if (this.llm) this.llm = null;
      this.status = { state: 1, currentModelId: this.currentModelId };
    }
  }

  async getModelStatus(modelId?: string): Promise<AIModelStatus> {
    const targetModelId = modelId || this.currentModelId;
    if (this.status.state === 1 || this.status.currentModelId !== targetModelId) {
        const modelExists = await OPFSFileManager.checkModelExists(targetModelId);
        const state = modelExists ? 4 : 1;
        if (this.currentModelId === targetModelId) {
            this.status = { ...this.status, state, currentModelId: targetModelId };
        } else {
            return { state, currentModelId: targetModelId };
        }
    }
    return { ...this.status };
  }

  getDownloadProgress(): ModelDownloadProgress | null {
    return this.downloadProgress;
  }
  
  private broadcastDownloadProgress(): void {
    if (!this.downloadProgress) return;
    chrome.runtime.sendMessage({
      action: 'downloadProgress',
      progress: { ...this.downloadProgress }
    }).catch(console.warn);
  }

  async switchModel(modelId: string): Promise<void> {
    if (this.llm) {
      this.llm = null;
    }
    this.currentModelId = modelId;
    this.config = AVAILABLE_MODELS[modelId].defaultConfig;
    this.status = { state: 1, currentModelId: modelId };
  }

  async getAllModelsStatus(): Promise<Record<string, { exists: boolean; size?: number }>> {
    const result: Record<string, { exists: boolean; size?: number }> = {};
    for (const modelId of Object.keys(AVAILABLE_MODELS)) {
      result[modelId] = { exists: await OPFSFileManager.checkModelExists(modelId) };
    }
    return result;
  }
}