import React from 'react';
import { ModelDownloadProgress, AvailableModels } from '../types/ai-types';

interface DownloadProgressModalProps {
  downloadProgress: ModelDownloadProgress;
  availableModels: AvailableModels;
  onCancel?: () => void;
}

export const DownloadProgressModal: React.FC<DownloadProgressModalProps> = ({
  downloadProgress,
  availableModels,
  onCancel
}) => {
  const modelInfo = availableModels[downloadProgress.modelId];
  const progressPercent = Math.max(0, Math.min(100, downloadProgress.progress));

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatSpeed = (downloadedBytes: number, timeElapsed: number): string => {
    if (timeElapsed === 0) return '0 MB/s';
    const speed = downloadedBytes / timeElapsed * 1000; // bytes per second
    const speedMB = speed / (1024 * 1024);
    return `${speedMB.toFixed(1)} MB/s`;
  };

  const estimateTimeRemaining = (downloadedBytes: number, totalBytes: number, speed: number): string => {
    if (speed === 0) return '알 수 없음';
    const remainingBytes = totalBytes - downloadedBytes;
    const remainingSeconds = remainingBytes / speed;

    if (remainingSeconds < 60) {
      return `${Math.round(remainingSeconds)}초`;
    } else if (remainingSeconds < 3600) {
      return `${Math.round(remainingSeconds / 60)}분`;
    } else {
      return `${Math.round(remainingSeconds / 3600)}시간`;
    }
  };

  // 다운로드 시작 시간 추정 (현재 시간에서 역산)
  const estimatedStartTime = Date.now() - (downloadProgress.downloadedBytes / (downloadProgress.totalBytes || 1)) * 60000;
  const timeElapsed = Date.now() - estimatedStartTime;
  const currentSpeed = downloadProgress.downloadedBytes / timeElapsed * 1000;

  return (
    <div className="download-modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <div className="download-modal" style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '30px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
      }}>
        {/* 헤더 */}
        <div className="modal-header" style={{
          textAlign: 'center',
          marginBottom: '25px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>
            🤖 AI 모델 다운로드 중
          </h3>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#555' }}>
            {modelInfo?.name || downloadProgress.modelId}
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
            {modelInfo?.description}
          </div>
        </div>

        {/* 진행률 표시 */}
        <div className="progress-section" style={{ marginBottom: '25px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
              {progressPercent.toFixed(1)}%
            </span>
            <span style={{ fontSize: '14px', color: '#666' }}>
              {formatBytes(downloadProgress.downloadedBytes)} / {formatBytes(downloadProgress.totalBytes)}
            </span>
          </div>

          {/* 진행률 바 */}
          <div style={{
            width: '100%',
            height: '20px',
            backgroundColor: '#e9ecef',
            borderRadius: '10px',
            overflow: 'hidden',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              width: `${progressPercent}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #007bff, #0056b3)',
              borderRadius: '10px',
              transition: 'width 0.3s ease',
              position: 'relative'
            }}>
              {/* 애니메이션 효과 */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                background: 'linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%)',
                animation: progressPercent > 0 ? 'shimmer 2s infinite' : 'none'
              }}></div>
            </div>
          </div>
        </div>

        {/* 상세 정보 */}
        <div className="download-details" style={{
          backgroundColor: '#f8f9fa',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <div className="detail-row" style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px',
            fontSize: '14px'
          }}>
            <span style={{ color: '#666' }}>다운로드 속도:</span>
            <span style={{ fontWeight: 'bold', color: '#333' }}>
              {formatSpeed(downloadProgress.downloadedBytes, timeElapsed)}
            </span>
          </div>

          <div className="detail-row" style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px',
            fontSize: '14px'
          }}>
            <span style={{ color: '#666' }}>예상 남은 시간:</span>
            <span style={{ fontWeight: 'bold', color: '#333' }}>
              {estimateTimeRemaining(downloadProgress.downloadedBytes, downloadProgress.totalBytes, currentSpeed)}
            </span>
          </div>

          <div className="detail-row" style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '14px'
          }}>
            <span style={{ color: '#666' }}>모델 크기:</span>
            <span style={{ fontWeight: 'bold', color: '#333' }}>
              {modelInfo?.size || formatBytes(downloadProgress.totalBytes)}
            </span>
          </div>
        </div>

        {/* 상태 메시지 */}
        {downloadProgress.status === 'downloading' && (
          <div style={{
            textAlign: 'center',
            color: '#007bff',
            fontSize: '14px',
            marginBottom: '20px'
          }}>
            📥 모델을 다운로드하고 있습니다...
          </div>
        )}

        {downloadProgress.status === 'processing' && (
          <div style={{
            textAlign: 'center',
            color: '#ffc107',
            fontSize: '14px',
            marginBottom: '20px'
          }}>
            ⚙️ 다운로드 완료, 모델을 처리하고 있습니다...
          </div>
        )}

        {downloadProgress.status === 'error' && (
          <div style={{
            textAlign: 'center',
            color: '#dc3545',
            fontSize: '14px',
            marginBottom: '20px'
          }}>
            ❌ 오류: {downloadProgress.error}
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="modal-actions" style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '10px'
        }}>
          {downloadProgress.status === 'downloading' && onCancel && (
            <button
              onClick={onCancel}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5a6268'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6c757d'}
            >
              취소
            </button>
          )}

          {downloadProgress.status === 'completed' && (
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ✅ 완료
            </button>
          )}
        </div>
      </div>

      {/* CSS 애니메이션을 위한 스타일 추가 */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};