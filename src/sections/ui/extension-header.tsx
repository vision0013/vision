import React, { useState } from 'react';
import { AISettings } from '../../features/ai-inference/ui/ai-settings';
import { useSidePanelStore } from '../../features/side-panel-management/process/panel-store';
import '../../features/ai-inference/ui/ai-settings.css';

interface HeaderProps {
  isListening: boolean;
  onToggleListening: () => void;
  onExportData: () => void;
  hasAnalysisResult: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isListening,
  onToggleListening,
  onExportData,
  hasAnalysisResult,
}) => {
  const [showAISettings, setShowAISettings] = useState(false);
  const { setAiModelStatus } = useSidePanelStore();

  const handleAIButtonClick = async () => {
    console.log('🤖 [header] AI button clicked, opening panel...');

    // AI 설정 모달 즉시 열기
    setShowAISettings(true);

    // 모델 상태 강제 체크 (여러 방법 시도)
    console.log('🔍 [header] Force checking model status...');

    try {
      // 1차 시도: getAIModelStatus
      const response1 = await chrome.runtime.sendMessage({ action: 'getAIModelStatus' });
      console.log('📋 [header] getAIModelStatus response:', response1);

      if (response1 && response1.status) {
        setAiModelStatus(response1.status);
        console.log('✅ [header] Model status updated via getAIModelStatus:', response1.status);
        return;
      }

      // 2차 시도: loadAIModel (강제 상태 갱신)
      console.log('🔄 [header] Trying loadAIModel for status update...');
      const response2 = await chrome.runtime.sendMessage({ action: 'loadAIModel' });
      console.log('📋 [header] loadAIModel response:', response2);

    } catch (error) {
      console.error('❌ [header] Failed to check model status:', error);
      setAiModelStatus({ state: 1, error: 'Failed to check model status' });
    }

    // 3차 시도: 타이머로 지연된 상태 체크
    setTimeout(async () => {
      try {
        console.log('⏰ [header] Delayed status check...');
        const response3 = await chrome.runtime.sendMessage({ action: 'getAIModelStatus' });
        if (response3 && response3.status) {
          setAiModelStatus(response3.status);
          console.log('✅ [header] Delayed model status updated:', response3.status);
        }
      } catch (delayedError) {
        console.warn('⚠️ [header] Delayed status check failed:', delayedError);
      }
    }, 500);
  };

  return (
    <>
      <header className="header">
        <h1>Page Crawler</h1>
        <div className="controls">
          <button 
            onClick={handleAIButtonClick} 
            className="btn btn-secondary"
            title="AI Model Settings"
          >
            🤖 AI
          </button>
          <button onClick={onToggleListening} className={`btn ${isListening ? 'btn-secondary' : 'btn-primary'}`}>
            {isListening ? '음성인식 중지' : '음성인식 시작'}
          </button>
          {hasAnalysisResult && (
            <button onClick={onExportData} className="btn btn-secondary">
              Export JSON
            </button>
          )}
        </div>
      </header>
      
      <AISettings 
        isOpen={showAISettings} 
        onClose={() => setShowAISettings(false)} 
      />
    </>
  );
};