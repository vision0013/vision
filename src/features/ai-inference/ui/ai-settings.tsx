import React, { useState, useEffect } from 'react';
import { useSidePanelStore } from '../../side-panel-management/process/panel-store';

const MODEL_INFO = {
  name: "Gemma 3 1B Model",
  size: "~529 MB",
  repoUrl: "https://huggingface.co/litert-community/Gemma3-1B-IT"
};

interface AISettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AISettings: React.FC<AISettingsProps> = ({ isOpen, onClose }) => {
  const { aiModelStatus, setAiModelStatus, setAiError, clearAiError } = useSidePanelStore();
  const [hfToken, setHfToken] = useState('');

  useEffect(() => {
    if (isOpen) {
      chrome.storage.local.get(['hfToken'], (result) => {
        if (result.hfToken) {
          setHfToken(result.hfToken);
        }
      });

      const messageListener = (message: any) => {
        console.log('🔄 [ai-settings] Received message:', message.action, JSON.stringify(message, null, 2));
        if (['modelStatusResponse', 'modelLoaded', 'modelDeleted', 'aiInitialized'].includes(message.action)) {
            console.log('📊 [ai-settings] Updating AI model status:', JSON.stringify(message.status, null, 2));
            setAiModelStatus(message.status);
        }
      };
      chrome.runtime.onMessage.addListener(messageListener);
      return () => chrome.runtime.onMessage.removeListener(messageListener);
    }
  }, [isOpen]);


  const handleSaveAndDownload = async () => {
    if (!hfToken) {
      alert('Please enter a Hugging Face API token.');
      return;
    }
    
    clearAiError();
    setAiModelStatus({ state: 2, error: undefined }); // 로딩 중
    
    try {
      await chrome.storage.local.set({ hfToken });
      console.log(' M [settings-ui] Token saved.');

      chrome.runtime.sendMessage({ 
        action: 'downloadAIModel', 
        token: hfToken
      });
    } catch (error) {
      setAiError(error);
    }
  };

  const loadModel = async () => {
    clearAiError();
    console.log('🔄 [loadModel] Current state before update:', JSON.stringify(aiModelStatus, null, 2));
    setAiModelStatus({ state: 2, error: undefined }); // 2: 로딩중
    console.log('🔄 [loadModel] Setting state to 2 (loading)');
    
    // 메시지만 보내고 모든 상태 업데이트는 메시지 리스너에서 처리
    chrome.runtime.sendMessage({ action: 'initializeAI' });
  };

  const deleteModel = async () => {
    if (confirm('Are you sure you want to delete the AI model?')) {
      try {
        await chrome.runtime.sendMessage({ action: 'deleteAIModel' });
      } catch (error) {
        console.error('❌ Model deletion failed:', error);
        setAiError(error);
      }
    }
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
          <div className="model-info">
            <h4>{MODEL_INFO.name}</h4>
            <p>To use AI features, please provide a Hugging Face API token.</p>
            <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer">Get your token here.</a>
            <p style={{marginTop: '10px'}}>After agreeing to the <a href={MODEL_INFO.repoUrl} target="_blank" rel="noopener noreferrer">model license</a>, your token will allow the extension to download the model.</p>
          </div>

          <div className="model-status">
            {aiModelStatus.state === 1 && (
              <div style={{color: '#6c757d', marginBottom: '15px'}}>
                🤖 No AI model found. Please download the model first.
              </div>
            )}
            
            {aiModelStatus.state === 2 && (
              <div style={{color: '#007bff', marginBottom: '15px'}}>
                ⏳ Loading model... {aiModelStatus.loadTime && `(${Math.floor(aiModelStatus.loadTime / 1000)}s)`}
              </div>
            )}
            
            {aiModelStatus.state === 3 && (
              <div style={{color: '#28a745', marginBottom: '15px'}}>
                ✅ Model loaded in memory! 
                {aiModelStatus.modelSize && ` (${(aiModelStatus.modelSize / 1024 / 1024).toFixed(1)}MB)`}
                {aiModelStatus.loadTime && ` in ${(aiModelStatus.loadTime / 1000).toFixed(1)}s`}
              </div>
            )}
            
            {aiModelStatus.state === 4 && (
              <div style={{color: '#ffc107', marginBottom: '15px'}}>
                📦 Model found in cache but not loaded. Click "Load Model" to use AI features.
              </div>
            )}
            
            {aiModelStatus.error && (
              <div style={{color: '#dc3545', marginBottom: '15px'}}>
                ❌ Error: {aiModelStatus.error}
              </div>
            )}
          </div>

          <div className="token-input-section" style={{marginBottom: '20px'}}>
            <label htmlFor="hf-token" style={{display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500'}}>Hugging Face Token</label>
            <input 
              id="hf-token"
              type="password" 
              value={hfToken}
              onChange={(e) => setHfToken(e.target.value)}
              placeholder="hf_..."
              className="search-input"
              style={{width: '100%'}}
            />
          </div>

          <div className="model-actions">
            {aiModelStatus.state === 1 && (
              <button 
                className="btn btn-primary download-btn"
                onClick={handleSaveAndDownload}
                disabled={false}
              >
                {`Save Token & Download Model (${MODEL_INFO.size})`}
              </button>
            )}
            
            {aiModelStatus.state === 4 && (
              <button 
                className="btn btn-success"
                onClick={loadModel}
                disabled={false}
              >
                🚀 Load Model from Cache
              </button>
            )}
            
            {(aiModelStatus.state === 3 || aiModelStatus.state === 4) && (
              <button 
                className="btn btn-secondary delete-btn"
                onClick={deleteModel}
                disabled={false}
                style={{marginLeft: aiModelStatus.state === 3 ? '0' : '10px'}}
              >
                🗑️ Delete Model
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
