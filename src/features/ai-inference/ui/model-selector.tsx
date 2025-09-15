import React, { useState, useEffect } from 'react';
import { AvailableModels, ModelDownloadProgress } from '../types/ai-types';

interface ModelSelectorProps {
  availableModels: AvailableModels;
  currentModelId: string;
  downloadProgress: ModelDownloadProgress | null;
  onModelSwitch: (modelId: string, token?: string) => void;
  onModelDownload: (modelId: string, token?: string) => void;
  onModelDelete: (modelId: string) => void;
  modelStates: Record<string, { exists: boolean; size?: number }>;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  availableModels,
  currentModelId,
  downloadProgress,
  onModelSwitch,
  onModelDownload,
  onModelDelete,
  modelStates
}) => {
  const [hfToken, setHfToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [pendingAction, setPendingAction] = useState<{type: 'switch' | 'download', modelId: string} | null>(null);

  // 토큰 로드
  useEffect(() => {
    chrome.storage.local.get(['hfToken'], (result) => {
      if (result.hfToken) {
        setHfToken(result.hfToken);
      }
    });
  }, []);

  const handleModelSelect = async (modelId: string, action: 'switch' | 'download') => {
    const modelInfo = availableModels[modelId];

    if (modelInfo.requiresToken && !hfToken) {
      setPendingAction({ type: action, modelId });
      setShowTokenInput(true);
      return;
    }

    await chrome.storage.local.set({ hfToken });

    if (action === 'switch') {
      onModelSwitch(modelId, hfToken);
    } else {
      onModelDownload(modelId, hfToken);
    }
  };

  const handleTokenSubmit = async () => {
    if (!hfToken || !pendingAction) return;

    await chrome.storage.local.set({ hfToken });

    if (pendingAction.type === 'switch') {
      onModelSwitch(pendingAction.modelId, hfToken);
    } else {
      onModelDownload(pendingAction.modelId, hfToken);
    }

    setShowTokenInput(false);
    setPendingAction(null);
  };

  const getModelStatus = (modelId: string) => {
    const modelState = modelStates[modelId];
    const isDownloading = downloadProgress?.modelId === modelId && downloadProgress.status === 'downloading';
    const isCurrentModel = currentModelId === modelId;

    if (isDownloading) {
      return {
        status: 'downloading',
        text: `⏳ 다운로드 중... ${downloadProgress.progress}%`,
        color: '#007bff'
      };
    }

    if (modelState?.exists) {
      if (isCurrentModel) {
        return {
          status: 'current',
          text: '✅ 현재 사용 중',
          color: '#28a745'
        };
      } else {
        return {
          status: 'ready',
          text: '📦 다운로드 완료',
          color: '#6c757d'
        };
      }
    }

    return {
      status: 'not_downloaded',
      text: '📥 다운로드 필요',
      color: '#ffc107'
    };
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return ` (${mb.toFixed(1)}MB)`;
  };

  return (
    <div className="model-selector">
      <div className="model-selector-header">
        <h4>🤖 AI 모델 선택</h4>
        <div className="current-model-info">
          현재 모델: <strong>{availableModels[currentModelId]?.name || currentModelId}</strong>
        </div>
      </div>

      <div className="model-list">
        {Object.entries(availableModels).map(([modelId, modelInfo]) => {
          const status = getModelStatus(modelId);
          const modelState = modelStates[modelId];
          const isDownloading = downloadProgress?.modelId === modelId && downloadProgress.status === 'downloading';

          return (
            <div
              key={modelId}
              className={`model-item ${currentModelId === modelId ? 'current' : ''}`}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '10px',
                backgroundColor: currentModelId === modelId ? '#f0fff4' : '#fff'
              }}
            >
              <div className="model-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                <div className="model-info">
                  <h5 style={{ margin: '0 0 5px 0', color: '#333' }}>{modelInfo.name}</h5>
                  <div style={{ fontSize: '13px', color: '#666', marginBottom: '5px' }}>
                    {modelInfo.description}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888' }}>
                    크기: {modelInfo.size} • 양자화: {modelInfo.quantization} • {modelInfo.category}
                    {modelState?.size && formatFileSize(modelState.size)}
                  </div>
                </div>
                <div className="model-badges">
                  {modelInfo.requiresToken && (
                    <span style={{
                      fontSize: '11px',
                      backgroundColor: '#ffc107',
                      color: '#000',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      marginRight: '5px'
                    }}>
                      🔑 인증 필요
                    </span>
                  )}
                  <span style={{
                    fontSize: '11px',
                    backgroundColor: status.color,
                    color: '#fff',
                    padding: '2px 6px',
                    borderRadius: '3px'
                  }}>
                    {status.text}
                  </span>
                </div>
              </div>

              {/* 다운로드 진행률 */}
              {isDownloading && downloadProgress && (
                <div className="download-progress" style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                    <span>다운로드 진행률</span>
                    <span>{downloadProgress.progress}%</span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: '#e9ecef',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${downloadProgress.progress}%`,
                      height: '100%',
                      backgroundColor: '#007bff',
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>
                    {(downloadProgress.downloadedBytes / 1024 / 1024).toFixed(1)}MB / {(downloadProgress.totalBytes / 1024 / 1024).toFixed(1)}MB
                  </div>
                </div>
              )}

              <div className="model-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {!modelState?.exists && !isDownloading && (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleModelSelect(modelId, 'download')}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    📥 다운로드
                  </button>
                )}

                {modelState?.exists && currentModelId !== modelId && !isDownloading && (
                  <button
                    className="btn btn-success"
                    onClick={() => handleModelSelect(modelId, 'switch')}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    🔄 전환
                  </button>
                )}

                {modelState?.exists && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => onModelDelete(modelId)}
                    disabled={isDownloading || currentModelId === modelId}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    🗑️ 삭제
                  </button>
                )}
              </div>

              {/* 모델 성능 정보 */}
              <div className="model-performance" style={{ marginTop: '10px', fontSize: '11px', color: '#666' }}>
                <div>⚡ 응답 속도: ~{modelInfo.performance.avgResponseTime}ms</div>
                <div>💾 메모리 사용량: {modelInfo.performance.memoryUsage}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 토큰 입력 모달 */}
      {showTokenInput && (
        <div className="token-modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="token-modal" style={{
            backgroundColor: '#fff',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h5>🔑 Hugging Face 토큰 필요</h5>
            <p style={{ fontSize: '14px', color: '#666' }}>
              {pendingAction && availableModels[pendingAction.modelId]?.name} 모델은 인증이 필요합니다.
            </p>
            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="token-input" style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                Hugging Face Token
              </label>
              <input
                id="token-input"
                type="password"
                value={hfToken}
                onChange={(e) => setHfToken(e.target.value)}
                placeholder="hf_..."
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
              <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer">
                  토큰 발급받기 →
                </a>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowTokenInput(false);
                  setPendingAction(null);
                }}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                취소
              </button>
              <button
                className="btn btn-primary"
                onClick={handleTokenSubmit}
                disabled={!hfToken}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};