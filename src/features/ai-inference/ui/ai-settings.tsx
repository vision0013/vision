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
  const { aiModelStatus, setAiModelStatus } = useSidePanelStore();
  const [hfToken, setHfToken] = useState('');

  useEffect(() => {
    if (isOpen) {
      chrome.storage.local.get(['hfToken'], (result) => {
        if (result.hfToken) {
          setHfToken(result.hfToken);
        }
      });

      const messageListener = (message: any) => {
        if (['modelStatusResponse', 'modelLoaded', 'modelDeleted', 'aiInitialized'].includes(message.action)) {
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
    setAiModelStatus({ ...aiModelStatus, isLoading: true, error: undefined });
    
    await chrome.storage.local.set({ hfToken });
    console.log(' M [settings-ui] Token saved.');

    chrome.runtime.sendMessage({ 
      action: 'downloadAIModel', 
      token: hfToken
    });
  };

  const loadModel = async () => {
    setAiModelStatus({ ...aiModelStatus, isLoading: true, error: undefined });
    
    try {
      const response = await chrome.runtime.sendMessage({ action: 'initializeAI' });
      if (response && response.success) {
        console.log('✅ Model loaded successfully');
      }
    } catch (error) {
      console.error('❌ Model loading failed:', error);
    }
  };

  const deleteModel = async () => {
    if (confirm('Are you sure you want to delete the AI model?')) {
      try {
        await chrome.runtime.sendMessage({ action: 'deleteAIModel' });
      } catch (error) {
        console.error('❌ Model deletion failed:', error);
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
            {aiModelStatus.isLoading && (
              <div style={{color: '#007bff', marginBottom: '15px'}}>
                ⏳ Loading model... {aiModelStatus.loadTime && `(${Math.floor(aiModelStatus.loadTime / 1000)}s)`}
              </div>
            )}
            
            {aiModelStatus.isLoaded && (
              <div style={{color: '#28a745', marginBottom: '15px'}}>
                ✅ Model loaded in memory! 
                {aiModelStatus.modelSize && ` (${(aiModelStatus.modelSize / 1024 / 1024).toFixed(1)}MB)`}
                {aiModelStatus.loadTime && ` in ${(aiModelStatus.loadTime / 1000).toFixed(1)}s`}
              </div>
            )}
            
            {!aiModelStatus.isLoaded && aiModelStatus.modelExists && (
              <div style={{color: '#ffc107', marginBottom: '15px'}}>
                📦 Model found in cache but not loaded. Click "Load Model" to use AI features.
              </div>
            )}
            
            {aiModelStatus.error && (
              <div style={{color: '#dc3545', marginBottom: '15px'}}>
                ❌ Error: {aiModelStatus.error}
              </div>
            )}
            
            {!aiModelStatus.isLoaded && !aiModelStatus.isLoading && !aiModelStatus.modelExists && !aiModelStatus.error && (
              <div style={{color: '#6c757d', marginBottom: '15px'}}>
                🤖 No AI model found. Please download the model first.
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
            {!aiModelStatus.isLoaded && !aiModelStatus.modelExists && (
              <button 
                className="btn btn-primary download-btn"
                onClick={handleSaveAndDownload}
                disabled={aiModelStatus.isLoading}
              >
                {aiModelStatus.isLoading ? '⏳ Downloading...' : `Save Token & Download Model (${MODEL_INFO.size})`}
              </button>
            )}
            
            {!aiModelStatus.isLoaded && aiModelStatus.modelExists && (
              <button 
                className="btn btn-success"
                onClick={loadModel}
                disabled={aiModelStatus.isLoading}
              >
                {aiModelStatus.isLoading ? '⏳ Loading...' : '🚀 Load Model from Cache'}
              </button>
            )}
            
            {(aiModelStatus.isLoaded || aiModelStatus.modelExists) && (
              <button 
                className="btn btn-secondary delete-btn"
                onClick={deleteModel}
                disabled={aiModelStatus.isLoading}
                style={{marginLeft: aiModelStatus.isLoaded ? '0' : '10px'}}
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
