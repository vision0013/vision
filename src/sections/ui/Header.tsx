import React from 'react';

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
  return (
    <header className="header">
      <h1>Page Crawler</h1>
      <div className="controls">
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
  );
};