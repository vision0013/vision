// Background 전용 타입 정의 (기존 타입 최대한 재사용)

import { AIAnalysisResult } from '../../features/ai-inference/types/ai-types';

// Background 고유 상태 관리 타입들
export interface TabState {
  lastUrl?: string;
  debounceTimeout?: NodeJS.Timeout;
  activeElement?: ActiveElementState;
}

export interface ActiveElementState {
  ownerId: number | null;
  timestamp: number;
}

// Background 메시지 처리 타입들
export interface BackgroundMessage {
  action: string;
  tabId?: number;
  [key: string]: any;
}

export interface VoiceCommandRequest extends BackgroundMessage {
  action: 'executeVoiceCommand';
  command: string;
  preprocessedCommand?: string;
  aiAnalysisResult?: AIAnalysisResult;
  oktjsResult?: any;
  tabId: number;
}

export interface AIMessageRequest extends BackgroundMessage {
  action: 'getAIModelStatus' | 'deleteAIModel' | 'downloadAIModel' | 'initializeAI' | 'loadAIModel' | 'testAIAnalysis';
  token?: string;
  command?: string;
}

export interface HighlightRequest extends BackgroundMessage {
  action: 'highlightElement' | 'setActiveElement';
  ownerId: number | null;
  tabId?: number;
}

// AI 의도 → Content Script 액션 매핑 타입
export interface ActionPayload {
  detectedAction: 'click' | 'find' | 'scroll' | 'input' | 'navigation';
  targetText: string;
  direction?: 'up' | 'down' | null;
  originalCommand: string;
  confidence?: number;
}

// 함수 시그니처들 (실용적 타이핑)
export type ActionMapper = (
  aiResult?: AIAnalysisResult,
  oktjsResult?: any,
  command?: string
) => ActionPayload;

export type MessageHandler = (
  request: any, // 각 핸들러가 자신의 타입으로 캐스팅
  sender: chrome.runtime.MessageSender
) => Promise<any>;