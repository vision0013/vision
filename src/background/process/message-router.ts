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
      'loadAIModel'
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

    // 채팅 메시지
    this.handlers.set('sendChatMessage', this.handleChatMessage.bind(this));

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

    // 🔇 응답 메시지들은 Offscreen → Panel 직접 통신이므로 경고 무시
    if (request.action.endsWith('Response') || request.action.endsWith('response')) {
      return { ignored: true, reason: 'Response message - handled by target component' };
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
   * 채팅 메시지 처리 - 기존 AI 시스템 활용
   */
  private async handleChatMessage(
    request: BackgroundMessage,
    _sender: chrome.runtime.MessageSender
  ): Promise<any> {
    try {
      console.log('💬 [router] Processing chat message:', request.message);

      // 기존 AI 시스템 사용, 단지 mode를 'chat'으로 설정
      const response = await handleAIMessage({
        action: 'getAIPlan',
        command: request.message,
        crawledItems: [], // 채팅에서는 빈 배열
        mode: 'chat'
      });

      if (response.error) {
        console.error('❌ [router] Chat message handling failed:', response.error);
        return {
          success: false,
          error: response.error
        };
      }

      // 채팅 모드에서는 rawResponse를 사용
      const reply = response.result?.rawResponse || response.result?.reasoning || '응답을 생성할 수 없습니다.';
      console.log('✅ [router] Chat response generated:', reply);

      return {
        success: true,
        reply: reply
      };
    } catch (error: any) {
      console.error('❌ [router] Chat message handling failed:', error);
      return {
        success: false,
        error: error.message || '채팅 처리 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 등록된 액션 목록 조회 (디버깅용)
   */
  getRegisteredActions(): string[] {
    return Array.from(this.handlers.keys());
  }
}

// 싱글톤 라우터 인스턴스
export const messageRouter = new MessageRouter();