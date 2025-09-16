// src/features/ai-inference/controllers/inference-engine.ts

import { LlmInference } from '@mediapipe/tasks-genai';
import { CrawledItem, Mode } from '../../../types';
import { AIAnalysisResult } from '../types/ai-types';
import { getPromptTemplate, AI_PROMPTS, getBaseExamples } from '../config/ai-prompts';
import { AIResponseParser } from '../process/ai-response-parser';
import { LearningDataManager } from '../process/learning-data-manager';
import type { AIController } from './ai-controller';

/**
 * AI 추론 실행 및 프롬프트 구성을 담당하는 클래스
 */
export class InferenceEngine {
  private isAnalyzing = false;
  private analysisQueue: Array<{ 
    voiceInput: string;
    crawledItems: CrawledItem[];
    mode: Mode; // ✨ [신규] 큐에 mode 추가
    resolve: (result: AIAnalysisResult) => void;
    reject: (error: Error) => void;
  }> = [];

  private currentPromptName: keyof typeof AI_PROMPTS = 'AGENT_PLANNER';

  constructor(
    private llm: LlmInference | null,
    private aiController: AIController
  ) {}

  public setLlm(llm: LlmInference | null) {
    this.llm = llm;
  }

  // ✨ [수정] mode를 인자로 받도록 변경
  async analyzeIntent(voiceInput: string, crawledItems: CrawledItem[], mode: Mode): Promise<AIAnalysisResult> {
    return new Promise((resolve, reject) => {
      this.analysisQueue.push({ voiceInput, crawledItems, mode, resolve, reject });
      this.processAnalysisQueue();
    });
  }

  private async processAnalysisQueue(): Promise<void> {
    if (!this.aiController.isReadyForInference() || this.isAnalyzing || this.analysisQueue.length === 0) {
      return;
    }

    this.isAnalyzing = true;
    // ✨ [수정] 큐에서 mode 꺼내기
    const { voiceInput, crawledItems, mode, resolve, reject } = this.analysisQueue.shift()!;

    try {
      // ✨ [수정] buildAnalysisPrompt에 mode 전달
      const prompt = await this.buildAnalysisPrompt(voiceInput, crawledItems, mode);
      const response = await this.llm!.generateResponse(prompt);
      const result = AIResponseParser.parseAIResponse(response, voiceInput);
      resolve(result);
    } catch (error: any) {
      console.error('❌ [inference-engine] AI analysis failed:', error);
      reject(error);
    } finally {
      this.isAnalyzing = false;
      this.processAnalysisQueue();
    }
  }

  // ✨ [수정] buildAnalysisPrompt 시그니처 변경
  private async buildAnalysisPrompt(voiceInput: string, crawledItems: CrawledItem[], mode: Mode): Promise<string> {
    const promptTemplate = getPromptTemplate(this.currentPromptName);
    const baseExamples = getBaseExamples();
    const learnedExamples = await LearningDataManager.getLearnedExamples();
    const allExamples = [...learnedExamples, ...baseExamples];
    // ✨ [수정] template 함수에 mode 전달
    return promptTemplate.template(voiceInput, allExamples, crawledItems, mode);
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
