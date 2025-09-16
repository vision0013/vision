import React, { useState } from 'react';
import './side-panel.css';
import { useSidePanelController } from '../../features';
import { TranscriptionDisplay } from '../../features';
import { FilterControls } from '../../features';
import { PermissionsError } from '../../features';
import { Header } from './extension-header';
import { Stats } from './crawling-summary';
import { ResultsList } from './crawling-results';

const LoadingSpinner: React.FC = () => (
  <div className="spinner-container">
    <div className="spinner"></div>
    <p>AI가 계획을 세우고 있습니다...</p>
  </div>
);

const SidePanel: React.FC = () => {
  const {
    analysisResult,
    recognitionError,
    filter,
    onFilterChange,
    searchTerm,
    onSearchTermChange,
    filteredItems,
    onItemClick,
    isListening,
    transcribedText,
    onToggleListening,
    onExportData,
    activeElementId,
    markdownContent,
    pageTitle,
    isExtracting,
    onExtract,
    onDownload,
    // ✨ [복구 및 추가]
    isLoading,
    mode,
    onModeChange,
  } = useSidePanelController();
  
  const [activeTab, setActiveTab] = useState('crawler');

  if (!analysisResult) {
    return <div className="app" style={{ padding: '20px', textAlign: 'center' }}>Loading page data...</div>;
  }
  
  return (
    <div className="app">
      {/* ✨ [복구 및 추가] isLoading이 true일 때 전체 화면에 스피너 표시 */}
      {isLoading && <LoadingSpinner />}

      <Header
        isListening={isListening}
        onToggleListening={onToggleListening}
        onExportData={onExportData}
        hasAnalysisResult={!!analysisResult}
      />
      
      {recognitionError === 'not-allowed' && <PermissionsError />}
      
      <TranscriptionDisplay
        isListening={isListening}
        transcribedText={transcribedText}
      />

      {/* ✨ [신규] 모드 전환 UI */}
      <div className="mode-switcher">
        <button 
          onClick={() => onModeChange('navigate')} 
          className={`mode-button ${mode === 'navigate' ? 'active' : ''}`}>
          탐색 모드
        </button>
        <button 
          onClick={() => onModeChange('search')} 
          className={`mode-button ${mode === 'search' ? 'active' : ''}`}>
          검색 모드
        </button>
      </div>

      {/* ✨ [복구] 기존 탭 버튼 UI */}
      <div className="tab-container">
        <button onClick={() => setActiveTab('crawler')} className={`tab-button ${activeTab === 'crawler' ? 'active' : ''}`}>
          크롤링
        </button>
        <button onClick={() => setActiveTab('markdown')} className={`tab-button ${activeTab === 'markdown' ? 'active' : ''}`}>
          마크다운 저장
        </button>
      </div>

      {/* ✨ [복구] 크롤러 탭 컨텐츠 */}
      {activeTab === 'crawler' && (
        <div className="tab-content">
          <Stats analysisResult={analysisResult} />
          <FilterControls
            filter={filter}
            onFilterChange={onFilterChange}
            searchTerm={searchTerm}
            onSearchTermChange={onSearchTermChange}
          />
          <ResultsList
            items={filteredItems}
            onItemClick={onItemClick}
            activeElementId={activeElementId}
          />
        </div>
      )}

      {/* ✨ [복구] 마크다운 탭 컨텐츠 */}
      {activeTab === 'markdown' && (
        <div className="tab-content" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <button onClick={onExtract} className="btn btn-primary" disabled={isExtracting}>
              {isExtracting ? '추출 중...' : '본문 전체 추출'}
            </button>
          </div>
          {pageTitle && <h3 style={{fontSize: '16px'}}>{pageTitle}</h3>} 
          <textarea 
            readOnly 
            value={markdownContent} 
            style={{width: '100%', flex: 1, resize: 'none'}}
            placeholder="여기에 추출된 마크다운 내용이 표시됩니다."
          />
          <div>
            <button onClick={onDownload} className="btn btn-secondary" disabled={!markdownContent || isExtracting}>
              마크다운 다운로드
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SidePanel;