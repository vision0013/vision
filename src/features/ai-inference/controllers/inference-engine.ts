// src/features/ai-inference/controllers/inference-engine.ts

import { LlmInference } from '@mediapipe/tasks-genai';
import { AIAnalysisResult } from '../types/ai-types';
import { getPromptTemplate, AI_PROMPTS, getBaseExamples } from '../config/ai-prompts';
import { AIResponseParser } from '../process/ai-response-parser';
import { LearningDataManager } from '../process/learning-data-manager';

/**
 * AI 추론 실행 및 프롬프트 구성을 담당하는 클래스
 */
export class InferenceEngine {
  private isAnalyzing = false;
  private analysisQueue: Array<{
    voiceInput: string;
    resolve: (result: AIAnalysisResult) => void;
    reject: (error: Error) => void;
  }> = [];

  private currentPromptName: keyof typeof AI_PROMPTS = 'EXAMPLE_DRIVEN_CLASSIFIER';

  constructor(private llm: LlmInference | null) {}

  public setLlm(llm: LlmInference | null) {
    this.llm = llm;
  }

  async analyzeIntent(voiceInput: string): Promise<AIAnalysisResult> {
    if (!this.llm) {
      throw new Error('AI model is not loaded.');
    }

    return new Promise((resolve, reject) => {
      this.analysisQueue.push({ voiceInput, resolve, reject });
      this.processAnalysisQueue();
    });
  }

  private async processAnalysisQueue(): Promise<void> {
    if (this.isAnalyzing || this.analysisQueue.length === 0 || !this.llm) {
      return;
    }

    this.isAnalyzing = true;
    const { voiceInput, resolve, reject } = this.analysisQueue.shift()!;

    try {
      const prompt = await this.buildAnalysisPrompt(voiceInput);
      const response = await this.llm.generateResponse(prompt);
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

  private async buildAnalysisPrompt(voiceInput: string): Promise<string> {
    const promptTemplate = getPromptTemplate(this.currentPromptName);
    const baseExamples = getBaseExamples();
    const learnedExamples = await LearningDataManager.getLearnedExamples();
    const allExamples = [...learnedExamples, ...baseExamples];
    return promptTemplate.template(voiceInput, allExamples);
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