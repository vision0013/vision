// AI 추론 컨트롤러 - Gemma 3 4B 모델로 업그레이드

import { LlmInference, FilesetResolver } from '@mediapipe/tasks-genai';
import { VoiceIntent, AIAnalysisResult, AIModelConfig, AIModelStatus, ModelDownloadProgress } from '../types/ai-types';
import { getPromptTemplate, AI_PROMPTS, CURRENT_PROMPT, getBaseExamples, PromptExample } from '../config/ai-prompts';
import { AVAILABLE_MODELS, DEFAULT_MODEL_ID } from '../config/model-registry';

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

// OPFS 설정 - 다중 모델 지원
const MODELS_DIR_NAME = 'models';
const LEARNED_EXAMPLES_FILE_NAME = 'learned-examples.json';
const LEARNED_EXAMPLES_BACKUP_FILE_NAME = 'learned-examples-backup.json';
const SNAPSHOTS_DIR_NAME = 'snapshots';

// 모델별 파일명 생성 함수
function getModelFileName(modelId: string): string {
  return `${modelId}.task`;
}

// 최대 스냅샷 개수 상수 추가
const MAX_SNAPSHOTS = 20;


export class AIController {
  private llm: LlmInference | null = null;
  private modelStatus: AIModelStatus = {
    state: 1 // 1: 캐시없음/로딩안됨
  };
  private isLearning: boolean = false; // 학습 중복 방지

  // ✨ 다중 모델 지원
  private currentModelId: string = DEFAULT_MODEL_ID;
  private downloadProgress: ModelDownloadProgress | null = null;
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
      const modelExists = await this.checkModelExistsInOPFS(this.currentModelId);
      console.log(`🔍 [ai-controller] Model exists check result: ${modelExists}`);

      if (!modelExists) {
        console.error(`❌ [ai-controller] No model file found for ${this.currentModelId} in OPFS. Please download the model.`);
        this.modelStatus = { state: 1, currentModelId: this.currentModelId, error: 'Model not found in OPFS.' };
        return false;
      }

      try {
        console.log('🔗 [ai-controller] Loading model from OPFS file...');
        
        // OPFS에서 현재 모델 파일 로드하여 Object URL 생성
        const modelFilePath = await this.getModelFileURL(this.currentModelId);
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

    console.log(`📥 [ai-controller] Downloading model ${modelInfo.name} from Hugging Face...`);

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
    const controller = new AbortController();
    const downloadTimeout = setTimeout(() => {
      controller.abort();
      console.error('❌ [ai-controller] Download timeout after 10 minutes');
    }, 10 * 60 * 1000); // 10분 타임아웃

    try {
      const modelPath = modelInfo.modelPath;
      console.log(`🔗 [ai-controller] Attempting to fetch: ${modelPath}`);

      const headers: Record<string, string> = {
        'User-Agent': 'Chrome Extension Crawler v4.18.1',
      };

      // 토큰이 필요한 모델만 인증 헤더 추가
      if (modelInfo.requiresToken) {
        if (!token) {
          throw new Error(`Model ${modelInfo.name} requires authentication token`);
        }
        headers.Authorization = `Bearer ${token}`;
        console.log('🔑 [ai-controller] Using token:', `${token.substring(0, 10)}...`);
      } else {
        console.log('🔓 [ai-controller] No authentication required for this model');
      }

      const response = await fetch(modelPath, {
        headers,
        signal: controller.signal
      });

      // 타임아웃 해제
      clearTimeout(downloadTimeout);

      console.log('📡 [ai-controller] Response status:', response.status, response.statusText);
      console.log('📡 [ai-controller] Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error(`Failed to download model: ${response.status} ${response.statusText}`);
      }
      
      console.log('📊 [ai-controller] Starting model download to OPFS, this may take several minutes...');
      
      // 스트리밍 방식으로 OPFS에 직접 저장 (메모리 안전)
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const contentLength = parseInt(response.headers.get('content-length') || '0');
      console.log(`📦 [ai-controller] Expected size: ${(contentLength / 1024 / 1024).toFixed(2)}MB`);

      // 다운로드 진행률 초기화
      this.downloadProgress!.totalBytes = contentLength;

      // OPFS 파일 핸들 생성 (대상 모델 ID 전달)
      const { writable } = await this.createOPFSFileWriter(targetModelId);
      let receivedLength = 0;
      let lastProgressUpdate = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // OPFS에 직접 스트리밍 쓰기
          await writable.write(value);
          receivedLength += value.length;

          // 실시간 진행률 업데이트
          const currentProgress = contentLength > 0 ? Math.floor((receivedLength / contentLength) * 100) : 0;

          if (this.downloadProgress) {
            this.downloadProgress.downloadedBytes = receivedLength;
            this.downloadProgress.progress = currentProgress;

            // UI에 실시간 진행률 전송 (5%마다 또는 50MB마다)
            if (currentProgress - lastProgressUpdate >= 5 || receivedLength % (50 * 1024 * 1024) < value.length) {
              this.broadcastDownloadProgress();
              lastProgressUpdate = currentProgress;
            }
          }

          // 로그 출력 (진행률 전송과 동시)
          if (currentProgress - (lastProgressUpdate - 5) >= 5 || receivedLength % (50 * 1024 * 1024) < value.length) {
            console.log(`📊 [ai-controller] Download progress: ${(receivedLength / 1024 / 1024).toFixed(1)}MB / ${(contentLength / 1024 / 1024).toFixed(1)}MB (${currentProgress}%)`);
          }
        }

        // 파일 쓰기 완료
        await writable.close();
        console.log(`✅ [ai-controller] Download complete to OPFS: ${(receivedLength / 1024 / 1024).toFixed(2)}MB`);

        // 다운로드 진행률 완료 업데이트
        if (this.downloadProgress) {
          this.downloadProgress.progress = 100;
          this.downloadProgress.status = 'completed';
          this.broadcastDownloadProgress(); // 완료 상태 전송
        }

        // 다운로드 완료 상태로 업데이트 (로드하지 않음)
        this.modelStatus = {
          state: 4, // 캐시됨, 로드 필요
          currentModelId: targetModelId
        };
        console.log(`✅ [ai-controller] Model ${modelInfo.name} download complete and ready to load`);
        
        return true;
        
      } catch (writeError) {
        // 쓰기 실패 시 파일 정리
        await writable.abort();
        if (this.downloadProgress) {
          this.downloadProgress.status = 'error';
          this.downloadProgress.error = 'Write failed';
          this.broadcastDownloadProgress(); // 에러 상태 전송
        }
        throw writeError;
      }
  
    } catch (error: any) {
      clearTimeout(downloadTimeout); // 에러 시에도 타임아웃 해제
      
      console.error('❌ [ai-controller] Full error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // 다운로드 진행률 에러 업데이트
      if (this.downloadProgress) {
        this.downloadProgress.status = 'error';
        this.downloadProgress.error = error.message;
        this.broadcastDownloadProgress(); // 에러 상태 전송
      }

      if (error.name === 'AbortError') {
        console.error('❌ [ai-controller] Download aborted due to timeout (10 minutes)');
        this.modelStatus = { state: 1, currentModelId: targetModelId, error: 'Download timeout after 10 minutes' };
      } else if (error.message.includes('Failed to fetch')) {
        const errorMsg = modelInfo.requiresToken
          ? 'Network error. Check your internet connection or Hugging Face token.'
          : 'Network error. Check your internet connection.';
        console.error(`❌ [ai-controller] Network error during download of ${modelInfo.name}`);
        this.modelStatus = { state: 1, currentModelId: targetModelId, error: errorMsg };
      } else {
        console.error(`❌ [ai-controller] Failed to download ${modelInfo.name}:`, error);
        this.modelStatus = { state: 1, currentModelId: targetModelId, error: error.message };
      }
      return false;
    }
  }
  
  /**
   * OPFS 캐시된 모델 삭제 (다중 모델 지원)
   */
  async deleteCachedModel(modelId?: string): Promise<void> {
    const targetModelId = modelId || this.currentModelId;
    const modelFileName = getModelFileName(targetModelId);

    try {
      const opfsRoot = await navigator.storage.getDirectory();
      const modelsDir = await opfsRoot.getDirectoryHandle(MODELS_DIR_NAME, { create: false });
      await modelsDir.removeEntry(modelFileName);
      console.log(`✅ [ai-controller] OPFS model file deleted: ${modelFileName}`);
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        console.log(`ℹ️ [ai-controller] Model file not found in OPFS: ${modelFileName}`);
      } else {
        console.error(`❌ [ai-controller] Failed to delete OPFS model ${targetModelId}:`, error);
        throw error;
      }
    }

    // 현재 로드된 모델이 삭제된 모델이면 메모리에서도 제거
    if (targetModelId === this.currentModelId) {
      if (this.llm) this.llm = null;
      this.modelStatus = { state: 1, currentModelId: this.currentModelId };
    }
  }

  /**
   * OPFS에서 모델 존재 여부만 체크 (다중 모델 지원)
   */
  async checkModelExistsInOPFS(modelId?: string): Promise<boolean> {
    const targetModelId = modelId || this.currentModelId;
    const modelFileName = getModelFileName(targetModelId);

    // 다운로드 중이어도 실제 파일 존재 여부는 체크
    console.log(`🔍 [ai-controller] Checking OPFS file existence (current state: ${this.modelStatus.state})`);
    if (this.modelStatus.state === 2) {
      console.log('⚠️ [ai-controller] Download in progress, but checking file anyway...');
    }

    try {
      const opfsRoot = await navigator.storage.getDirectory();
      const modelsDir = await opfsRoot.getDirectoryHandle(MODELS_DIR_NAME, { create: false });
      const fileHandle = await modelsDir.getFileHandle(modelFileName, { create: false });
      const file = await fileHandle.getFile();

      const exists = file.size > 0;
      console.log(`🔍 [ai-controller] Found model ${targetModelId} in OPFS: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return exists;
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        console.log(`🔍 [ai-controller] No model file found in OPFS: ${modelFileName}`);
        return false;
      } else {
        console.error(`❌ [ai-controller] Failed to check OPFS model existence for ${targetModelId}:`, error);
        return false;
      }
    }
  }

  /**
   * 모델 상태 확인 (다중 모델 지원, OPFS 존재 여부 반영)
   */
  async getModelStatus(modelId?: string): Promise<AIModelStatus> {
    const targetModelId = modelId || this.currentModelId;

    // 현재 모델에 대한 상태만 업데이트
    if (targetModelId === this.currentModelId && this.modelStatus.state === 1) {
      const modelExists = await this.checkModelExistsInOPFS(targetModelId);
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
      const modelExists = await this.checkModelExistsInOPFS(targetModelId);
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
        const result = this.parseAIResponse(response, voiceInput);
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
    
    // Chrome Storage에서 추가 학습된 예시들 로드
    const learnedExamples = await this.getLearnedExamples();
    
    // 모든 예시 결합 (학습된 예시가 우선순위 높음)
    const allExamples = [...learnedExamples, ...baseExamples];
    
    console.log(`📚 [ai-controller] Using ${baseExamples.length} base examples + ${learnedExamples.length} learned examples`);
    
    return promptTemplate.template(voiceInput, allExamples);
  }

  /**
   * OPFS에서 학습된 예시들 로드
   */
  private async getLearnedExamples(): Promise<PromptExample[]> {
    try {
      console.log('📖 [ai-controller] Loading learned examples from OPFS...');
      
      const opfsRoot = await navigator.storage.getDirectory();
      const modelsDir = await opfsRoot.getDirectoryHandle(MODELS_DIR_NAME, { create: true });
      
      try {
        const fileHandle = await modelsDir.getFileHandle(LEARNED_EXAMPLES_FILE_NAME, { create: false });
        const file = await fileHandle.getFile();
        const content = await file.text();
        
        if (!content.trim()) {
          console.log('📖 [ai-controller] Learned examples file is empty');
          return [];
        }
        
        const learnedExamples = JSON.parse(content);
        console.log(`📖 [ai-controller] Loaded ${learnedExamples.length} learned examples from OPFS`);
        return learnedExamples;
        
      } catch (error: any) {
        if (error.name === 'NotFoundError') {
          console.log('📖 [ai-controller] No learned examples file found, starting fresh');
          return [];
        }
        throw error;
      }
    } catch (error) {
      console.error('❌ [ai-controller] Failed to load learned examples from OPFS:', error);
      return [];
    }
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
        await this.createSnapshot(snapshotDescription);
        console.log('📸 [ai-controller] Auto-snapshot created before learning');
      } catch (snapshotError) {
        console.warn('⚠️ [ai-controller] Failed to create auto-snapshot, but continuing with learning:', snapshotError);
      }
      
      const currentLearned = await this.getLearnedExamples();
      
      // 새로운 예시들을 생성 (중복 제거)
      const newExamples: PromptExample[] = failedTests
        .filter(test => !currentLearned.some(learned => learned.command === test.command))
        .map(test => ({
          command: test.command,
          action: test.expected,
          confidence: 0.95, // 학습된 예시는 높은 confidence로 설정
          reasoning: this.generateReasoningForAction(test.command, test.expected, test.description)
        }));

      if (newExamples.length > 0) {
        const updatedExamples = [...currentLearned, ...newExamples];
        await this.saveLearnedExamplesToOPFS(updatedExamples);
        console.log(`✅ [ai-controller] Learned ${newExamples.length} new examples. Total learned: ${updatedExamples.length}`);
      } else {
        console.log('ℹ️ [ai-controller] No new examples to learn (all already exist)');
      }
    } catch (error) {
      console.error('❌ [ai-controller] Failed to learn from failed tests:', error);
      throw error;
    } finally {
      this.isLearning = false; // 플래그 해제
    }
  }

  /**
   * 액션에 대한 적절한 reasoning 생성
   */
  private generateReasoningForAction(command: string, action: string, description?: string): string {
    const baseReasonings = {
      'product_search': `'${command}'에서 제품 검색 의도가 명확하여 상품 검색으로 분류`,
      'price_comparison': `'${command}'에서 가격, 최저가, 비교 등의 키워드가 포함되어 가격 비교로 분류`,
      'simple_find': `'${command}'에서 버튼, 클릭, 찾기 등 UI 조작 의도가 명확함`,
      'purchase_flow': `'${command}'에서 구매, 주문, 장바구니 등 구매 프로세스 진행 의도`,
      'navigation': `'${command}'에서 페이지 이동, 뒤로가기 등 네비게이션 의도`
    };

    const baseReasoning = baseReasonings[action as keyof typeof baseReasonings] || 
                         `'${command}'에서 ${action} 카테고리의 특징적 요소가 식별됨`;
    
    return description ? `${baseReasoning}. ${description}` : baseReasoning;
  }

  /**
   * ✨ 안정적인 파싱 로직
   */
  private parseAIResponse(response: string, originalCommand: string): AIAnalysisResult {
    try {
      console.log('🔍 [ai-controller] Raw AI response:', response);
      
      const firstBrace = response.indexOf('{');
      const lastBrace = response.lastIndexOf('}');
      
      if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
        console.warn('⚠️ [ai-controller] No valid JSON object found in response, using fallback.');
        const fallbackAction = this.guessActionFromText(originalCommand);
        const intent: VoiceIntent = {
          action: fallbackAction,
          confidence: 0.8,
          reasoning: 'Fallback analysis (No JSON found)'
        };
        return { intent };
      }
      
      let jsonString = response.substring(firstBrace, lastBrace + 1);
      
      // ✨ JSON 정리 로직
      jsonString = this.sanitizeJsonString(jsonString);
      
      const parsedResponse = JSON.parse(jsonString);
      
      const intent: VoiceIntent = {
        action: parsedResponse.action || 'unknown',
        product: parsedResponse.product,
        target: parsedResponse.target,
        detail: parsedResponse.detail,
        confidence: parsedResponse.confidence ?? 0.8,
        reasoning: parsedResponse.reasoning ?? 'AI analysis complete'
      };
      
      return {
        intent
      };
    } catch (error: any) {
      console.error('❌ [ai-controller] Failed to parse AI response:', error);
      console.error('❌ [ai-controller] Response was:', response);
      
      // ✨ fallback 처리
      const fallbackAction = this.guessActionFromText(originalCommand);
      const intent: VoiceIntent = {
        action: fallbackAction,
        confidence: 0.7,
        reasoning: 'Fallback analysis (JSON parsing failed)'
      };
      return { intent };
    }
  }

  /**
   * JSON 문자열 정리
   */
  private sanitizeJsonString(jsonString: string): string {
    try {
      // reasoning 값 내부의 따옴표 문제 해결
      const reasoningMatch = jsonString.match(/"reasoning":\s*"([^"]*(?:"[^"]*"[^"]*)*[^"]*)"/);
      if (reasoningMatch) {
        const originalReasoning = reasoningMatch[1];
        // 내부 따옴표를 작은따옴표로 변경
        const cleanReasoning = originalReasoning.replace(/"/g, "'");
        jsonString = jsonString.replace(reasoningMatch[0], `"reasoning": "${cleanReasoning}"`);
      }
      
      // 기타 일반적인 JSON 오류 수정
      jsonString = jsonString.replace(/[\r\n\t]/g, ' '); // 개행문자 제거
      jsonString = jsonString.replace(/,\s*}/g, '}');    // 마지막 콤마 제거
      
      console.log('🔧 [ai-controller] Sanitized JSON:', jsonString);
      return jsonString;
    } catch (error) {
      console.warn('⚠️ [ai-controller] JSON sanitization failed:', error);
      return jsonString; // 원본 반환
    }
  }

  /**
   * 폴백 분석
   */
  private guessActionFromText(text: string): VoiceIntent['action'] {
    const lower = text.toLowerCase();
    console.log('🔍 [ai-controller] Fallback analysis for:', lower);
    
    if ((lower.includes('아이폰') || lower.includes('갤럭시') || lower.includes('노트북')) && 
        (lower.includes('찾아') || lower.includes('검색'))) {
      return 'product_search';
    }
    if (lower.includes('최저가') || lower.includes('가격') || lower.includes('비교')) return 'price_comparison';
    if (lower.includes('버튼') || lower.includes('클릭') || lower.includes('눌러')) return 'simple_find';
    if (lower.includes('장바구니') || lower.includes('구매') || lower.includes('결제')) return 'purchase_flow';
    if (lower.includes('이전') || lower.includes('뒤로') || lower.includes('이동')) return 'navigation';
    if (lower.includes('찾아') || lower.includes('검색')) return 'product_search';
    
    return 'unknown';
  }

  /**
   * OPFS 파일 쓰기용 WritableStream 생성 (다중 모델 지원)
   */
  private async createOPFSFileWriter(modelId: string): Promise<{ writable: FileSystemWritableFileStream, fileHandle: FileSystemFileHandle }> {
    try {
      const modelFileName = getModelFileName(modelId);
      console.log(`📁 [ai-controller] Creating OPFS file writer for ${modelId}...`);

      const opfsRoot = await navigator.storage.getDirectory();
      const modelsDir = await opfsRoot.getDirectoryHandle(MODELS_DIR_NAME, { create: true });
      const fileHandle = await modelsDir.getFileHandle(modelFileName, { create: true });
      const writable = await fileHandle.createWritable();

      console.log(`📄 [ai-controller] Created OPFS writable stream: ${modelFileName}`);
      return { writable, fileHandle };

    } catch (error: any) {
      console.error(`❌ [ai-controller] Failed to create OPFS writer for ${modelId}:`, error);
      throw new Error(`OPFS writer creation failed: ${error.message}`);
    }
  }

  /**
   * OPFS에서 모델 파일의 Object URL 반환 (다중 모델 지원)
   */
  private async getModelFileURL(modelId: string): Promise<string> {
    try {
      const modelFileName = getModelFileName(modelId);
      console.log(`🔗 [ai-controller] Getting OPFS root directory for ${modelId}...`);
      const opfsRoot = await navigator.storage.getDirectory();
      
      console.log('🔗 [ai-controller] Getting models directory...');
      const modelsDir = await opfsRoot.getDirectoryHandle(MODELS_DIR_NAME, { create: false });

      console.log(`🔗 [ai-controller] Getting file handle for: ${modelFileName}`);
      const fileHandle = await modelsDir.getFileHandle(modelFileName, { create: false });

      console.log('🔗 [ai-controller] Getting file object...');
      const file = await fileHandle.getFile();
      console.log(`🔗 [ai-controller] File size for ${modelId}: ${(file.size / 1024 / 1024).toFixed(2)}MB`);

      const fileUrl = URL.createObjectURL(file);
      console.log(`🔗 [ai-controller] Created file URL from OPFS for ${modelId}: ${fileUrl}`);

      return fileUrl;
      
    } catch (error: any) {
      console.error(`❌ [ai-controller] Failed to get OPFS file URL for ${modelId}:`, error);
      console.error('❌ [ai-controller] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw new Error(`OPFS file URL creation failed for ${modelId}: ${error.message}`);
    }
  }

  /**
   * OPFS에 학습된 예시들을 JSON 파일로 저장
   */
  private async saveLearnedExamplesToOPFS(learnedExamples: PromptExample[]): Promise<void> {
    try {
      console.log('💾 [ai-controller] Saving learned examples to OPFS...');
      
      const opfsRoot = await navigator.storage.getDirectory();
      const modelsDir = await opfsRoot.getDirectoryHandle(MODELS_DIR_NAME, { create: true });
      const fileHandle = await modelsDir.getFileHandle(LEARNED_EXAMPLES_FILE_NAME, { create: true });
      
      const writable = await fileHandle.createWritable();
      
      // JSON 데이터를 예쁘게 포맷팅하여 저장
      const jsonContent = JSON.stringify(learnedExamples, null, 2);
      await writable.write(jsonContent);
      await writable.close();
      
      console.log(`💾 [ai-controller] Saved ${learnedExamples.length} learned examples to OPFS (${jsonContent.length} bytes)`);
      
    } catch (error: any) {
      console.error('❌ [ai-controller] Failed to save learned examples to OPFS:', error);
      throw new Error(`OPFS learned examples save failed: ${error.message}`);
    }
  }

  /**
   * OPFS에서 학습된 예시 파일 삭제 (필요시)
   */
  public async clearLearnedExamples(): Promise<void> {
    try {
      console.log('🗑️ [ai-controller] Clearing learned examples from OPFS...');
      
      const opfsRoot = await navigator.storage.getDirectory();
      const modelsDir = await opfsRoot.getDirectoryHandle('models', { create: false });
      
      try {
        await modelsDir.removeEntry(LEARNED_EXAMPLES_FILE_NAME);
        console.log('✅ [ai-controller] Learned examples file deleted from OPFS');
      } catch (error: any) {
        if (error.name === 'NotFoundError') {
          console.log('ℹ️ [ai-controller] No learned examples file to delete');
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      console.error('❌ [ai-controller] Failed to clear learned examples:', error);
      throw error;
    }
  }

  /**
   * 학습된 예시 현황 조회
   */
  public async getLearnedExamplesStats(): Promise<{count: number, size: number}> {
    try {
      const opfsRoot = await navigator.storage.getDirectory();
      const modelsDir = await opfsRoot.getDirectoryHandle('models', { create: false });
      const fileHandle = await modelsDir.getFileHandle(LEARNED_EXAMPLES_FILE_NAME, { create: false });
      const file = await fileHandle.getFile();
      
      const content = await file.text();
      const examples = content.trim() ? JSON.parse(content) : [];
      
      return {
        count: examples.length,
        size: file.size
      };
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        return { count: 0, size: 0 };
      }
      throw error;
    }
  }

  /**
   * 현재 학습 데이터의 스냅샷 생성 (학습 전 백업)
   */
  public async createSnapshot(description?: string): Promise<LearningSnapshot> {
    try {
      console.log('📸 [ai-controller] Creating learning data snapshot...');
      
    // --- 추가될 로직 시작 ---
    const snapshots = await this.getSnapshots();
    if (snapshots.length >= MAX_SNAPSHOTS) {
      // 가장 오래된 스냅샷 찾기 (생성 날짜 오름차순 정렬)
      const oldestSnapshot = snapshots.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
      if (oldestSnapshot) {
        console.log(`🗑️ [ai-controller] Max snapshots reached. Deleting oldest: ${oldestSnapshot.name}`);
        await this.deleteSnapshot(oldestSnapshot.id);
      }
    }
    // --- 추가될 로직 끝 ---

      const currentExamples = await this.getLearnedExamples();
      const snapshotId = `snapshot_${Date.now()}`;
      const snapshotName = description || `Auto backup ${new Date().toLocaleString()}`;
      
      const snapshot: LearningSnapshot = {
        id: snapshotId,
        name: snapshotName,
        createdAt: new Date(),
        examples: currentExamples,
        description
      };
      
      // 스냅샷을 OPFS에 저장
      await this.saveSnapshotToOPFS(snapshot);
      
      console.log(`📸 [ai-controller] Snapshot created: ${snapshotId} with ${currentExamples.length} examples`);
      return snapshot;
      
    } catch (error: any) {
      console.error('❌ [ai-controller] Failed to create snapshot:', error);
      throw new Error(`Snapshot creation failed: ${error.message}`);
    }
  }

  /**
   * 특정 스냅샷으로 롤백
   */
  public async rollbackToSnapshot(snapshotId: string): Promise<boolean> {
    try {
      console.log(`⏪ [ai-controller] Rolling back to snapshot: ${snapshotId}`);
      
      const snapshot = await this.loadSnapshotFromOPFS(snapshotId);
      if (!snapshot) {
        throw new Error(`Snapshot not found: ${snapshotId}`);
      }
      
      // 현재 데이터를 백업용으로 저장
      await this.createBackupBeforeRollback();
      
      // 스냅샷 데이터로 현재 파일 교체
      await this.saveLearnedExamplesToOPFS(snapshot.examples);
      
      console.log(`⏪ [ai-controller] Successfully rolled back to snapshot: ${snapshotId}`);
      console.log(`📊 [ai-controller] Restored ${snapshot.examples.length} examples from ${snapshot.name}`);
      
      return true;
      
    } catch (error: any) {
      console.error('❌ [ai-controller] Rollback failed:', error);
      throw new Error(`Rollback failed: ${error.message}`);
    }
  }

  /**
   * 모든 스냅샷 목록 조회
   */
  public async getSnapshots(): Promise<LearningSnapshot[]> {
    try {
      const opfsRoot = await navigator.storage.getDirectory();
      const modelsDir = await opfsRoot.getDirectoryHandle(MODELS_DIR_NAME, { create: true });
      
      try {
        const snapshotsDir = await modelsDir.getDirectoryHandle(SNAPSHOTS_DIR_NAME, { create: false });
        const snapshots: LearningSnapshot[] = [];
        
        // @ts-ignore - OPFS의 entries() 메서드 사용
        for await (const [name, handle] of snapshotsDir.entries()) {
          if (handle.kind === 'file' && name.endsWith('.json')) {
            try {
              const file = await handle.getFile();
              const content = await file.text();
              const snapshot = JSON.parse(content);
              
              // Date 객체로 변환
              snapshot.createdAt = new Date(snapshot.createdAt);
              snapshots.push(snapshot);
            } catch (error) {
              console.warn(`⚠️ [ai-controller] Failed to load snapshot ${name}:`, error);
            }
          }
        }
        
        // 생성 시간순으로 정렬 (최신순)
        return snapshots.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
      } catch (error: any) {
        if (error.name === 'NotFoundError') {
          console.log('📸 [ai-controller] No snapshots directory found');
          return [];
        }
        throw error;
      }
    } catch (error) {
      console.error('❌ [ai-controller] Failed to get snapshots:', error);
      return [];
    }
  }

  /**
   * 특정 스냅샷 삭제
   */
  public async deleteSnapshot(snapshotId: string): Promise<boolean> {
    try {
      console.log(`🗑️ [ai-controller] Deleting snapshot: ${snapshotId}`);
      
      const opfsRoot = await navigator.storage.getDirectory();
      const modelsDir = await opfsRoot.getDirectoryHandle('models', { create: false });
      const snapshotsDir = await modelsDir.getDirectoryHandle(SNAPSHOTS_DIR_NAME, { create: false });
      
      const fileName = `${snapshotId}.json`;
      await snapshotsDir.removeEntry(fileName);
      
      console.log(`✅ [ai-controller] Snapshot deleted: ${snapshotId}`);
      return true;
      
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        console.log(`ℹ️ [ai-controller] Snapshot not found: ${snapshotId}`);
        return false;
      }
      console.error('❌ [ai-controller] Failed to delete snapshot:', error);
      return false;
    }
  }

  /**
   * 스냅샷을 OPFS에 저장
   */
  private async saveSnapshotToOPFS(snapshot: LearningSnapshot): Promise<void> {
    try {
      const opfsRoot = await navigator.storage.getDirectory();
      const modelsDir = await opfsRoot.getDirectoryHandle(MODELS_DIR_NAME, { create: true });
      const snapshotsDir = await modelsDir.getDirectoryHandle(SNAPSHOTS_DIR_NAME, { create: true });
      
      const fileName = `${snapshot.id}.json`;
      const fileHandle = await snapshotsDir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      
      const jsonContent = JSON.stringify(snapshot, null, 2);
      await writable.write(jsonContent);
      await writable.close();
      
      console.log(`💾 [ai-controller] Snapshot saved to OPFS: ${fileName} (${jsonContent.length} bytes)`);
      
    } catch (error: any) {
      console.error('❌ [ai-controller] Failed to save snapshot to OPFS:', error);
      throw new Error(`Snapshot save failed: ${error.message}`);
    }
  }

  /**
   * OPFS에서 스냅샷 로드
   */
  private async loadSnapshotFromOPFS(snapshotId: string): Promise<LearningSnapshot | null> {
    try {
      const opfsRoot = await navigator.storage.getDirectory();
      const modelsDir = await opfsRoot.getDirectoryHandle('models', { create: false });
      const snapshotsDir = await modelsDir.getDirectoryHandle(SNAPSHOTS_DIR_NAME, { create: false });
      
      const fileName = `${snapshotId}.json`;
      const fileHandle = await snapshotsDir.getFileHandle(fileName, { create: false });
      const file = await fileHandle.getFile();
      const content = await file.text();
      
      const snapshot = JSON.parse(content);
      snapshot.createdAt = new Date(snapshot.createdAt);
      
      return snapshot;
      
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        console.log(`📸 [ai-controller] Snapshot not found: ${snapshotId}`);
        return null;
      }
      console.error('❌ [ai-controller] Failed to load snapshot from OPFS:', error);
      return null;
    }
  }

  /**
   * 롤백 전 현재 데이터를 백업 파일로 저장
   */
  private async createBackupBeforeRollback(): Promise<void> {
    try {
      const currentExamples = await this.getLearnedExamples();
      const opfsRoot = await navigator.storage.getDirectory();
      const modelsDir = await opfsRoot.getDirectoryHandle(MODELS_DIR_NAME, { create: true });
      const fileHandle = await modelsDir.getFileHandle(LEARNED_EXAMPLES_BACKUP_FILE_NAME, { create: true });

      const writable = await fileHandle.createWritable();
      const jsonContent = JSON.stringify(currentExamples, null, 2);
      await writable.write(jsonContent);
      await writable.close();

      console.log('💾 [ai-controller] Created backup before rollback');

    } catch (error) {
      console.warn('⚠️ [ai-controller] Failed to create backup before rollback:', error);
      // 백업 실패해도 롤백은 계속 진행
    }
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
    const modelExists = await this.checkModelExistsInOPFS(modelId);
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
        const exists = await this.checkModelExistsInOPFS(modelId);
        result[modelId] = { exists };

        if (exists) {
          // 파일 크기 확인
          try {
            const opfsRoot = await navigator.storage.getDirectory();
            const modelsDir = await opfsRoot.getDirectoryHandle(MODELS_DIR_NAME, { create: false });
            const fileHandle = await modelsDir.getFileHandle(getModelFileName(modelId), { create: false });
            const file = await fileHandle.getFile();
            result[modelId].size = file.size;
          } catch (sizeError) {
            console.warn(`⚠️ [ai-controller] Failed to get size for ${modelId}:`, sizeError);
          }
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