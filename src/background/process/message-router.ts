// 메시지 라우팅 시스템 - 각 메시지를 적절한 핸들러로 전달

import { BackgroundMessage, MessageHandler } from '../types/background-types';
import { handleAIMessage, handleGetAvailableModels, handleGetAllModelsStatus, handleGetDownloadProgress, handleSwitchModel, handleMultiModelDownload, handleMultiModelDelete, handleCancelDownload } from './ai-message-handler';

import { handleHighlightMessage } from './highlight-message-handler';
import { handleCrawlComplete, handleAddNewItems } from './crawl-message-handler';
import { handleMarkdownMessage } from './markdown-message-handler';
import { handleCommandFromUI } from './command-orchestrator';

/**
 * 메시지 라우터 클래스 - 효율적인 라우팅을 위한 Map 사용
 */
export class MessageRouter {
  private handlers = new Map<string, MessageHandler>();

  constructor() {
    this.initializeHandlers();
  }

  /**
   * 핸들러 맵 초기화
   */
  private initializeHandlers(): void {
    // AI 관련 메시지들 (기존)
    const aiActions = [
      'getAIModelStatus',
      'initializeAI',
      'loadAIModel',
      'testAIAnalysis',
      'learnFromFailedTests',
      'getLearnedStats',
      'clearLearnedExamples',
      'createSnapshot',
      'getSnapshots',
      'rollbackSnapshot',
      'deleteSnapshot'
    ];
    aiActions.forEach(action => {
      this.handlers.set(action, handleAIMessage);
    });

    // 다중 모델 지원 메시지들 (새로운 핸들러)
    this.handlers.set('getAvailableModels', () => handleGetAvailableModels());
    this.handlers.set('getAllModelsStatus', () => handleGetAllModelsStatus());
    this.handlers.set('getDownloadProgress', () => handleGetDownloadProgress());
    this.handlers.set('switchAIModel', (msg) => handleSwitchModel(msg.modelId, msg.token));
    this.handlers.set('cancelDownload', () => handleCancelDownload());
    this.handlers.set('downloadAIModel', (msg) => {
      // 다중 모델 지원인지 확인
      if (msg.modelId) {
        return handleMultiModelDownload(msg.modelId, msg.token);
      } else {
        // 기존 방식: Offscreen으로 전달
        return handleAIMessage(msg);
      }
    });
    this.handlers.set('deleteAIModel', (msg) => {
      // 다중 모델 지원인지 확인
      if (msg.modelId) {
        return handleMultiModelDelete(msg.modelId);
      } else {
        // 기존 방식: Offscreen으로 전달
        return handleAIMessage(msg);
      }
    });

    
    
    // 음성 명령 (신규 아키텍처)
    this.handlers.set('executeVoiceCommand', handleCommandFromUI);

    // 하이라이트 관련
    this.handlers.set('highlightElement', handleHighlightMessage);
    this.handlers.set('setActiveElement', handleHighlightMessage);
    
    // 크롤링 관련
    this.handlers.set('crawlComplete', handleCrawlComplete);
    this.handlers.set('addNewItems', handleAddNewItems);

    // 마크다운 관련
    const markdownActions = [
      'GET_PAGE_CONTENT',
      'PROCESS_HTML_TO_MARKDOWN',
      'DOWNLOAD_MARKDOWN'
    ];
    markdownActions.forEach(action => {
      this.handlers.set(action, handleMarkdownMessage);
    });

    // 탭 관리는 기존 Background 시스템이 완벽하게 처리하므로 제거
  }

  /**
   * 메시지를 적절한 핸들러로 라우팅
   */
  async route(
    request: BackgroundMessage, 
    sender: chrome.runtime.MessageSender
  ): Promise<any> {
    const handler = this.handlers.get(request.action);
    
    if (handler) {
        return await handler(request, sender);
    }
    
    console.warn(`⚠️ [router] No handler for action: ${request.action}`);
    return { error: `Unknown action: ${request.action}` };
  }

  /**
   * 핸들러 등록 (확장성을 위한 동적 등록)
   */
  registerHandler(action: string, handler: MessageHandler): void {
    this.handlers.set(action, handler);
    console.log(`➕ [router] Handler registered for action: ${action}`);
  }

  /**
   * 핸들러 제거
   */
  unregisterHandler(action: string): boolean {
    const removed = this.handlers.delete(action);
    if (removed) {
      console.log(`➖ [router] Handler unregistered for action: ${action}`);
    }
    return removed;
  }

  // 탭 ID 핸들러 제거 - Background가 이미 탭별로 관리함

  /**
   * 등록된 액션 목록 조회 (디버깅용)
   */
  getRegisteredActions(): string[] {
    return Array.from(this.handlers.keys());
  }
}

// 싱글톤 라우터 인스턴스
export const messageRouter = new MessageRouter();