import React from 'react';

interface TranscriptionDisplayProps {
  isListening: boolean;
  transcribedText: string;
}

export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({ isListening, transcribedText }) => {
  if (!isListening) {
    return null;
  }

  return (
    <div className="transcription-box">
      <p className="transcription-label">인식된 텍스트:</p>
      <p className="transcription-text">{transcribedText || '음성을 기다리는 중...'}</p>
    </div>
  );
};