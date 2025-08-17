import React from 'react';
import { AnalysisResult } from '../../types';

interface StatsProps {
  analysisResult: AnalysisResult;
}

export const Stats: React.FC<StatsProps> = ({ analysisResult }) => {
  return (
    <div className="stats">
      <div className="stat">
        <span className="stat-label">URL:</span>
        <span className="stat-value">{analysisResult.url}</span>
      </div>
      <div className="stat">
        <span className="stat-label">Items:</span>
        <span className="stat-value">{analysisResult.items.length}</span>
      </div>
      <div className="stat">
        <span className="stat-label">Time:</span>
        <span className="stat-value">{analysisResult.elapsedMs}ms</span>
      </div>
      <div className="stat">
        <span className="stat-label">Nodes visited:</span>
        <span className="stat-value">{analysisResult.visited}</span>
      </div>
    </div>
  );
};