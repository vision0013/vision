import React, { useState, useEffect } from 'react';
import { useSidePanelStore } from '../../side-panel-management/process/panel-store';
import { AI_TEST_CASES, AITestResult, AITestSummary } from '../config/test-cases';

const MODEL_INFO = {
  name: "Gemma 3 4B Model",
  size: "~2.56 GB",
  repoUrl: "https://huggingface.co/litert-community/Gemma3-4B-IT"
};

interface AISettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AISettings: React.FC<AISettingsProps> = ({ isOpen, onClose }) => {
  const { aiModelStatus, setAiModelStatus, setAiError, clearAiError } = useSidePanelStore();
  const [hfToken, setHfToken] = useState('');
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<AITestSummary | null>(null);

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
    chrome.runtime.sendMessage({ action: 'loadAIModel' });
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

  const runAutoTest = async () => {
    if (!AI_TEST_CASES || AI_TEST_CASES.length === 0) {
      alert('No test cases found.');
      return;
    }

    setIsTestRunning(true);
    setTestResults(null);
    
    try {
      console.log('🧪 Starting automated AI test with 25 cases...');
      
      const testResults: AITestResult[] = [];
      let totalResponseTime = 0;
      
      for (let i = 0; i < AI_TEST_CASES.length; i++) {
        const testCase = AI_TEST_CASES[i];
        console.log(`\n🎯 Test ${i + 1}/${AI_TEST_CASES.length}: "${testCase.command}"`);
        
        const startTime = performance.now();
        
        try {
          const response = await chrome.runtime.sendMessage({
            action: 'testAIAnalysis',
            command: testCase.command
          });
          
          const endTime = performance.now();
          const responseTime = Math.round(endTime - startTime);
          totalResponseTime += responseTime;
          
          if (response && response.intent) {
            const { action, confidence } = response.intent;
            const isCorrect = action === testCase.expected;
            
            console.log(`${isCorrect ? '✅' : '❌'} Expected: ${testCase.expected}, Got: ${action} (${confidence})`);
            
            testResults.push({
              testCase,
              actualResult: action,
              confidence: confidence || 0,
              responseTime,
              isCorrect
            });
          } else {
            console.log('❌ No response received');
            testResults.push({
              testCase,
              actualResult: 'error',
              confidence: 0,
              responseTime,
              isCorrect: false,
              error: 'No response received'
            });
          }
        } catch (error: any) {
          const endTime = performance.now();
          const responseTime = Math.round(endTime - startTime);
          totalResponseTime += responseTime;
          
          console.error(`❌ Test failed: ${error.message}`);
          testResults.push({
            testCase,
            actualResult: 'error',
            confidence: 0,
            responseTime,
            isCorrect: false,
            error: error.message
          });
        }
        
        // 테스트 간 잠시 대기 (AI 모델 과부하 방지)
        if (i < AI_TEST_CASES.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // 결과 요약 계산
      const correctTests = testResults.filter(r => r.isCorrect);
      const accuracy = (correctTests.length / testResults.length * 100);
      const avgResponseTime = Math.round(totalResponseTime / testResults.length);
      const avgConfidence = testResults.reduce((sum, r) => sum + r.confidence, 0) / testResults.length;
      
      // 카테고리별 결과 계산
      const categoryResults: Record<string, { total: number; correct: number; accuracy: number }> = {};
      for (const testCase of AI_TEST_CASES) {
        const category = testCase.category;
        if (!categoryResults[category]) {
          categoryResults[category] = { total: 0, correct: 0, accuracy: 0 };
        }
        categoryResults[category].total++;
        
        const result = testResults.find(r => r.testCase === testCase);
        if (result && result.isCorrect) {
          categoryResults[category].correct++;
        }
      }
      
      for (const category in categoryResults) {
        const cat = categoryResults[category];
        cat.accuracy = (cat.correct / cat.total * 100);
      }
      
      const summary: AITestSummary = {
        totalTests: testResults.length,
        correctTests: correctTests.length,
        accuracy,
        avgResponseTime,
        avgConfidence,
        categoryResults,
        failedTests: testResults.filter(r => !r.isCorrect)
      };
      
      setTestResults(summary);
      
      console.log('\n🏆 Test Results Summary:');
      console.log(`📊 Overall Accuracy: ${correctTests.length}/${testResults.length} (${accuracy.toFixed(1)}%)`);
      console.log(`⚡ Average Response Time: ${avgResponseTime}ms`);
      console.log(`🎯 Average Confidence: ${avgConfidence.toFixed(2)}`);
      
      console.log('\n📋 Category Results:');
      for (const [category, result] of Object.entries(categoryResults)) {
        console.log(`   📂 ${category}: ${result.correct}/${result.total} (${result.accuracy.toFixed(1)}%)`);
      }
      
      if (summary.failedTests.length > 0) {
        console.log('\n❌ Failed Tests:');
        summary.failedTests.forEach(fail => {
          console.log(`   • "${fail.testCase.command}" → Expected: ${fail.testCase.expected}, Got: ${fail.actualResult}`);
        });
      } else {
        console.log('\n🎉 All tests passed! Perfect Score!');
      }
      
    } catch (error: any) {
      console.error('❌ Test execution failed:', error);
      alert(`Test execution failed: ${error.message}`);
    } finally {
      setIsTestRunning(false);
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
            
            {aiModelStatus.state === 3 && (
              <button 
                className="btn btn-info"
                onClick={runAutoTest}
                disabled={isTestRunning}
                style={{marginLeft: '10px'}}
              >
                {isTestRunning ? '⏳ Testing...' : '🧪 Run AI Test (25 cases)'}
              </button>
            )}
            
            {(aiModelStatus.state === 3 || aiModelStatus.state === 4) && (
              <button 
                className="btn btn-secondary delete-btn"
                onClick={deleteModel}
                disabled={false}
                style={{marginLeft: aiModelStatus.state === 3 ? '10px' : '10px'}}
              >
                🗑️ Delete Model
              </button>
            )}
          </div>

          {testResults && (
            <div className="test-results-section" style={{marginTop: '20px', borderTop: '1px solid #ddd', paddingTop: '20px'}}>
              <h4>🧪 Test Results</h4>
              
              <div className="test-summary" style={{backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px', marginBottom: '15px'}}>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '14px'}}>
                  <div><strong>Overall Accuracy:</strong> {testResults.correctTests}/{testResults.totalTests} ({testResults.accuracy.toFixed(1)}%)</div>
                  <div><strong>Avg Response Time:</strong> {testResults.avgResponseTime}ms</div>
                  <div><strong>Avg Confidence:</strong> {testResults.avgConfidence.toFixed(2)}</div>
                  <div><strong>Failed Tests:</strong> {testResults.failedTests.length}</div>
                </div>
              </div>

              <div className="category-results" style={{marginBottom: '15px'}}>
                <h5>📋 Category Results:</h5>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '5px', fontSize: '13px'}}>
                  {Object.entries(testResults.categoryResults).map(([category, result]) => (
                    <div key={category} style={{padding: '5px'}}>
                      <strong>{category}:</strong> {result.correct}/{result.total} ({result.accuracy.toFixed(1)}%)
                    </div>
                  ))}
                </div>
              </div>

              {testResults.failedTests.length > 0 && (
                <div className="failed-tests" style={{backgroundColor: '#fff5f5', padding: '10px', borderRadius: '5px', border: '1px solid #fed7d7'}}>
                  <h5 style={{color: '#e53e3e', margin: '0 0 10px 0'}}>❌ Failed Tests:</h5>
                  <div style={{fontSize: '12px', maxHeight: '150px', overflowY: 'auto'}}>
                    {testResults.failedTests.map((fail, index) => (
                      <div key={index} style={{marginBottom: '5px', paddingBottom: '5px', borderBottom: '1px solid #fed7d7'}}>
                        <div><strong>Command:</strong> "{fail.testCase.command}"</div>
                        <div><strong>Expected:</strong> {fail.testCase.expected} → <strong>Got:</strong> {fail.actualResult}</div>
                        {fail.error && <div style={{color: '#e53e3e'}}><strong>Error:</strong> {fail.error}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {testResults.failedTests.length === 0 && (
                <div style={{backgroundColor: '#f0fff4', padding: '15px', borderRadius: '5px', border: '1px solid #9ae6b4', textAlign: 'center'}}>
                  <div style={{color: '#38a169', fontSize: '16px', fontWeight: 'bold'}}>🎉 Perfect Score!</div>
                  <div style={{color: '#2f855a', fontSize: '14px'}}>All 25 test cases passed successfully!</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
