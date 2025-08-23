// AI 관련 메시지 처리 핸들러 (Offscreen 중계)

import { AIMessageRequest } from '../types/background-types';
import { offscreenManager } from '../controllers/managers/offscreen-manager';

// 요청 ID용 카운터 (타임스탬프와 결합하여 고유성 보장)
let requestCounter = 0;

/**
 * AI 관련 메시지를 Offscreen으로 중계하는 핸들러
 * 기존 background-old.ts의 검증된 비동기 처리 방식 적용
 */
export async function handleAIMessage(
  request: AIMessageRequest
): Promise<any> {
  // 중복 디버깅: 요청 전체 로그
  console.log(`🔄 [ai-handler] Processing AI request: ${request.action}`);
  console.log(`🔍 [ai-handler] Full request:`, request);
  console.log(`📍 [ai-handler] Request source: ${request.source || 'unknown'}, timestamp: ${request.timestamp || 'none'}`);
  
  try {
    // 1. Offscreen Document 준비
    if (!offscreenManager.isReady()) {
      await offscreenManager.ensureReady();
      
      // Offscreen 준비 완료 대기
      await new Promise<void>(resolve => {
        const listener = (msg: any) => {
          if (msg.action === 'offscreenReady') {
            chrome.runtime.onMessage.removeListener(listener);
            resolve();
          }
        };
        chrome.runtime.onMessage.addListener(listener);
      });
    }

    // 2. Offscreen 준비 상태 확인 및 대기 (추가 안전장치)
    await offscreenManager.ensureReady();
    
    // 3. 액션명 변환 (Background → Offscreen)  
    const forwardAction = mapBackgroundActionToOffscreen(request.action);
    
    // 4. 타임스탬프 + 카운터 기반 요청 ID 생성
    const requestId = `${Date.now()}_${++requestCounter}`;
    
    // 5. Offscreen으로 메시지 전달 (ID 포함)
    const messageToSend = { 
      action: forwardAction, 
      requestId: requestId,
      token: request.token,
      command: request.command,
      failedTests: request.failedTests,
      snapshotId: request.snapshotId,
      description: request.description
    };
    // 중복 디버깅: 전송 메시지 로그
    console.log(`📤 [ai-handler] Sending to Offscreen:`, messageToSend);
    chrome.runtime.sendMessage(messageToSend);
    
    // 6. 응답 대기 (ID 기반 매칭 + 타임아웃 취소)
    const expectedResponse = mapBackgroundActionToResponse(request.action);
    
    const response = await new Promise((resolve) => {
      let timeoutId: NodeJS.Timeout;
      
      const listener = (msg: any) => {
        // ID가 일치하는 응답만 처리
        if (msg.action === expectedResponse && msg.requestId === requestId) {
          chrome.runtime.onMessage.removeListener(listener);
          clearTimeout(timeoutId); // 타임아웃 취소
          resolve(msg);
        }
      };
      chrome.runtime.onMessage.addListener(listener);
      
      // 다운로드는 12분, 기타 작업은 30초 타임아웃
      const timeoutDuration = request.action === 'downloadAIModel' ? 12 * 60 * 1000 : 30000;
      timeoutId = setTimeout(() => {
        chrome.runtime.onMessage.removeListener(listener);
        resolve({ error: 'AI operation timeout' });
      }, timeoutDuration);
    });
    
    return response;
    
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Background 액션명을 Offscreen 액션명으로 변환
 */
function mapBackgroundActionToOffscreen(action: string): string {
  const actionMap: Record<string, string> = {
    'downloadAIModel': 'downloadModel',
    'initializeAI': 'initializeAI',
    'loadAIModel': 'initializeAI', // Load Model도 같은 Offscreen 액션 사용
    'getAIModelStatus': 'getModelStatus',
    'testAIAnalysis': 'analyzeIntent',
    'deleteAIModel': 'deleteModel',
    'learnFromFailedTests': 'learnFromFailedTests', // 새로운 학습 기능
    'getLearnedStats': 'getLearnedStats', // 학습 현황 조회
    'clearLearnedExamples': 'clearLearnedExamples', // 학습 데이터 초기화
    'createSnapshot': 'createSnapshot', // 스냅샷 생성
    'getSnapshots': 'getSnapshots', // 스냅샷 목록
    'rollbackSnapshot': 'rollbackSnapshot', // 스냅샷 복원
    'deleteSnapshot': 'deleteSnapshot' // 스냅샷 삭제
  };
  
  return actionMap[action] || action;
}

/**
 * Background 액션명을 기대하는 응답 액션명으로 변환
 */
function mapBackgroundActionToResponse(action: string): string {
  const responseMap: Record<string, string> = {
    'downloadAIModel': 'modelLoaded',
    'deleteAIModel': 'modelDeleted',
    'initializeAI': 'aiInitialized',
    'loadAIModel': 'aiInitialized', // Load Model도 같은 응답 기대
    'testAIAnalysis': 'analysisResult',
    'getAIModelStatus': 'modelStatusResponse',
    'learnFromFailedTests': 'learningCompleted', // 학습 완료 응답
    'getLearnedStats': 'statsResponse', // 학습 현황 응답
    'clearLearnedExamples': 'clearCompleted', // 초기화 완료 응답
    'createSnapshot': 'snapshotCreated', // 스냅샷 생성 완료
    'getSnapshots': 'snapshotsResponse', // 스냅샷 목록 응답
    'rollbackSnapshot': 'rollbackCompleted', // 롤백 완료 응답
    'deleteSnapshot': 'snapshotDeleted' // 스냅샷 삭제 완료
  };
  
  return responseMap[action] || 'modelStatusResponse';
}