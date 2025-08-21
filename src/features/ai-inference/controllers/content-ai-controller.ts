// Content Script용 AI Controller - DOM 환경에서 MediaPipe 실행

import { VoiceIntent, AIAnalysisResult, AIModelConfig, AIModelStatus } from '../types/ai-types';

export class ContentAIController {
  private llm: any | null = null; // LlmInference 타입 - 동적 import를 위해 any로 변경
  private modelStatus: AIModelStatus = {
    state: 1 // 캐시없음/로딩안됨
  };

  private readonly config: AIModelConfig = {
    modelPath: "https://huggingface.co/litert-community/Gemma3-1B-IT/resolve/main/gemma3-1b-it-int4.task?download=true",
    maxTokens: 256,
    temperature: 0.7,
    topK: 40,
    randomSeed: 42
  };

  /**
   * Content Script에서 MediaPipe LLM 초기화 (동적 import 사용)
   */
  async initialize(): Promise<boolean> {
    if (this.modelStatus.state === 3) {
      console.log('🤖 [content-ai] Model already loaded');
      return true;
    }

    if (this.modelStatus.state === 2) {
      console.log('🔄 [content-ai] Model is already loading...');
      return false;
    }

    try {
      this.modelStatus.state = 2; // 로딩 중
      const startTime = Date.now();
      console.log('🚀 [content-ai] Starting AI model initialization in Content Script...');
      console.log('📦 [content-ai] Model path:', this.config.modelPath);

      // 1. MediaPipe 동적 import
      console.log('🔄 [content-ai] Loading MediaPipe library...');
      const { LlmInference, FilesetResolver } = await import('@mediapipe/tasks-genai');
      console.log('✅ [content-ai] MediaPipe library loaded');

      // 2. MediaPipe WASM 파일셋 로드
      console.log('🔄 [content-ai] Loading MediaPipe WASM files...');
      const genaiFileset = await FilesetResolver.forGenAiTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@latest/wasm"
      );
      console.log('✅ [content-ai] WASM files loaded');
      
      // 3. Gemma-3 1B 모델 로드 (자동 다운로드)
      console.log('🔄 [content-ai] Loading Gemma-3 1B model (529MB)...');
      console.log('💡 [content-ai] This may take 30-60 seconds on first load');
      
      this.llm = await LlmInference.createFromOptions(genaiFileset, {
        baseOptions: { 
          modelAssetPath: this.config.modelPath
        },
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
        topK: this.config.topK,
        randomSeed: this.config.randomSeed
      });

      const loadTime = Date.now() - startTime;
      this.modelStatus = {
        state: 3, // 로딩 완료
        modelSize: 529 * 1024 * 1024, // 529MB
        loadTime: loadTime
      };

      console.log(`✅ [content-ai] Gemma-3 1B model loaded successfully in ${loadTime}ms`);
      console.log('🎯 [content-ai] Ready for AI-powered voice command analysis');
      return true;

    } catch (error: any) {
      const loadTime = Date.now();
      this.modelStatus = {
        state: 1, // 캐시없음/실패
        error: error.message,
        loadTime: loadTime
      };
      
      console.error('❌ [content-ai] Failed to initialize AI model:', error);
      console.log('🔄 [content-ai] Will fallback to oktjs analysis');
      return false;
    }
  }

  /**
   * 음성 명령 의도 분석
   */
  async analyzeIntent(voiceInput: string): Promise<AIAnalysisResult> {
    console.log('🎯 [content-ai] Analyzing voice intent with Gemma-3 1B:', voiceInput);

    if (this.modelStatus.state !== 3 || !this.llm) {
      console.log('⚠️ [content-ai] Model not loaded');
      throw new Error('AI model not loaded');
    }

    try {
      const prompt = this.buildAnalysisPrompt(voiceInput);
      console.log('📝 [content-ai] Sending prompt to Gemma-3 1B...');
      
      const response = await this.llm.generateResponse(prompt);
      console.log('🤖 [content-ai] AI response received:', response);
      
      return this.parseAIResponse(response, voiceInput);

    } catch (error: any) {
      console.error('❌ [content-ai] AI analysis failed:', error);
      throw error;
    }
  }

  private buildAnalysisPrompt(voiceInput: string): string {
    return `당신은 웹 브라우저 음성 명령 분석 전문가입니다. 사용자의 음성 명령을 분석하여 의도를 파악해주세요.

사용자 명령: "${voiceInput}"

다음 카테고리 중 하나로 분류해주세요:
1. price_comparison: 가격 비교 (예: "최저가", "가격 비교", "더 싼 거", "할인")
2. product_search: 상품 검색 (예: "찾아줘", "검색해줘", "보여줘")
3. simple_find: 페이지 내 요소 찾기 (예: "버튼", "링크", "메뉴", "클릭")
4. purchase_flow: 구매 관련 (예: "구매", "결제", "장바구니", "주문")
5. navigation: 페이지 이동 (예: "이전", "다음", "홈", "뒤로")

JSON 형식으로만 응답해주세요:
{
  "action": "카테고리",
  "product": "상품명 (있다면)",
  "target": "대상 요소 (있다면)",
  "detail": "구체적 요청사항",
  "confidence": 0.9,
  "reasoning": "판단 근거"
}`;
  }

  private parseAIResponse(response: string, _originalInput: string): AIAnalysisResult {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      
      const parsedResponse = JSON.parse(jsonMatch[0]);
      
      const intent: VoiceIntent = {
        action: this.normalizeAction(parsedResponse.action),
        product: parsedResponse.product,
        target: parsedResponse.target,
        detail: parsedResponse.detail,
        confidence: parsedResponse.confidence || 0.8
      };
      
      return {
        intent,
        reasoning: parsedResponse.reasoning || 'AI 분석 완료',
        suggestions: []
      };
      
    } catch (error: any) {
      console.error('❌ [content-ai] Failed to parse AI response:', error);
      throw error;
    }
  }

  private normalizeAction(aiAction: string): VoiceIntent['action'] {
    const action = aiAction?.toLowerCase() || '';
    
    if (['price_comparison', 'price_compare'].includes(action)) return 'price_comparison';
    if (['product_search', 'search'].includes(action)) return 'product_search';
    if (['simple_find', 'find', 'click'].includes(action)) return 'simple_find';
    if (['purchase_flow', 'purchase', 'buy'].includes(action)) return 'purchase_flow';
    if (['navigation', 'navigate', 'move'].includes(action)) return 'navigation';
    
    return 'unknown';
  }

  getModelStatus(): AIModelStatus {
    return { ...this.modelStatus };
  }

  async dispose(): Promise<void> {
    if (this.llm) {
      this.llm = null;
    }
    
    this.modelStatus = {
      state: 1 // 캐시없음
    };
    
    console.log('🗑️ [content-ai] AI model disposed');
  }
}

// Content Script용 싱글톤
let contentAIController: ContentAIController | null = null;

export function getContentAIController(): ContentAIController {
  if (!contentAIController) {
    contentAIController = new ContentAIController();
  }
  return contentAIController;
}