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
  private static genaiFileset: any = null; // 🔧 [신규] Fileset을 재사용

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

  private async checkWebGPUSupport(): Promise<void> {
    try {
      if (!('gpu' in navigator)) {
        console.warn('⚠️ [model-manager] WebGPU not supported in this browser');
        return;
      }

      const adapter = await (navigator as any).gpu.requestAdapter();
      if (!adapter) {
        console.warn('⚠️ [model-manager] No WebGPU adapter found');
        return;
      }

      const device = await adapter.requestDevice();
      console.log('🚀 [model-manager] WebGPU is supported and available');
      console.log('🔧 [model-manager] GPU Adapter:', adapter);
      console.log('🔧 [model-manager] GPU Device:', device);

      // MediaPipe는 자동으로 WebGPU를 사용하므로 여기서는 확인만 함
      console.log('✅ [model-manager] MediaPipe will use GPU acceleration if model supports it');

    } catch (error) {
      console.warn('⚠️ [model-manager] WebGPU initialization failed:', error);
    }
  }

  async initialize(): Promise<boolean> {
    if (this.status.state === 3) return true;
    if (this.status.state === 2) return false;

    try {
      this.status = { ...this.status, state: 2 };
      const startTime = Date.now();

      // WebGPU 지원 확인
      await this.checkWebGPUSupport();

      const modelExists = await OPFSFileManager.checkModelExists(this.currentModelId);
      if (!modelExists) {
        this.status = { state: 1, currentModelId: this.currentModelId, error: 'Model not found in OPFS.' };
        return false;
      }

      const modelFilePath = await OPFSFileManager.getModelFileURL(this.currentModelId);

      // 🔧 [수정] Fileset을 재사용해서 WebGPU 리소스 중첩 방지
      if (!ModelManager.genaiFileset) {
        const wasmPath = chrome.runtime.getURL("wasm_files/");
        ModelManager.genaiFileset = await FilesetResolver.forGenAiTasks(wasmPath);
        console.log('🔧 [model-manager] Created new FilesetResolver');
      } else {
        console.log('♻️ [model-manager] Reusing existing FilesetResolver');
      }

      this.llm = await LlmInference.createFromOptions(ModelManager.genaiFileset, {
        baseOptions: { modelAssetPath: modelFilePath },
        maxTokens: this.config.maxTokens!,
        temperature: this.config.temperature!,
        topK: this.config.topK!,
        randomSeed: this.config.randomSeed!
      });

      const loadTime = Date.now() - startTime;
      this.status = { state: 3, loadTime, currentModelId: this.currentModelId };

      // 현재 모델 정보 출력
      const modelInfo = AVAILABLE_MODELS[this.currentModelId];
      console.log(`✅ [model-manager] Model loaded in ${loadTime}ms`);
      console.log(`🤖 [model-manager] Active Model: ${modelInfo?.name || this.currentModelId}`);
      console.log(`📋 [model-manager] Model ID: ${this.currentModelId}`);
      console.log(`📊 [model-manager] Model Size: ${modelInfo?.size || 'Unknown'}`);
      console.log(`🔧 [model-manager] Model Config:`, {
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
        topK: this.config.topK
      });
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
    // 🔧 [수정] 이전 모델 완전 정리
    if (this.llm) {
      console.log('🧹 [model-manager] Closing previous model instance');
      try {
        this.llm.close();
      } catch (error) {
        console.warn('⚠️ [model-manager] Error closing previous model:', error);
      }
      this.llm = null;
    }

    // 🔧 [신규] 가비지 컬렉션 강제 실행 (브라우저가 허용할 때만)
    if (typeof window !== 'undefined' && (window as any).gc) {
      try {
        (window as any).gc();
        console.log('🗑️ [model-manager] Forced garbage collection');
      } catch (error) {
        // gc() 사용 불가능한 환경에서는 조용히 무시
      }
    }

    this.currentModelId = modelId;
    this.config = AVAILABLE_MODELS[modelId].defaultConfig;
    this.status = { state: 1, currentModelId: modelId };
    console.log(`🔄 [model-manager] Switched to model: ${modelId}`);
  }

  async getAllModelsStatus(): Promise<Record<string, { exists: boolean; size?: number }>> {
    const result: Record<string, { exists: boolean; size?: number }> = {};
    for (const modelId of Object.keys(AVAILABLE_MODELS)) {
      result[modelId] = { exists: await OPFSFileManager.checkModelExists(modelId) };
    }
    return result;
  }
}