import React, { useState, useEffect, useCallback } from 'react';
import { useSidePanelStore } from '../../side-panel-management/process/panel-store';
import { AI_TEST_SETS, AITestSetKey, AITestResult, AITestSummary } from '../config/test-cases';
import { ModelSelector } from './model-selector';
import { DownloadProgressModal } from './download-progress-modal';
import { AvailableModels, ModelDownloadProgress } from '../types/ai-types';

interface LearningSnapshot {
  id: string;
  name: string;
  createdAt: Date;
  examples: any[];
  testResults?: {
    accuracy: number;
    totalTests: number;
    correctTests: number;
    avgConfidence: number;
  };
  description?: string;
}


interface AISettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AISettings: React.FC<AISettingsProps> = ({ isOpen, onClose }) => {
  // 디버깅: Panel 인스턴스 생성 추적
  console.log('🔍 [AISettings] Component instance created/rendered at:', Date.now());
  
  const { aiModelStatus, setAiModelStatus, clearAiError } = useSidePanelStore();
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<AITestSummary | null>(null);
  const [learnedStats, setLearnedStats] = useState<{count: number, size: number} | null>(null);
  const [snapshots, setSnapshots] = useState<LearningSnapshot[]>([]);
  const [showSnapshots, setShowSnapshots] = useState(false);

  // 다중 모델 지원 상태
  const [availableModels, setAvailableModels] = useState<AvailableModels>({});
  const [currentModelId, setCurrentModelId] = useState<string>('');
  const [downloadProgress, setDownloadProgress] = useState<ModelDownloadProgress | null>(null);
  const [modelStates, setModelStates] = useState<Record<string, { exists: boolean; size?: number }>>({});
  const [showModelSelector, setShowModelSelector] = useState(false);

  // 함수들을 useCallback으로 안정화 (useEffect보다 먼저 선언)
  const loadLearnedStats = useCallback(async () => {
    if (aiModelStatus.state !== 3) return; // AI 모델이 로드된 상태에서만 조회

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getLearnedStats'
      });

      if (response.success) {
        setLearnedStats(response.stats);
      }
    } catch (error) {
      console.error('❌ [ai-settings] Failed to load learned stats:', error);
    }
  }, [aiModelStatus.state]);

  const loadSnapshots = useCallback(async () => {
    if (aiModelStatus.state !== 3) return;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getSnapshots'
      });

      if (response.success) {
        // Date 객체로 변환
        const snapshotsWithDates = response.snapshots.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt)
        }));
        setSnapshots(snapshotsWithDates);
      }
    } catch (error) {
      console.error('❌ [ai-settings] Failed to load snapshots:', error);
    }
  }, [aiModelStatus.state]);

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

      // 다운로드 진행률 요청
      const progressResponse = await chrome.runtime.sendMessage({ action: 'getDownloadProgress' });
      if (progressResponse.success && progressResponse.progress) {
        setDownloadProgress(progressResponse.progress);
      }
    } catch (error) {
      console.error('❌ [ai-settings] Failed to load model data:', error);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadModelData();

      const messageListener = (message: any) => {
        console.log('🔄 [ai-settings] Received message:', message.action, JSON.stringify(message, null, 2));

        if (['modelStatusResponse', 'modelLoaded', 'modelDeleted', 'aiInitialized'].includes(message.action)) {
          console.log('📊 [ai-settings] Updating AI model status:', JSON.stringify(message.status, null, 2));
          setAiModelStatus(message.status);

          // 모델 로드 완료 시 학습 현황과 스냅샷도 로드
          if (message.status?.state === 3) {
            setTimeout(() => {
              loadLearnedStats();
              loadSnapshots();
            }, 100);
          }
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
          loadModelData(); // 상태 새로고침
        }
      };

      chrome.runtime.onMessage.addListener(messageListener);
      return () => chrome.runtime.onMessage.removeListener(messageListener);
    }
  }, [isOpen, setAiModelStatus, loadLearnedStats, loadSnapshots, loadModelData]);


  // 다중 모델 지원 핸들러들
  const handleModelSwitch = async (modelId: string, token?: string) => {
    try {
      console.log(`🔄 [ai-settings] Switching to model: ${modelId}`);

      const response = await chrome.runtime.sendMessage({
        action: 'switchAIModel',
        modelId,
        token
      });

      if (response.success) {
        // 즉시 UI 업데이트
        setCurrentModelId(modelId);
        console.log(`✅ [ai-settings] Model switched to: ${availableModels[modelId]?.name}`);

        // 상태 데이터 새로고침
        setTimeout(() => {
          loadModelData();
        }, 500);

        // 성공 메시지 표시
        alert(`✅ 모델이 성공적으로 전환되었습니다!

새 모델: ${availableModels[modelId]?.name}`);
      } else {
        throw new Error(response.error || '모델 전환에 실패했습니다');
      }
    } catch (error: any) {
      console.error('❌ [ai-settings] Model switch failed:', error);
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


  const createManualSnapshot = async () => {
    const description = prompt('스냅샷 설명을 입력해주세요 (선택사항):');
    if (description === null) return; // 사용자가 취소

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'createSnapshot',
        description: description || undefined
      });

      if (response.success) {
        alert('✅ 스냅샷이 생성되었습니다!');
        await loadSnapshots(); // 목록 새로고침
      } else {
        alert(`❌ 스냅샷 생성 실패: ${response.error}`);
      }
    } catch (error: any) {
      console.error('❌ [ai-settings] Failed to create snapshot:', error);
      alert(`❌ 스냅샷 생성 요청 중 오류: ${error.message}`);
    }
  };

  const rollbackToSnapshot = async (snapshotId: string, snapshotName: string) => {
    if (!confirm(`"${snapshotName}"로 롤백하시겠습니까?\n\n현재 학습 데이터는 자동으로 백업됩니다.`)) {
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'rollbackSnapshot',
        snapshotId
      });

      if (response.success) {
        alert('✅ 롤백이 완료되었습니다!');
        await loadLearnedStats(); // 현황 새로고침
      } else {
        alert(`❌ 롤백 실패: ${response.error}`);
      }
    } catch (error: any) {
      console.error('❌ [ai-settings] Failed to rollback:', error);
      alert(`❌ 롤백 요청 중 오류: ${error.message}`);
    }
  };

  const deleteSnapshot = async (snapshotId: string, snapshotName: string) => {
    if (!confirm(`"${snapshotName}" 스냅샷을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'deleteSnapshot',
        snapshotId
      });

      if (response.success) {
        alert('✅ 스냅샷이 삭제되었습니다.');
        await loadSnapshots(); // 목록 새로고침
      } else {
        alert(`❌ 삭제 실패: ${response.error}`);
      }
    } catch (error: any) {
      console.error('❌ [ai-settings] Failed to delete snapshot:', error);
      alert(`❌ 삭제 요청 중 오류: ${error.message}`);
    }
  };

  const clearLearnedExamples = async () => {
    if (!confirm('모든 학습 데이터를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'clearLearnedExamples'
      });

      if (response.success) {
        alert('✅ 모든 학습 데이터가 삭제되었습니다.');
        setLearnedStats({ count: 0, size: 0 });
      } else {
        alert(`❌ 삭제 중 오류가 발생했습니다: ${response.error}`);
      }
    } catch (error: any) {
      console.error('❌ [ai-settings] Failed to clear learned examples:', error);
      alert(`❌ 삭제 요청 중 오류가 발생했습니다: ${error.message}`);
    }
  };

  const learnFromFailedTests = async (failedTests: AITestResult[]) => {
    if (!failedTests || failedTests.length === 0) {
      alert('학습할 실패 케이스가 없습니다.');
      return;
    }

    try {
      // 데이터 흐름 추적: Panel 호출 지점
      console.log(`🧠 [Panel] Learning from ${failedTests.length} failed tests...`);
      console.log('🔍 [Panel] Call stack:', new Error().stack);
      
      // 실패한 테스트 케이스를 학습용 형식으로 변환
      const failedCasesForLearning = failedTests.map(failed => ({
        command: failed.testCase.command,
        expected: failed.testCase.expected,
        description: failed.testCase.description
      }));
      
      // Background로 학습 요청 전송
      const response = await chrome.runtime.sendMessage({
        action: 'learnFromFailedTests',
        failedTests: failedCasesForLearning
      });

      if (response.success) {
        alert(`✅ ${response.learnedCount || failedTests.length}개의 실패 케이스를 학습했습니다!\n\n이제 AI가 이 명령들을 더 정확하게 분류할 수 있습니다.`);
        console.log(`✅ [ai-settings] Successfully learned from ${response.learnedCount || failedTests.length} failed tests`);
        // 학습 완료 후 현황은 Background 응답에 포함하여 처리 (중복 호출 방지)
        if (response.stats) {
          setLearnedStats(response.stats);
        }
      } else {
        alert(`❌ 학습 중 오류가 발생했습니다: ${response.error}`);
        console.error('❌ [ai-settings] Learning failed:', response.error);
      }
    } catch (error: any) {
      console.error('❌ [ai-settings] Failed to learn from failed tests:', error);
      alert(`❌ 학습 요청 중 오류가 발생했습니다: ${error.message}`);
    }
  };

  const runAutoTest = async (testSetKey: AITestSetKey) => {
    const testSet = AI_TEST_SETS[testSetKey];
    const testCases = testSet.cases;
    
    if (!testCases || testCases.length === 0) {
      alert(`No test cases found for ${testSet.name}.`);
      return;
    }

    setIsTestRunning(true);
    setTestResults(null);
    
    try {
      console.log(`🧪 Starting ${testSet.name} with ${testCases.length} cases...`);
      console.log(`📋 ${testSet.description}`);
      
      const testResults: AITestResult[] = [];
      let totalResponseTime = 0;
      
      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        console.log(`\n🎯 Test ${i + 1}/${testCases.length}: "${testCase.command}"`);
        
        const startTime = performance.now();
        
        try {
          // 디버깅: 메시지 전송 추적
          console.log(`🚀 [AISettings] Sending testAIAnalysis: "${testCase.command}" at ${Date.now()}`);
          const response = await chrome.runtime.sendMessage({
            action: 'testAIAnalysis',
            command: testCase.command,
            source: 'ai-settings-panel',  // 발신지 표시
            timestamp: Date.now()
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
        if (i < testCases.length - 1) {
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
      for (const testCase of testCases) {
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

            {aiModelStatus.state === 3 && (
              <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px'}}>
                {Object.entries(AI_TEST_SETS).map(([key, testSet]) => (
                  <button
                    key={key}
                    className="btn btn-info"
                    onClick={() => runAutoTest(key as AITestSetKey)}
                    disabled={isTestRunning}
                    style={{fontSize: '12px', padding: '6px 12px'}}
                  >
                    {isTestRunning ? '⏳ 테스트 중...' : `🧪 ${testSet.name} (${testSet.cases.length})`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 학습 데이터 현황 표시 */}
          {aiModelStatus.state === 3 && learnedStats && (
            <div className="learning-stats-section" style={{marginTop: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px'}}>
              <h5 style={{margin: '0 0 8px 0', color: '#495057'}}>🧠 학습 데이터 현황</h5>
              <div style={{fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <span><strong>학습된 예시:</strong> {learnedStats.count}개</span>
                  {learnedStats.size > 0 && (
                    <span style={{marginLeft: '15px'}}><strong>파일 크기:</strong> {(learnedStats.size / 1024).toFixed(1)}KB</span>
                  )}
                </div>
                <div>
                  <button 
                    className="btn btn-info"
                    onClick={() => setShowSnapshots(!showSnapshots)}
                    style={{fontSize: '11px', padding: '4px 8px', marginRight: '5px'}}
                  >
                    📸 버전 관리 ({snapshots.length})
                  </button>
                  {learnedStats.count > 0 && (
                    <button 
                      className="btn btn-secondary"
                      onClick={clearLearnedExamples}
                      style={{fontSize: '11px', padding: '4px 8px'}}
                    >
                      🗑️ 초기화
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 버전 관리 패널 */}
          {aiModelStatus.state === 3 && showSnapshots && (
            <div className="snapshots-section" style={{marginTop: '10px', padding: '15px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '5px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                <h5 style={{margin: '0', color: '#495057'}}>📸 학습 데이터 스냅샷</h5>
                <button 
                  className="btn btn-primary"
                  onClick={createManualSnapshot}
                  style={{fontSize: '12px', padding: '5px 10px'}}
                >
                  ➕ 수동 스냅샷 생성
                </button>
              </div>
              
              {snapshots.length === 0 ? (
                <div style={{textAlign: 'center', color: '#6c757d', fontSize: '13px', padding: '20px'}}>
                  생성된 스냅샷이 없습니다.<br />
                  학습 시 자동으로 생성되거나 수동으로 생성할 수 있습니다.
                </div>
              ) : (
                <div style={{maxHeight: '300px', overflowY: 'auto'}}>
                  {snapshots.map((snapshot) => (
                    <div key={snapshot.id} style={{
                      padding: '10px',
                      marginBottom: '8px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '5px'}}>
                        <div style={{flex: 1}}>
                          <div style={{fontWeight: 'bold', color: '#495057'}}>{snapshot.name}</div>
                          <div style={{color: '#6c757d', fontSize: '11px'}}>
                            {snapshot.createdAt.toLocaleString()} • {snapshot.examples.length}개 예시
                          </div>
                          {snapshot.description && (
                            <div style={{color: '#6c757d', fontSize: '11px', marginTop: '3px', fontStyle: 'italic'}}>
                              {snapshot.description}
                            </div>
                          )}
                        </div>
                        <div style={{display: 'flex', gap: '5px'}}>
                          <button
                            className="btn btn-success"
                            onClick={() => rollbackToSnapshot(snapshot.id, snapshot.name)}
                            style={{fontSize: '10px', padding: '2px 6px'}}
                          >
                            ⏪ 복원
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => deleteSnapshot(snapshot.id, snapshot.name)}
                            style={{fontSize: '10px', padding: '2px 6px'}}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      {snapshot.testResults && (
                        <div style={{fontSize: '11px', color: '#28a745'}}>
                          📊 정확도: {snapshot.testResults.accuracy.toFixed(1)}% ({snapshot.testResults.correctTests}/{snapshot.testResults.totalTests})
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                    <h5 style={{color: '#e53e3e', margin: '0'}}>❌ Failed Tests:</h5>
                    <button 
                      className="btn"
                      onClick={() => learnFromFailedTests(testResults.failedTests)}
                      style={{
                        backgroundColor: '#ff8c00',
                        color: 'white',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                    >
                      🧠 실패 케이스로 AI 학습시키기
                    </button>
                  </div>
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
