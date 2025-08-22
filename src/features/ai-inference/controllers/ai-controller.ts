// AI 추론 컨트롤러 - Gemma 3 1B 모델 (API 토큰 다운로드 방식)

import { LlmInference, FilesetResolver } from '@mediapipe/tasks-genai';
import { openDB } from 'idb';
import { VoiceIntent, AIAnalysisResult, AIModelConfig, AIModelStatus } from '../types/ai-types';
import { getPromptTemplate, AI_PROMPTS, CURRENT_PROMPT } from '../config/ai-prompts';

// IndexedDB 설정
const DB_NAME = 'ai-model-cache';
const MODEL_STORE_NAME = 'models';
const MODEL_KEY = 'gemma3-1b-it-int4';
const DB_VERSION = 2;

export class AIController {
  private llm: LlmInference | null = null;
  private modelStatus: AIModelStatus = {
    state: 1 // 1: 캐시없음/로딩안됨
  };

  private readonly fullConfig: AIModelConfig;
  
  // ✨ 프롬프트 관리 - CURRENT_PROMPT 기반으로 초기화
  private currentPromptName: keyof typeof AI_PROMPTS;

  constructor(config: AIModelConfig = {}) {
    this.fullConfig = {
      // Hugging Face의 Gated Model 경로
      modelPath: "https://huggingface.co/litert-community/Gemma3-1B-IT/resolve/main/gemma3-1b-it-int4.task?download=true",
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
      console.log('🚀 [ai-controller] Initializing AI model from local cache...');

      const db = await openDB(DB_NAME, DB_VERSION);
      const modelTaskFile = await db.get(MODEL_STORE_NAME, MODEL_KEY) as ArrayBuffer;

      if (!modelTaskFile || typeof modelTaskFile.byteLength === 'undefined') {
        console.error('❌ [ai-controller] No model task file found in cache. Please download the model.');
        this.modelStatus = { state: 1, error: 'Model not found in cache.' };
        return false;
      }
      console.log(`✅ [ai-controller] Found .task file in IndexedDB. Size: ${modelTaskFile.byteLength} bytes.`);

      const modelData = new Uint8Array(modelTaskFile);
      console.log(`- Loaded .task bundle directly. Size: ${modelData.byteLength} bytes.`);

      const wasmPath = chrome.runtime.getURL("wasm_files/");
      const genaiFileset = await FilesetResolver.forGenAiTasks(wasmPath);
      
      this.llm = await LlmInference.createFromOptions(genaiFileset, {
        baseOptions: { modelAssetBuffer: modelData },
        maxTokens: this.fullConfig.maxTokens!,
        temperature: this.fullConfig.temperature!,
        topK: this.fullConfig.topK!,
        randomSeed: this.fullConfig.randomSeed!
      });

      const loadTime = Date.now() - startTime;
      this.modelStatus = {
        state: 3, // 로딩 완료
        modelSize: modelData.byteLength,
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
  async downloadAndCacheModel(token: string): Promise<boolean> {
    console.log('📥 [ai-controller] Downloading model from Hugging Face with API token...');
    this.modelStatus = { state: 2 }; // 로딩 중
    try {
      const response = await fetch(this.fullConfig.modelPath!, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download model: ${response.status} ${response.statusText}`);
      }
      const modelBuffer = await response.arrayBuffer();
      console.log(`✅ [ai-controller] Model downloaded successfully (${(modelBuffer.byteLength / 1024 / 1024).toFixed(2)}MB)`);
  
      const db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(MODEL_STORE_NAME)) {
            db.createObjectStore(MODEL_STORE_NAME);
            console.log('✅ [idb] Object store created during download.');
          }
        },
      });
      await db.put(MODEL_STORE_NAME, modelBuffer, MODEL_KEY);
      console.log('💾 [ai-controller] Model saved to IndexedDB.');
      
      return this.initialize();
  
    } catch (error: any) {
      console.error('❌ [ai-controller] Failed to download or cache model:', error);
      this.modelStatus = { state: 1, error: error.message };
      return false;
    }
  }
  
  /**
   * 캐시된 모델 삭제
   */
  async deleteCachedModel(): Promise<void> {
    const db = await openDB(DB_NAME, DB_VERSION);
    await db.delete(MODEL_STORE_NAME, MODEL_KEY);
    if (this.llm) this.llm = null;
    this.modelStatus = { state: 1 }; // 캐시 없음
    console.log('✅ [ai-controller] Cached model deleted.');
  }

  /**
   * IndexedDB에서 모델 존재 여부만 체크 (로딩하지 않음)
   */
  async checkModelExists(): Promise<boolean> {
    try {
      const db = await openDB(DB_NAME, DB_VERSION);
      const modelTaskFile = await db.get(MODEL_STORE_NAME, MODEL_KEY) as ArrayBuffer;
      const exists = modelTaskFile && typeof modelTaskFile.byteLength !== 'undefined' && modelTaskFile.byteLength > 0;
      console.log(`🔍 [ai-controller] Model exists in IndexedDB: ${exists}`);
      return exists;
    } catch (error) {
      console.error('❌ [ai-controller] Failed to check model existence:', error);
      return false;
    }
  }

  /**
   * 모델 상태 확인 (IndexedDB 존재 여부 반영)
   */
  async getModelStatus(): Promise<AIModelStatus> {
    if (this.modelStatus.state === 1) {
      const modelExists = await this.checkModelExists();
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
   * 음성 명령 의도 분석 (실제 AI 추론)
   */
  async analyzeIntent(voiceInput: string): Promise<AIAnalysisResult> {
    console.log('🎯 [ai-controller] Analyzing voice intent with Gemma 3 1B:', voiceInput);

    if (this.modelStatus.state !== 3 || !this.llm) {
      console.log('⚠️ [ai-controller] Model not loaded, using fallback analysis');
      throw new Error('AI model is not initialized.');
    }

    try {
      const prompt = this.buildAnalysisPrompt(voiceInput);
      const response = await this.llm.generateResponse(prompt);
      return this.parseAIResponse(response, voiceInput);

    } catch (error: any) {
      console.error('❌ [ai-controller] AI analysis failed:', error);
      throw error;
    }
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
}

let aiControllerInstance: AIController | null = null;

export function getAIController(): AIController {
  if (!aiControllerInstance) {
    aiControllerInstance = new AIController();
  }
  return aiControllerInstance;
}