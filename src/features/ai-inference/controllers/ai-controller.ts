// AI 추론 컨트롤러 - Gemma 3 4B 모델로 업그레이드

import { LlmInference, FilesetResolver } from '@mediapipe/tasks-genai';
import { VoiceIntent, AIAnalysisResult, AIModelConfig, AIModelStatus } from '../types/ai-types';
import { getPromptTemplate, AI_PROMPTS, CURRENT_PROMPT } from '../config/ai-prompts';

// OPFS 설정 (IndexedDB 제거, OPFS만 사용)
const MODEL_KEY = 'gemma3-4b-it-int4';
const MODEL_FILE_NAME = `${MODEL_KEY}.bin`;

export class AIController {
  private llm: LlmInference | null = null;
  private modelStatus: AIModelStatus = {
    state: 1 // 1: 캐시없음/로딩안됨
  };

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


  constructor(config: AIModelConfig = {}) {
    this.fullConfig = {
      // [변경] Gemma3-4B-IT 모델 유지 (사용자 요청)
      // IndexedDB 스트리밍 저장 방식으로 메모리 부족 문제 해결
modelPath: "https://huggingface.co/litert-community/Gemma3-4B-IT/resolve/main/gemma3-4b-it-int4-web.task",
      maxTokens: 2048,
      // ✨ [수정] 온도 값을 낮춰 분류 정확도 향상
      temperature: 0.05,
      topK: 40,
      randomSeed: 42,
      ...config
    };

    // ✨ CURRENT_PROMPT에서 키 찾기
    const currentKey = Object.keys(AI_PROMPTS).find(
      key => AI_PROMPTS[key as keyof typeof AI_PROMPTS] === CURRENT_PROMPT
    ) as keyof typeof AI_PROMPTS;
    
    this.currentPromptName = currentKey || 'SIMPLE_CLASSIFICATION';
    
    console.log(`🤖 [ai-controller] Config initialized for API token download.`);
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

      // OPFS에서 모델 파일 확인 (더 상세한 로깅)
      console.log('🔍 [ai-controller] Checking if model exists in OPFS...');
      const modelExists = await this.checkModelExistsInOPFS();
      console.log(`🔍 [ai-controller] Model exists check result: ${modelExists}`);
      
      if (!modelExists) {
        console.error('❌ [ai-controller] No model file found in OPFS. Please download the model.');
        this.modelStatus = { state: 1, error: 'Model not found in OPFS.' };
        return false;
      }

      try {
        console.log('🔗 [ai-controller] Loading model from OPFS file...');
        
        // OPFS에서 파일 로드하여 Object URL 생성
        const modelFilePath = await this.getModelFileURL();
        console.log(`✅ [ai-controller] Model file URL: ${modelFilePath}`);
        
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
  async downloadAndCacheModelAsPath(token: string): Promise<boolean> {
    console.log('💾 [ai-controller] Skipping modelAssetPath, downloading and caching model for persistent storage...');
    
    // modelAssetPath는 실제 저장하지 않으므로 바로 다운로드 방식 사용
    return this.downloadAndCacheModel(token);
  }

  async downloadAndCacheModel(token: string): Promise<boolean> {
    console.log('📥 [ai-controller] Downloading model from Hugging Face with API token...');
    this.modelStatus = { state: 2 }; // 로딩 중
    
    // AbortController로 긴 다운로드 타임아웃 제어
    const controller = new AbortController();
    const downloadTimeout = setTimeout(() => {
      controller.abort();
      console.error('❌ [ai-controller] Download timeout after 10 minutes');
    }, 10 * 60 * 1000); // 10분 타임아웃

    try {
      console.log('🔗 [ai-controller] Attempting to fetch:', this.fullConfig.modelPath);
      console.log('🔑 [ai-controller] Using token:', token ? `${token.substring(0, 10)}...` : 'No token');
      
      const response = await fetch(this.fullConfig.modelPath!, {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'Chrome Extension Crawler v4.16.0',
        },
        signal: controller.signal // AbortController 신호 추가
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

      // OPFS 파일 핸들 생성
      const { writable } = await this.createOPFSFileWriter();
      let receivedLength = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // OPFS에 직접 스트리밍 쓰기
          await writable.write(value);
          receivedLength += value.length;
          
          // 진행률 로그 (100MB마다)
          if (receivedLength % (100 * 1024 * 1024) < value.length) {
            const progress = contentLength > 0 ? (receivedLength / contentLength * 100).toFixed(1) : 'unknown';
            console.log(`📊 [ai-controller] Downloaded to OPFS: ${(receivedLength / 1024 / 1024).toFixed(2)}MB (${progress}%)`);
          }
        }

        // 파일 쓰기 완료
        await writable.close();
        console.log(`✅ [ai-controller] Download complete to OPFS: ${(receivedLength / 1024 / 1024).toFixed(2)}MB`);
        
        // 다운로드 완료 상태로 업데이트 (로드하지 않음)
        this.modelStatus = { 
          state: 4 // 캐시됨, 로드 필요
        };
        console.log('✅ [ai-controller] Model status updated: Ready to load');
        
        return true;
        
      } catch (writeError) {
        // 쓰기 실패 시 파일 정리
        await writable.abort();
        throw writeError;
      }
  
    } catch (error: any) {
      clearTimeout(downloadTimeout); // 에러 시에도 타임아웃 해제
      
      console.error('❌ [ai-controller] Full error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      if (error.name === 'AbortError') {
        console.error('❌ [ai-controller] Download aborted due to timeout (10 minutes)');
        this.modelStatus = { state: 1, error: 'Download timeout after 10 minutes' };
      } else if (error.message.includes('Failed to fetch')) {
        console.error('❌ [ai-controller] Network error during download. Possible causes:');
        console.error('  1. Invalid Hugging Face token');
        console.error('  2. Token lacks access to this model');
        console.error('  3. Network/firewall blocking the request');
        console.error('  4. CORS policy restriction');
        this.modelStatus = { state: 1, error: 'Network connection failed. Check your internet connection or Hugging Face token.' };
      } else {
        console.error('❌ [ai-controller] Failed to download or cache model:', error);
        this.modelStatus = { state: 1, error: error.message };
      }
      return false;
    }
  }
  
  /**
   * OPFS 캐시된 모델 삭제
   */
  async deleteCachedModel(): Promise<void> {
    try {
      const opfsRoot = await navigator.storage.getDirectory();
      const modelsDir = await opfsRoot.getDirectoryHandle('models', { create: false });
      await modelsDir.removeEntry(MODEL_FILE_NAME);
      console.log('✅ [ai-controller] OPFS model file deleted.');
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        console.log('ℹ️ [ai-controller] Model file not found in OPFS (already deleted).');
      } else {
        console.error('❌ [ai-controller] Failed to delete OPFS model:', error);
        throw error;
      }
    }
    
    if (this.llm) this.llm = null;
    this.modelStatus = { state: 1 }; // 캐시 없음
  }

  /**
   * OPFS에서 모델 존재 여부만 체크 (로딩하지 않음)
   */
  async checkModelExistsInOPFS(): Promise<boolean> {
    // 다운로드 중이어도 실제 파일 존재 여부는 체크 (더 안전함)
    console.log(`🔍 [ai-controller] Checking OPFS file existence (current state: ${this.modelStatus.state})`);
    if (this.modelStatus.state === 2) {
      console.log('⚠️ [ai-controller] Download in progress, but checking file anyway...');
    }

    try {
      const opfsRoot = await navigator.storage.getDirectory();
      const modelsDir = await opfsRoot.getDirectoryHandle('models', { create: false });
      const fileHandle = await modelsDir.getFileHandle(MODEL_FILE_NAME, { create: false });
      const file = await fileHandle.getFile();
      
      const exists = file.size > 0;
      console.log(`🔍 [ai-controller] Found model in OPFS: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return exists;
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        console.log('🔍 [ai-controller] No model file found in OPFS');
        return false;
      } else {
        console.error('❌ [ai-controller] Failed to check OPFS model existence:', error);
        return false;
      }
    }
  }

  /**
   * 모델 상태 확인 (OPFS 존재 여부 반영)
   */
  async getModelStatus(): Promise<AIModelStatus> {
    if (this.modelStatus.state === 1) {
      const modelExists = await this.checkModelExistsInOPFS();
      if (modelExists) {
        this.modelStatus = {
          ...this.modelStatus,
          state: 4 
        };
        console.log('📦 [ai-controller] Model found in cache but not loaded in memory');
      }
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
        const prompt = this.buildAnalysisPrompt(voiceInput);
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
   */
  private buildAnalysisPrompt(voiceInput: string): string {
    const promptTemplate = getPromptTemplate(this.currentPromptName);
    console.log(`🎯 [ai-controller] Using prompt template: ${promptTemplate.name}`);
    return promptTemplate.template(voiceInput);
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
        return { intent, reasoning: 'Fallback analysis (No JSON found)' };
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
        confidence: parsedResponse.confidence || 0.8,
        reasoning: parsedResponse.reasoning || 'AI analysis complete'
      };
      
      return {
        intent,
        reasoning: parsedResponse.reasoning || 'AI analysis complete',
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
      return { intent, reasoning: 'Fallback analysis (JSON parsing failed)' };
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
   * OPFS 파일 쓰기용 WritableStream 생성
   */
  private async createOPFSFileWriter(): Promise<{ writable: FileSystemWritableFileStream, fileHandle: FileSystemFileHandle }> {
    try {
      console.log('📁 [ai-controller] Creating OPFS file writer...');
      
      const opfsRoot = await navigator.storage.getDirectory();
      const modelsDir = await opfsRoot.getDirectoryHandle('models', { create: true });
      const fileHandle = await modelsDir.getFileHandle(MODEL_FILE_NAME, { create: true });
      const writable = await fileHandle.createWritable();
      
      console.log(`📄 [ai-controller] Created OPFS writable stream: ${MODEL_FILE_NAME}`);
      return { writable, fileHandle };
      
    } catch (error: any) {
      console.error('❌ [ai-controller] Failed to create OPFS writer:', error);
      throw new Error(`OPFS writer creation failed: ${error.message}`);
    }
  }

  /**
   * OPFS에서 모델 파일의 Object URL 반환
   */
  private async getModelFileURL(): Promise<string> {
    try {
      console.log('🔗 [ai-controller] Getting OPFS root directory...');
      const opfsRoot = await navigator.storage.getDirectory();
      
      console.log('🔗 [ai-controller] Getting models directory...');
      const modelsDir = await opfsRoot.getDirectoryHandle('models', { create: false });
      
      console.log(`🔗 [ai-controller] Getting file handle for: ${MODEL_FILE_NAME}`);
      const fileHandle = await modelsDir.getFileHandle(MODEL_FILE_NAME, { create: false });
      
      console.log('🔗 [ai-controller] Getting file object...');
      const file = await fileHandle.getFile();
      console.log(`🔗 [ai-controller] File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      
      const fileUrl = URL.createObjectURL(file);
      console.log(`🔗 [ai-controller] Created file URL from OPFS: ${fileUrl}`);
      
      return fileUrl;
      
    } catch (error: any) {
      console.error('❌ [ai-controller] Failed to get OPFS file URL:', error);
      console.error('❌ [ai-controller] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw new Error(`OPFS file URL creation failed: ${error.message}`);
    }
  }
}

let aiControllerInstance: AIController | null = null;

export function getAIController(): AIController {
  if (!aiControllerInstance) {
    aiControllerInstance = new AIController();
  }
  return aiControllerInstance;
}