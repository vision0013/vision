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
      maxTokens: 2048,
      // ✨ [수정] 온도 값을 낮춰 분류 정확도 향상
      temperature: 0.2,
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
   * ✨ [수정] 우선순위 규칙을 명시하여 분류 정확도 향상
   */
  private buildAnalysisPrompt(voiceInput: string): string {
    return `<start_of_turn>user
You are an expert Korean voice command classifier. 
Your task is to classify the user's intent into EXACTLY ONE of the following categories:
["price_comparison", "purchase_flow", "simple_find", "navigation", "product_search"]

Respond ONLY with a clean JSON object in the format:
{"action": "category", "product": "...", "target": "...", "reasoning": "short explanation"}

---

**Priority Rules (apply in this strict order):**

1. **price_comparison** → Use ONLY if the command asks about cost: "가격", "최저가", "얼마", "할인", "싼 곳".

2. **purchase_flow** → If the command involves buying/ordering/paying ("구매", "주문", "결제", "장바구니").  
   → EVEN IF the command also includes "버튼", "클릭", or "눌러", ALWAYS classify as purchase_flow.  
   → Example: "주문하기 클릭해줘" → {"action": "purchase_flow", "target": "주문하기"}

3. **simple_find** → For finding or clicking UI elements ("버튼", "링크", "메뉴", "아이콘", "검색창").  
   → IMPORTANT: Even if a link usually leads to navigation, classify it as simple_find if the user says "클릭" or "눌러".  
   → Example: "회원가입 링크 클릭" → {"action": "simple_find", "target": "회원가입 링크"}

4. **navigation** → Page navigation ONLY ("뒤로", "앞으로", "홈으로").  
   → Do NOT use navigation just because of a link. Navigation must be explicitly requested.

5. **product_search** → If the user wants to see/find/search a product ("노트북 보여줘", "에어팟 검색").  
   → If the word "검색창" is used, classify as simple_find instead.

---

**Examples:**
- "아이폰 15 찾아줘" → {"action": "product_search", "product": "아이폰 15", "reasoning": "User asked to search for a product"}
- "최저가 알려줘" → {"action": "price_comparison", "reasoning": "User asked about price"}
- "로그인 버튼 클릭해줘" → {"action": "simple_find", "target": "로그인 버튼", "reasoning": "Clicking a UI element"}
- "회원가입 링크 클릭" → {"action": "simple_find", "target": "회원가입 링크", "reasoning": "Clicking a link is treated as UI element"}
- "장바구니에 담아줘" → {"action": "purchase_flow", "target": "장바구니", "reasoning": "User requested to add item to cart"}
- "결제하기 눌러줘" → {"action": "purchase_flow", "target": "결제", "reasoning": "User wants to proceed with payment"}
- "주문하기 클릭해줘" → {"action": "purchase_flow", "target": "주문하기", "reasoning": "Order-related action takes precedence over button click"}
- "검색창 찾아줘" → {"action": "simple_find", "target": "검색창", "reasoning": "User wants to find the search bar"}
- "노트북 보여줘" → {"action": "product_search", "product": "노트북", "reasoning": "User wants to see a product"}

---

Now classify the following:
Command: "${voiceInput}"
Response:
<end_of_turn>
<start_of_turn>model`;
  }



  /**
   * ✨ [수정] 안정적인 파싱 로직 유지
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
          confidence: 0.8
        };
        return { intent, reasoning: 'Fallback analysis (No JSON found)' };
      }
      
      const jsonString = response.substring(firstBrace, lastBrace + 1);
      
      const parsedResponse = JSON.parse(jsonString);
      
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
