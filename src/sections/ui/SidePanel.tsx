/* domains/side-panel/sections/ui/SidePanel.tsx
*/
import React from 'react';
import './SidePanel.css';
import { useSidePanelController } from '../../features';
import { TranscriptionDisplay } from '../../features';
import { FilterControls } from '../../features';
import { PermissionsError } from '../../features';
import { Header } from './Header';
import { Stats } from './Stats';
import { ResultsList } from './ResultsList';

const SidePanel: React.FC = () => {
  const {
    analysisResult,
    recognitionError, // 컨트롤러에서 에러 상태를 받아옵니다.
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
  } = useSidePanelController();

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
      
      {/* 에러 상태에 따라 PermissionsError 컴포넌트를 조건부 렌더링합니다. */}
      {recognitionError === 'not-allowed' && <PermissionsError />}
      
      <TranscriptionDisplay
        isListening={isListening}
        transcribedText={transcribedText}
      />

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
      />
    </div>
  );
}

export default SidePanel;