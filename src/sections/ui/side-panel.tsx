import React, { useState } from 'react';
import './side-panel.css';
import { useSidePanelController } from '../../features';
import { TranscriptionDisplay } from '../../features';
import { FilterControls } from '../../features';
import { PermissionsError } from '../../features';
import { Header } from './extension-header';
import { Stats } from './crawling-summary';
import { ResultsList } from './crawling-results';

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
    // Markdown related from controller
    markdownContent,
    pageTitle,
    isExtracting,
    onExtract,
    onDownload,
  } = useSidePanelController();
  
  const [activeTab, setActiveTab] = useState('crawler'); // 'crawler' or 'markdown'

  if (!analysisResult) {
    return <div className="app" style={{ padding: '20px', textAlign: 'center' }}>Loading page data...</div>;
  }
  
  return (
    <div className="app">
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

      {/* TAB BUTTONS */}
      <div className="tab-container">
        <button onClick={() => setActiveTab('crawler')} className={`tab-button ${activeTab === 'crawler' ? 'active' : ''}`}>
          크롤링
        </button>
        <button onClick={() => setActiveTab('markdown')} className={`tab-button ${activeTab === 'markdown' ? 'active' : ''}`}>
          마크다운 저장
        </button>
      </div>

      {/* CRAWLER TAB CONTENT */}
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

      {/* MARKDOWN TAB CONTENT */}
      {activeTab === 'markdown' && (
        <div className="tab-content" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <button onClick={onExtract} className="btn btn-primary" disabled={isExtracting}>
              {isExtracting ? '추출 중...' : '본문 전체 추출'}
            </button>
          </div>
          {pageTitle && <h3 style={{fontSize: '16px', marginBottom: '8px', color: '#333'}}>{pageTitle}</h3>} 
          <textarea 
            readOnly 
            value={markdownContent} 
            style={{width: '100%', height: '100%', flex: 1, resize: 'none', padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}
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