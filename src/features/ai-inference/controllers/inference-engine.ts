// src/features/ai-inference/controllers/inference-engine.ts

import { LlmInference } from '@mediapipe/tasks-genai';
import { CrawledItem } from '../../../types';
import { AIAnalysisResult } from '../types/ai-types';
import { getPromptTemplate, AI_PROMPTS, getBaseExamples } from '../config/ai-prompts';
import { AIResponseParser } from '../process/ai-response-parser';
import { LearningDataManager } from '../process/learning-data-manager';
import type { AIController } from './ai-controller'; // ✨ [신규] 타입 임포트

/**
 * AI 추론 실행 및 프롬프트 구성을 담당하는 클래스
 */
export class InferenceEngine {
  private isAnalyzing = false;
  private analysisQueue: Array<{ 
    voiceInput: string;
    crawledItems: CrawledItem[];
    resolve: (result: AIAnalysisResult) => void;
    reject: (error: Error) => void;
  }> = [];

  private currentPromptName: keyof typeof AI_PROMPTS = 'AGENT_PLANNER';

  // ✨ [수정] 생성자에서 AIController 인스턴스를 받음
  constructor(
    private llm: LlmInference | null,
    private aiController: AIController
  ) {}

  public setLlm(llm: LlmInference | null) {
    this.llm = llm;
  }

  async analyzeIntent(voiceInput: string, crawledItems: CrawledItem[]): Promise<AIAnalysisResult> {
    return new Promise((resolve, reject) => {
      this.analysisQueue.push({ voiceInput, crawledItems, resolve, reject });
      this.processAnalysisQueue();
    });
  }

  private async processAnalysisQueue(): Promise<void> {
    // ✨ [수정] AI 컨트롤러가 준비되었는지, 그리고 이미 분석 중인지 확인
    if (!this.aiController.isReadyForInference() || this.isAnalyzing || this.analysisQueue.length === 0) {
      return;
    }

    this.isAnalyzing = true;
    const { voiceInput, crawledItems, resolve, reject } = this.analysisQueue.shift()!;

    try {
      const prompt = await this.buildAnalysisPrompt(voiceInput, crawledItems);
      const response = await this.llm!.generateResponse(prompt); // llm이 null이 아님을 보장 (isReadyForInference 통과)
      const result = AIResponseParser.parseAIResponse(response, voiceInput);
      resolve(result);
    } catch (error: any) {
      console.error('❌ [inference-engine] AI analysis failed:', error);
      reject(error);
    } finally {
      this.isAnalyzing = false;
      // 다음 아이템 처리를 위해 재귀 호출
      this.processAnalysisQueue();
    }
  }

  private async buildAnalysisPrompt(voiceInput: string, crawledItems: CrawledItem[]): Promise<string> {
    const promptTemplate = getPromptTemplate(this.currentPromptName);
    const baseExamples = getBaseExamples();
    const learnedExamples = await LearningDataManager.getLearnedExamples();
    const allExamples = [...learnedExamples, ...baseExamples];
    return promptTemplate.template(voiceInput, allExamples, crawledItems);
  }

  public setPromptTemplate(promptName: keyof typeof AI_PROMPTS): void {
    this.currentPromptName = promptName;
  }

  public getCurrentPrompt(): string {
    return AI_PROMPTS[this.currentPromptName].name;
  }

  public getAvailablePrompts(): Array<{ name: keyof typeof AI_PROMPTS, description: string }> {
    return Object.entries(AI_PROMPTS).map(([key, value]) => ({
      name: key as keyof typeof AI_PROMPTS,
      description: value.description
    }));
  }
}