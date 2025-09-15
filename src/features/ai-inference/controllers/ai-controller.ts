// AI 추론 컨트롤러 - Gemma 3 4B 모델로 업그레이드

import { LlmInference, FilesetResolver } from '@mediapipe/tasks-genai';
import { AIAnalysisResult, AIModelConfig, AIModelStatus, ModelDownloadProgress, LearningSnapshot } from '../types/ai-types';
import { getPromptTemplate, AI_PROMPTS, CURRENT_PROMPT, getBaseExamples } from '../config/ai-prompts';
import { AVAILABLE_MODELS, DEFAULT_MODEL_ID } from '../config/model-registry';
import { AIResponseParser } from '../process/ai-response-parser';
import { OPFSFileManager } from '../process/opfs-file-manager';
import { LearningDataManager } from '../process/learning-data-manager';
import { SnapshotManager } from '../process/snapshot-manager';
import { DOWNLOAD_TIMEOUT_MS } from '../config/opfs-config';


export class AIController {
  private llm: LlmInference | null = null;
  private modelStatus: AIModelStatus = {
    state: 1 // 1: 캐시없음/로딩안됨
  };
  private isLearning: boolean = false; // 학습 중복 방지

  // ✨ 다중 모델 지원
  private currentModelId: string = DEFAULT_MODEL_ID;
  private downloadProgress: ModelDownloadProgress | null = null;
  private downloadAbortController: AbortController | null = null;
  private readonly fullConfig: AIModelConfig;

  // ✨ 프롬프트 관리 - CURRENT_PROMPT 기반으로 초기화
  private currentPromptName: keyof typeof AI_PROMPTS;


  // AI 추론 동시성 제어
  private isAnalyzing = false;
  private analysisQueue: Array<{
    voiceInput: string;
    resolve: (result: AIAnalysisResult) => void;
    reject: (error: Error) => void;
  }> = [];


  constructor(config: AIModelConfig = {}, modelId?: string) {
    // 모델 선택
    this.currentModelId = modelId || DEFAULT_MODEL_ID;
    const modelInfo = AVAILABLE_MODELS[this.currentModelId];

    if (!modelInfo) {
      console.error(`❌ [ai-controller] Unknown model ID: ${this.currentModelId}`);
      this.currentModelId = DEFAULT_MODEL_ID;
    }

    // 선택된 모델의 기본 설정 적용
    this.fullConfig = {
      ...AVAILABLE_MODELS[this.currentModelId].defaultConfig,
      ...config
    };

    // 모델 상태에 현재 모델 ID 저장
    this.modelStatus.currentModelId = this.currentModelId;

    // ✨ CURRENT_PROMPT에서 키 찾기
    const currentKey = Object.keys(AI_PROMPTS).find(
      key => AI_PROMPTS[key as keyof typeof AI_PROMPTS] === CURRENT_PROMPT
    ) as keyof typeof AI_PROMPTS;

    this.currentPromptName = currentKey || 'SIMPLE_CLASSIFICATION';

    console.log(`🤖 [ai-controller] Config initialized for model: ${modelInfo?.name || this.currentModelId}`);
    console.log(`🎯 [ai-controller] Using prompt: ${this.currentPromptName} (${AI_PROMPTS[this.currentPromptName].name})`);
  }

  /**
   * MediaPipe LLM 초기화 (로컬 캐시 우선)
   */
  async initialize(): Promise<boolean> {
    if (this.modelStatus.state === 3) return true; // 이미 로드됨
    if (this.modelStatus.state === 2) return false; // 로딩 중

    try {
      this.modelStatus.state = 2; // 로딩 중
      const startTime = Date.now();
      console.log('🚀 [ai-controller] Initializing AI model from OPFS cache...');

      // OPFS에서 현재 모델 파일 확인
      console.log(`🔍 [ai-controller] Checking if model ${this.currentModelId} exists in OPFS...`);
      const modelExists = await OPFSFileManager.checkModelExists(this.currentModelId);
      console.log(`🔍 [ai-controller] Model exists check result: ${modelExists}`);

      if (!modelExists) {
        console.error(`❌ [ai-controller] No model file found for ${this.currentModelId} in OPFS. Please download the model.`);
        this.modelStatus = { state: 1, currentModelId: this.currentModelId, error: 'Model not found in OPFS.' };
        return false;
      }

      try {
        console.log('🔗 [ai-controller] Loading model from OPFS file...');

        // OPFS에서 현재 모델 파일 로드하여 Object URL 생성
        const modelFilePath = await OPFSFileManager.getModelFileURL(this.currentModelId);
        console.log(`✅ [ai-controller] Model file URL for ${this.currentModelId}: ${modelFilePath}`);

        const wasmPath = chrome.runtime.getURL("wasm_files/");
        const genaiFileset = await FilesetResolver.forGenAiTasks(wasmPath);

        // modelAssetPath 방식으로 로드 (메모리 효율적)
        this.llm = await LlmInference.createFromOptions(genaiFileset, {
          baseOptions: { modelAssetPath: modelFilePath },
            maxTokens: this.fullConfig.maxTokens!,
            temperature: this.fullConfig.temperature!,
            topK: this.fullConfig.topK!,
            randomSeed: this.fullConfig.randomSeed!
          });

          console.log('✅ [ai-controller] Model loaded from file path successfully');

      } catch (loadError: any) {
        console.error('❌ [ai-controller] Failed to load model from OPFS:', loadError);
        this.modelStatus = { state: 1, error: loadError.message };
        throw loadError;
      }

      const loadTime = Date.now() - startTime;
      this.modelStatus = {
        state: 3, // 로딩 완료
        loadTime: loadTime
      };

      console.log(`✅ [ai-controller] SUCCESS: Model loaded from .task bundle in ${loadTime}ms`);
      return true;

    } catch (error: any) {
      this.modelStatus = { state: 1, error: error.message };
      console.error('❌ [ai-controller] FAILED to initialize from cache:', error);
      return false;
    }
  }

  /**
   * API 토큰을 사용하여 모델 다운로드 및 캐싱
   */
  /**
   * 모델 다운로드 및 실제 저장 (modelAssetPath 스킵하고 바로 다운로드)
   */
  async downloadAndCacheModelAsPath(token: string, modelId?: string): Promise<boolean> {
    console.log('💾 [ai-controller] Skipping modelAssetPath, downloading and caching model for persistent storage...');

    // modelAssetPath는 실제 저장하지 않으므로 바로 다운로드 방식 사용
    return this.downloadAndCacheModel(token, modelId);
  }

  async downloadAndCacheModel(token: string, modelId?: string): Promise<boolean> {
    const targetModelId = modelId || this.currentModelId;
    const modelInfo = AVAILABLE_MODELS[targetModelId];

    if (!modelInfo) {
      console.error(`❌ [ai-controller] Unknown model ID: ${targetModelId}`);
      return false;
    }

    // 다운로드 진행률 초기화
    this.downloadProgress = {
      modelId: targetModelId,
      progress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      status: 'downloading'
    };

    this.modelStatus = { state: 2, currentModelId: targetModelId }; // 로딩 중

    // AbortController로 긴 다운로드 타임아웃 제어
    this.downloadAbortController = new AbortController();
    const downloadTimeout = setTimeout(() => {
      this.downloadAbortController?.abort();
      console.error('❌ [ai-controller] Download timeout after 10 minutes');
    }, DOWNLOAD_TIMEOUT_MS);

    try {
      const result = await OPFSFileManager.downloadModelToOPFS(
        targetModelId,
        modelInfo,
        token,
        (progress) => {
          this.downloadProgress = progress;
          this.broadcastDownloadProgress();
        },
        this.downloadAbortController.signal
      );

      // 타임아웃 해제
      clearTimeout(downloadTimeout);

      if (result) {
        // 다운로드 완료 상태로 업데이트 (로드하지 않음)
        this.modelStatus = {
          state: 4, // 캐시됨, 로드 필요
          currentModelId: targetModelId
        };
        console.log(`✅ [ai-controller] Model ${modelInfo.name} download complete and ready to load`);
      }

      // AbortController 정리
      this.downloadAbortController = null;
      return result;

    } catch (error: any) {
      clearTimeout(downloadTimeout); // 에러 시에도 타임아웃 해제

      console.error('❌ [ai-controller] Download failed:', error);

      if (error.name === 'AbortError') {
        console.error('❌ [ai-controller] Download aborted (timeout or user cancellation)');
        this.modelStatus = { state: 1, currentModelId: targetModelId, error: 'Download cancelled' };

        // 불완전한 파일 정리
        try {
          await OPFSFileManager.deleteModel(targetModelId);
          console.log('🗑️ [ai-controller] Incomplete download file cleaned up');
        } catch (cleanupError) {
          console.warn('⚠️ [ai-controller] Failed to cleanup incomplete file:', cleanupError);
        }
      } else {
        this.modelStatus = { state: 1, currentModelId: targetModelId, error: error.message };
      }

      // 에러 발생 시 AbortController 정리
      this.downloadAbortController = null;
      return false;
    }
  }

  /**
   * 다운로드 취소
   */
  public cancelDownload(): void {
    if (this.downloadAbortController) {
      console.log('🚫 [ai-controller] Cancelling download...');
      this.downloadAbortController.abort();

      // 다운로드 진행률 취소 상태 업데이트
      if (this.downloadProgress) {
        this.downloadProgress.status = 'error';
        this.downloadProgress.error = 'Download cancelled by user';
        this.broadcastDownloadProgress();
      }
    } else {
      console.warn('⚠️ [ai-controller] No download to cancel');
    }
  }

  /**
   * OPFS 캐시된 모델 삭제 (다중 모델 지원)
   */
  async deleteCachedModel(modelId?: string): Promise<void> {
    const targetModelId = modelId || this.currentModelId;

    await OPFSFileManager.deleteModel(targetModelId);

    // 현재 로드된 모델이 삭제된 모델이면 메모리에서도 제거
    if (targetModelId === this.currentModelId) {
      if (this.llm) this.llm = null;
      this.modelStatus = { state: 1, currentModelId: this.currentModelId };
    }
  }

  /**
   * 모델 상태 확인 (다중 모델 지원, OPFS 존재 여부 반영)
   */
  async getModelStatus(modelId?: string): Promise<AIModelStatus> {
    const targetModelId = modelId || this.currentModelId;

    // 현재 모델에 대한 상태만 업데이트
    if (targetModelId === this.currentModelId && this.modelStatus.state === 1) {
      const modelExists = await OPFSFileManager.checkModelExists(targetModelId);
      if (modelExists) {
        this.modelStatus = {
          ...this.modelStatus,
          state: 4,
          currentModelId: targetModelId
        };
        console.log(`📦 [ai-controller] Model ${targetModelId} found in cache but not loaded in memory`);
      }
    }

    // 다른 모델에 대해서는 존재 여부만 확인
    if (targetModelId !== this.currentModelId) {
      const modelExists = await OPFSFileManager.checkModelExists(targetModelId);
      return {
        state: modelExists ? 4 : 1,
        currentModelId: targetModelId
      };
    }

    return { ...this.modelStatus };
  }

  /**
   * 음성 명령 의도 분석 (동시성 제어 포함)
   */
  async analyzeIntent(voiceInput: string): Promise<AIAnalysisResult> {
    console.log('🎯 [ai-controller] Analyzing voice intent with Gemma 3 4B:', voiceInput);

    if (this.modelStatus.state !== 3 || !this.llm) {
      console.log('⚠️ [ai-controller] Model not loaded, using fallback analysis');
      throw new Error('AI model is not initialized.');
    }

    // 동시성 제어: 큐에 추가하고 순차 처리
    return new Promise((resolve, reject) => {
      this.analysisQueue.push({ voiceInput, resolve, reject });
      this.processAnalysisQueue();
    });
  }

  private async processAnalysisQueue(): Promise<void> {
    if (this.isAnalyzing || this.analysisQueue.length === 0) {
      return;
    }

    this.isAnalyzing = true;

    while (this.analysisQueue.length > 0) {
      const { voiceInput, resolve, reject } = this.analysisQueue.shift()!;

      try {
        console.log(`🔄 [ai-controller] Processing analysis (${this.analysisQueue.length} remaining)`);
        const prompt = await this.buildAnalysisPrompt(voiceInput);
        const response = await this.llm!.generateResponse(prompt);
        const result = AIResponseParser.parseAIResponse(response, voiceInput);
        resolve(result);
      } catch (error: any) {
        console.error('❌ [ai-controller] AI analysis failed:', error);
        reject(error);
      }
    }

    this.isAnalyzing = false;
  }

  /**
   * ✨ 프롬프트 관리 메서드들
   */
  public setPromptTemplate(promptName: keyof typeof AI_PROMPTS): void {
    this.currentPromptName = promptName;
    console.log(`🔄 [ai-controller] Switched to prompt: ${AI_PROMPTS[promptName].name}`);
  }

  public getCurrentPrompt(): string {
    return AI_PROMPTS[this.currentPromptName].name;
  }

  public getAvailablePrompts(): Array<{name: keyof typeof AI_PROMPTS, description: string}> {
    return Object.entries(AI_PROMPTS).map(([key, value]) => ({
      name: key as keyof typeof AI_PROMPTS,
      description: value.description
    }));
  }

  /**
   * ✨ 설정 파일에서 프롬프트 가져오기 (CURRENT_PROMPT 기반)
   * JSON 파일의 기본 예시 + Chrome Storage의 학습된 예시를 결합
   */
  private async buildAnalysisPrompt(voiceInput: string): Promise<string> {
    const promptTemplate = getPromptTemplate(this.currentPromptName);
    console.log(`🎯 [ai-controller] Using prompt template: ${promptTemplate.name}`);

    // 기본 예시들 로드
    const baseExamples = getBaseExamples();

    // OPFS에서 추가 학습된 예시들 로드
    const learnedExamples = await LearningDataManager.getLearnedExamples();

    // 모든 예시 결합 (학습된 예시가 우선순위 높음)
    const allExamples = [...learnedExamples, ...baseExamples];

    console.log(`📚 [ai-controller] Using ${baseExamples.length} base examples + ${learnedExamples.length} learned examples`);

    return promptTemplate.template(voiceInput, allExamples);
  }


  /**
   * 실패한 테스트 케이스들을 학습 예시로 저장 (OPFS 파일)
   */
  public async learnFromFailedTests(failedTests: Array<{ command: string; expected: string; description: string }>): Promise<void> {
    // 중복 실행 방지
    if (this.isLearning) {
      console.warn('⚠️ [ai-controller] Learning already in progress, skipping...');
      return;
    }

    this.isLearning = true;
    try {
      console.log('🧠 [ai-controller] Learning from failed tests to OPFS...');

      // 📸 학습 전 자동 스냅샷 생성
      const failedCommands = failedTests.map(t => t.command).join(', ');
      const snapshotDescription = `Before learning ${failedTests.length} failed cases: ${failedCommands.substring(0, 100)}${failedCommands.length > 100 ? '...' : ''}`;

      try {
        await SnapshotManager.createSnapshot(snapshotDescription);
        console.log('📸 [ai-controller] Auto-snapshot created before learning');
      } catch (snapshotError) {
        console.warn('⚠️ [ai-controller] Failed to create auto-snapshot, but continuing with learning:', snapshotError);
      }

      await LearningDataManager.learnFromFailedTests(failedTests);
    } catch (error) {
      console.error('❌ [ai-controller] Failed to learn from failed tests:', error);
      throw error;
    } finally {
      this.isLearning = false; // 플래그 해제
    }
  }








  /**
   * OPFS에서 학습된 예시 파일 삭제 (필요시)
   */
  public async clearLearnedExamples(): Promise<void> {
    await LearningDataManager.clearLearnedExamples();
  }

  /**
   * 학습된 예시 현황 조회
   */
  public async getLearnedExamplesStats(): Promise<{count: number, size: number}> {
    return await LearningDataManager.getLearnedExamplesStats();
  }

  /**
   * 현재 학습 데이터의 스냅샷 생성 (학습 전 백업)
   */
  public async createSnapshot(description?: string): Promise<LearningSnapshot> {
    return await SnapshotManager.createSnapshot(description);
  }

  /**
   * 특정 스냅샷으로 롤백
   */
  public async rollbackToSnapshot(snapshotId: string): Promise<boolean> {
    return await SnapshotManager.rollbackToSnapshot(snapshotId);
  }

  /**
   * 모든 스냅샷 목록 조회
   */
  public async getSnapshots(): Promise<LearningSnapshot[]> {
    return await SnapshotManager.getSnapshots();
  }

  /**
   * 특정 스냅샷 삭제
   */
  public async deleteSnapshot(snapshotId: string): Promise<boolean> {
    return await SnapshotManager.deleteSnapshot(snapshotId);
  }




  // =============================================================================
  // 🌐 다중 모델 지원 메서드들
  // =============================================================================

  /**
   * 사용 가능한 모델 목록 반환
   */
  public getAvailableModels() {
    return AVAILABLE_MODELS;
  }

  /**
   * 현재 선택된 모델 ID 반환
   */
  public getCurrentModelId(): string {
    return this.currentModelId;
  }

  /**
   * 다운로드 진행률 반환
   */
  public getDownloadProgress(): ModelDownloadProgress | null {
    return this.downloadProgress;
  }

  /**
   * 다운로드 진행률을 UI로 실시간 전송
   */
  private broadcastDownloadProgress(): void {
    if (!this.downloadProgress) return;

    try {
      // Background Script를 통해 UI로 메시지 전송
      chrome.runtime.sendMessage({
        action: 'downloadProgress',
        progress: { ...this.downloadProgress }
      }).catch((error) => {
        // 메시지 전송 실패는 조용히 무시 (메인 다운로드에 영향 없음)
        console.warn('⚠️ [ai-controller] Failed to broadcast download progress:', error);
      });
    } catch (error) {
      console.warn('⚠️ [ai-controller] Failed to broadcast download progress:', error);
    }
  }

  /**
   * 모델 전환 (기존 모델 언로드 후 새 모델 로드)
   */
  public async switchModel(modelId: string, token?: string): Promise<boolean> {
    const modelInfo = AVAILABLE_MODELS[modelId];
    if (!modelInfo) {
      console.error(`❌ [ai-controller] Unknown model ID: ${modelId}`);
      return false;
    }

    console.log(`🔄 [ai-controller] Switching from ${this.currentModelId} to ${modelId}...`);

    // 기존 모델 언로드
    if (this.llm) {
      this.llm = null;
      console.log('📋 [ai-controller] Previous model unloaded from memory');
    }

    // 새 모델 설정 업데이트
    this.currentModelId = modelId;
    Object.assign(this.fullConfig, modelInfo.defaultConfig);

    // 새 모델 상태 초기화
    this.modelStatus = {
      state: 1,
      currentModelId: modelId
    };

    // 모델이 이미 다운로드되어 있는지 확인
    const modelExists = await OPFSFileManager.checkModelExists(modelId);
    if (modelExists) {
      console.log(`✅ [ai-controller] Model ${modelId} found in cache, ready to load`);
      this.modelStatus.state = 4; // 캐시됨, 로드 필요
      return true;
    }

    // 모델이 없으면 다운로드 필요
    if (modelInfo.requiresToken && !token) {
      console.error(`❌ [ai-controller] Model ${modelId} requires authentication token`);
      this.modelStatus.error = 'Authentication token required';
      return false;
    }

    // 모델 다운로드
    console.log(`📥 [ai-controller] Downloading model ${modelId}...`);
    return this.downloadAndCacheModel(token || '', modelId);
  }

  /**
   * 모든 캐시된 모델 목록 및 상태 반환
   */
  public async getAllModelsStatus(): Promise<Record<string, { exists: boolean; size?: number }>> {
    const result: Record<string, { exists: boolean; size?: number }> = {};

    for (const modelId of Object.keys(AVAILABLE_MODELS)) {
      try {
        const exists = await OPFSFileManager.checkModelExists(modelId);
        result[modelId] = { exists };

        if (exists) {
          // 파일 크기 확인은 OPFSFileManager에서 처리하도록 위임
          // 여기서는 기본적인 존재 여부만 확인
        }
      } catch (error) {
        console.error(`❌ [ai-controller] Failed to check model ${modelId}:`, error);
        result[modelId] = { exists: false };
      }
    }

    return result;
  }

  /**
   * 특정 모델의 대략적인 커버리지 평가 (예시용)
   */
  public getModelCapabilities(modelId: string): {
    accuracy: string;
    speed: string;
    memoryUsage: string;
    authRequired: boolean;
  } | null {
    const modelInfo = AVAILABLE_MODELS[modelId];
    if (!modelInfo) return null;

    // 모델별 대략적인 특성 매핑
    const capabilities = {
      'gemma3-4b-it': {
        accuracy: '높음 (최고 95.7%)',
        speed: '보통 (347ms)',
        memoryUsage: '높음 (2.4GB)',
        authRequired: true
      },
      'phi-4-mini': {
        accuracy: '높음 (추정 90%+)',
        speed: '빠름 (추정 280ms)',
        memoryUsage: '보통 (1.8GB)',
        authRequired: false
      }
    };

    return capabilities[modelId as keyof typeof capabilities] || {
      accuracy: '알 수 없음',
      speed: '알 수 없음',
      memoryUsage: modelInfo.size,
      authRequired: modelInfo.requiresToken
    };
  }
}

let aiControllerInstance: AIController | null = null;

/**
 * AI 컸트롤러 싱글톤 인스턴스 반환 (다중 모델 지원)
 */
export function getAIController(modelId?: string): AIController {
  if (!aiControllerInstance) {
    aiControllerInstance = new AIController({}, modelId);
  } else if (modelId && modelId !== aiControllerInstance.getCurrentModelId()) {
    // 다른 모델이 요청되면 새 인스턴스 생성
    console.log(`🔄 [ai-controller] Creating new instance for model: ${modelId}`);
    aiControllerInstance = new AIController({}, modelId);
  }
  return aiControllerInstance;
}

/**
 * AI 컸트롤러 인스턴스 강제 재설정 (디버깅용)
 */
export function resetAIController(): void {
  if (aiControllerInstance) {
    console.log('🔄 [ai-controller] Resetting AI controller instance');
    aiControllerInstance = null;
  }
}