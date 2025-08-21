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

  const handleAIButtonClick = () => {
    console.log('🤖 [header] AI button clicked, opening panel...');
    
    // AI 설정 모달 즉시 열기
    setShowAISettings(true);
    
    // 백그라운드에서 모델 상태 검사 (비차단)
    (async () => {
      console.log('🔍 [header] Checking model status in background...');
      
      try {
        const response = await chrome.runtime.sendMessage({ action: 'getAIModelStatus' });
        if (response && response.status) {
          setAiModelStatus(response.status);
          console.log('✅ [header] Model status updated:', response.status);
        }
      } catch (error) {
        console.error('❌ [header] Failed to check model status:', error);
        setAiModelStatus({ state: 1, error: 'Failed to check model status' });
      }
    })();
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