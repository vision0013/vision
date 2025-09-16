import React, { useState, useEffect, useCallback } from 'react';
import { useSidePanelStore } from '../../side-panel-management/process/panel-store';
import { ModelSelector } from './model-selector';
import { DownloadProgressModal } from './download-progress-modal';
import { AvailableModels, ModelDownloadProgress } from '../types/ai-types';


interface AISettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AISettings: React.FC<AISettingsProps> = ({ isOpen, onClose }) => {
  // 디버깅: Panel 인스턴스 생성 추적
  console.log('🔍 [AISettings] Component instance created/rendered at:', Date.now());
  
  const { aiModelStatus, setAiModelStatus, clearAiError } = useSidePanelStore();

  // 다중 모델 지원 상태
  const [availableModels, setAvailableModels] = useState<AvailableModels>({});
  const [currentModelId, setCurrentModelId] = useState<string>('');
  const [downloadProgress, setDownloadProgress] = useState<ModelDownloadProgress | null>(null);
  const [modelStates, setModelStates] = useState<Record<string, { exists: boolean; size?: number }>>({});
  const [showModelSelector, setShowModelSelector] = useState(false);


  // 다중 모델 데이터 로드
  const loadModelData = useCallback(async () => {
    try {
      // 사용 가능한 모델 목록 요청
      const modelsResponse = await chrome.runtime.sendMessage({ action: 'getAvailableModels' });
      if (modelsResponse.success) {
        setAvailableModels(modelsResponse.models);
        setCurrentModelId(modelsResponse.currentModelId);
      }

      // 모델 상태 요청
      const statesResponse = await chrome.runtime.sendMessage({ action: 'getAllModelsStatus' });
      if (statesResponse.success) {
        setModelStates(statesResponse.states);
      }

      // AI 모델 로드 상태 요청 (추가)
      const statusResponse = await chrome.runtime.sendMessage({ action: 'getAIModelStatus' });
      if (statusResponse.success && statusResponse.status) {
        console.log('📊 [ai-settings] Initial AI model status:', statusResponse.status);
        setAiModelStatus(statusResponse.status);
      }

      // 다운로드 진행률 요청
      const progressResponse = await chrome.runtime.sendMessage({ action: 'getDownloadProgress' });
      if (progressResponse.success && progressResponse.progress) {
        setDownloadProgress(progressResponse.progress);
      }
    } catch (error) {
      console.error('❌ [ai-settings] Failed to load model data:', error);
    }
  }, [setAiModelStatus]);

  useEffect(() => {
    if (isOpen) {
      loadModelData();

      const messageListener = (message: any) => {
        console.log('🔄 [ai-settings] Received message:', message.action, JSON.stringify(message, null, 2));

        if (['modelStatusResponse', 'modelLoaded', 'modelDeleted', 'aiInitialized'].includes(message.action)) {
          console.log('📊 [ai-settings] Updating AI model status:', JSON.stringify(message.status, null, 2));
          setAiModelStatus(message.status);
        }

        // 다운로드 진행률 업데이트
        if (message.action === 'downloadProgress') {
          setDownloadProgress(message.progress);
          console.log('📥 [ai-settings] Download progress updated:', message.progress);
        }

        // 모델 전환 완료
        if (message.action === 'modelSwitched') {
          console.log(`🔄 [ai-settings] Model switched notification: ${message.modelId}`);
          setCurrentModelId(message.modelId);
          // 상태 새로고침은 modelStatusResponse 메시지가 전담하므로 여기서는 호출하지 않음
        }
      };

      chrome.runtime.onMessage.addListener(messageListener);
      return () => chrome.runtime.onMessage.removeListener(messageListener);
    }
  }, [isOpen, setAiModelStatus, loadModelData]);


  // 다중 모델 지원 핸들러들
  const handleModelSwitch = async (modelId: string, token?: string) => {
    try {
      console.log(`🔄 [ai-settings] Switching to model: ${modelId}`);

      // 모델 전환 시작 - 상태를 로딩으로 변경
      clearAiError();
      setAiModelStatus({ state: 2, error: undefined }); // 2: 로딩중

      // 백그라운드에 전환 요청만 보내고, 모든 상태 업데이트는 메시지 리스너가 처리
      await chrome.runtime.sendMessage({
        action: 'switchAIModel',
        modelId,
        token
      });

    } catch (error: any) {
      console.error('❌ [ai-settings] Model switch failed:', error);
      setAiModelStatus({
        state: 4, // 4: 에러
        error: error.message
      });
      alert(`❌ 모델 전환 실패: ${error.message}`);
    }
  };

  const handleModelDownload = async (modelId: string, token?: string) => {
    try {
      await chrome.runtime.sendMessage({
        action: 'downloadAIModel',
        modelId,
        token
      });
    } catch (error: any) {
      console.error('❌ [ai-settings] Model download failed:', error);
      alert(`모델 다운로드 실패: ${error.message}`);
    }
  };

  const handleModelDelete = async (modelId: string) => {
    if (!confirm(`${availableModels[modelId]?.name || modelId} 모델을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await chrome.runtime.sendMessage({
        action: 'deleteAIModel',
        modelId
      });

      // 상태 새로고침
      loadModelData();
    } catch (error: any) {
      console.error('❌ [ai-settings] Model deletion failed:', error);
      alert(`모델 삭제 실패: ${error.message}`);
    }
  };

  const loadModel = async () => {
    clearAiError();
    console.log('🔄 [loadModel] Current state before update:', JSON.stringify(aiModelStatus, null, 2));
    setAiModelStatus({ state: 2, error: undefined }); // 2: 로딩중
    console.log('🔄 [loadModel] Setting state to 2 (loading)');
    
    // 메시지만 보내고 모든 상태 업데이트는 메시지 리스너에서 처리
    chrome.runtime.sendMessage({ action: 'loadAIModel' });
  };





  if (!isOpen) return null;

  return (
    <div className="ai-settings-overlay" onClick={onClose}>
      <div className="ai-settings-modal" onClick={e => e.stopPropagation()}>
        <div className="ai-settings-header">
          <h3>🤖 AI Model Settings</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="ai-settings-content">
          {/* 모델 선택기 섬션 */}
          <div className="model-selector-section" style={{marginBottom: '20px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
              <h4 style={{margin: 0}}>🤖 AI 모델 관리</h4>
              <button
                className="btn btn-primary"
                onClick={() => setShowModelSelector(!showModelSelector)}
                style={{fontSize: '12px', padding: '6px 12px'}}
              >
                {showModelSelector ? '단순 보기' : '전체 모델 보기'}
              </button>
            </div>

            {showModelSelector ? (
              <ModelSelector
                availableModels={availableModels}
                currentModelId={currentModelId}
                downloadProgress={downloadProgress}
                onModelSwitch={handleModelSwitch}
                onModelDownload={handleModelDownload}
                onModelDelete={handleModelDelete}
                modelStates={modelStates}
              />
            ) : (
              <div className="current-model-summary" style={{
                padding: '20px',
                backgroundColor: currentModelId ? '#e8f5e8' : '#f8f9fa',
                borderRadius: '8px',
                border: `2px solid ${currentModelId ? '#28a745' : '#dee2e6'}`,
                position: 'relative'
              }}>
                {/* 현재 모델 배지 */}
                {currentModelId && (
                  <div style={{
                    position: 'absolute',
                    top: '-8px',
                    left: '15px',
                    backgroundColor: '#28a745',
                    color: '#fff',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}>
                    ✅ 현재 모델
                  </div>
                )}

                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div style={{flex: 1}}>
                    <div style={{fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', color: '#333'}}>
                      {availableModels[currentModelId]?.name || '모델이 선택되지 않음'}
                    </div>
                    <div style={{fontSize: '13px', color: '#666', marginBottom: '8px'}}>
                      {availableModels[currentModelId]?.description || '사용 가능한 모델을 선택하고 다운로드해주세요'}
                    </div>
                    {currentModelId && availableModels[currentModelId] && (
                      <div style={{fontSize: '12px', color: '#555'}}>
                        <span style={{marginRight: '15px'}}>
                          💾 크기: {availableModels[currentModelId].size}
                        </span>
                        <span style={{marginRight: '15px'}}>
                          ⚡ 양자화: {availableModels[currentModelId].quantization}
                        </span>
                        <span>
                          {availableModels[currentModelId].requiresToken ? '🔑 인증 필요' : '🔓 인증 불필요'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 우측 상태 인디케이터 */}
                  <div style={{textAlign: 'center'}}>
                    {downloadProgress && downloadProgress.status === 'downloading' && (
                      <div style={{fontSize: '14px', color: '#007bff', fontWeight: 'bold'}}>
                        📥 {downloadProgress.progress}%
                      </div>
                    )}
                    {aiModelStatus.state === 3 && currentModelId && (
                      <div style={{fontSize: '14px', color: '#28a745', fontWeight: 'bold'}}>
                        🚀 로드 완료
                      </div>
                    )}
                    {aiModelStatus.state === 4 && currentModelId && (
                      <div style={{fontSize: '14px', color: '#ffc107', fontWeight: 'bold'}}>
                        📦 로드 대기
                      </div>
                    )}
                    {!currentModelId && (
                      <div style={{fontSize: '14px', color: '#dc3545', fontWeight: 'bold'}}>
                        ❌ 모델 없음
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 현재 모델 상태 */}
          <div className="model-status" style={{marginBottom: '20px'}}>
            {aiModelStatus.state === 1 && (
              <div style={{color: '#6c757d', marginBottom: '15px'}}>
                🤖 AI 모델이 로드되지 않았습니다. 모델을 다운로드하거나 로드해주세요.
              </div>
            )}

            {aiModelStatus.state === 2 && (
              <div style={{color: '#007bff', marginBottom: '15px'}}>
                ⏳ 모델 로딩 중... {aiModelStatus.loadTime && `(${Math.floor(aiModelStatus.loadTime / 1000)}s)`}
              </div>
            )}

            {aiModelStatus.state === 3 && (
              <div style={{color: '#28a745', marginBottom: '15px'}}>
                ✅ 모델이 메모리에 로드되었습니다!
                {aiModelStatus.modelSize && ` (${(aiModelStatus.modelSize / 1024 / 1024).toFixed(1)}MB)`}
                {aiModelStatus.loadTime && ` 로드 시간: ${(aiModelStatus.loadTime / 1000).toFixed(1)}s`}
              </div>
            )}

            {aiModelStatus.state === 4 && (
              <div style={{color: '#ffc107', marginBottom: '15px'}}>
                📦 모델이 캐시에 있지만 로드되지 않았습니다. "로드" 버튼을 누르세요.
              </div>
            )}

            {aiModelStatus.error && (
              <div style={{color: '#dc3545', marginBottom: '15px'}}>
                ❌ 오류: {aiModelStatus.error}
              </div>
            )}
          </div>

          {/* 모델 액션 버튼들 */}
          <div className="model-actions" style={{marginBottom: '20px'}}>
            {aiModelStatus.state === 4 && (
              <button
                className="btn btn-success"
                onClick={loadModel}
                style={{fontSize: '14px', padding: '8px 16px'}}
              >
                🚀 모델 로드
              </button>
            )}

          </div>

        </div>

        {/* 다운로드 진행률 모달 */}
        {downloadProgress && downloadProgress.status === 'downloading' && (
          <DownloadProgressModal
            downloadProgress={downloadProgress}
            availableModels={availableModels}
            onCancel={() => {
              // 다운로드 취소 요청
              chrome.runtime.sendMessage({ action: 'cancelDownload' });
              setDownloadProgress(null);
            }}
          />
        )}
      </div>
    </div>
  );
};
