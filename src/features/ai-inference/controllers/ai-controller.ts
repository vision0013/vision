// AI 추론 컨트롤러 - Gemma 3 1B 모델 (API 토큰 다운로드 방식)

import { LlmInference, FilesetResolver } from '@mediapipe/tasks-genai';
import { openDB } from 'idb';
import { VoiceIntent, AIAnalysisResult, AIModelConfig, AIModelStatus } from '../types/ai-types';

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

  constructor(config: AIModelConfig = {}) {
    this.fullConfig = {
      // Hugging Face의 Gated Model 경로
      modelPath: "https://huggingface.co/litert-community/Gemma3-1B-IT/resolve/main/gemma3-1b-it-int4.task?download=true",
      maxTokens: 2048, // ✨ [최적화] MediaPipe의 권장 사항에 따라 2048로 상향 조정
      temperature: 0.7,
      topK: 40,
      randomSeed: 42,
      ...config
    };
    console.log('🤖 [ai-controller] Config initialized for API token download.');
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

      // --- ✨ [핵심 수정] ---
      // .task 파일(ArrayBuffer) 전체를 MediaPipe가 기대하는 Uint8Array로 직접 변환합니다.
      const modelData = new Uint8Array(modelTaskFile);
      console.log(`- Loaded .task bundle directly. Size: ${modelData.byteLength} bytes.`);
      // --- ✨ [수정 끝] ---

      const wasmPath = chrome.runtime.getURL("wasm_files/");
      const genaiFileset = await FilesetResolver.forGenAiTasks(wasmPath);
      
      this.llm = await LlmInference.createFromOptions(genaiFileset, {
        baseOptions: { modelAssetBuffer: modelData }, // .task 번들 전체를 전달합니다.
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
    // 메모리에 로드되지 않고 로딩중도 아닌 경우, IndexedDB 존재 여부 체크
    if (this.modelStatus.state === 1) {
      const modelExists = await this.checkModelExists();
      if (modelExists) {
        // IndexedDB에 모델이 존재하면 상태 4(캐시있음)로 업데이트
        this.modelStatus = {
          ...this.modelStatus,
          state: 4 // 캐시있음(로드안됨)
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
      return this.parseAIResponse(response);

    } catch (error: any) {
      console.error('❌ [ai-controller] AI analysis failed:', error);
      throw error;
    }
  }

  private buildAnalysisPrompt(voiceInput: string): string {
    return `Analyze this Korean voice command: "${voiceInput}"

Classify into one category:
- price_comparison: price comparison requests ("최저가", "가격 비교")
- product_search: product search ("찾아줘", "검색해줘")  
- simple_find: find page elements ("버튼", "클릭해줘")
- purchase_flow: purchase actions ("구매", "결제")
- navigation: page navigation ("이전", "뒤로")

Respond ONLY with valid JSON:
{"action": "category_name", "confidence": 0.9}`;
  }

  private parseAIResponse(response: string): AIAnalysisResult {
    try {
      console.log('🔍 [ai-controller] Raw AI response:', response);
      
      const jsonMatch = response.match(/\{[\s\S]*?\}/);
      if (!jsonMatch) {
        console.warn('⚠️ [ai-controller] No JSON found, creating fallback response');
        // AI가 JSON을 안 만들면 텍스트 기반 추측
        const fallbackAction = this.guessActionFromText(response);
        const intent: VoiceIntent = {
          action: fallbackAction,
          confidence: 0.5
        };
        return { intent, reasoning: 'Fallback analysis (non-JSON response)' };
      }
      
      const parsedResponse = JSON.parse(jsonMatch[0]);
      const intent: VoiceIntent = {
        action: parsedResponse.action || 'unknown',
        product: parsedResponse.product,
        target: parsedResponse.target,
        detail: parsedResponse.detail,
        confidence: parsedResponse.confidence || 0.8
      };
      return {
        intent,
        reasoning: parsedResponse.reasoning || 'AI analysis complete',
      };
    } catch (error: any) {
      console.error('❌ [ai-controller] Failed to parse AI response:', error);
      console.error('❌ [ai-controller] Response was:', response);
      throw new Error('Failed to parse AI response.');
    }
  }

  private guessActionFromText(text: string): VoiceIntent['action'] {
    const lower = text.toLowerCase();
    if (lower.includes('price') || lower.includes('최저가') || lower.includes('가격')) return 'price_comparison';
    if (lower.includes('search') || lower.includes('찾아') || lower.includes('검색')) return 'product_search';
    if (lower.includes('click') || lower.includes('클릭') || lower.includes('버튼')) return 'simple_find';
    if (lower.includes('buy') || lower.includes('구매') || lower.includes('결제')) return 'purchase_flow';
    if (lower.includes('navigate') || lower.includes('이전') || lower.includes('뒤로')) return 'navigation';
    return 'unknown';
  }
}

// 싱글톤 인스턴스
let aiControllerInstance: AIController | null = null;

export function getAIController(): AIController {
  if (!aiControllerInstance) {
    aiControllerInstance = new AIController();
  }
  return aiControllerInstance;
}