import { useState, useEffect, useRef, useCallback } from 'react';
import { createSpeechEngine } from '../process/speech-engine';

export const useSpeechRecognition = (onCommand: (command: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const speechEngine = useRef(createSpeechEngine());
  const isListeningRef = useRef(isListening);
  const onCommandRef = useRef(onCommand);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  useEffect(() => {
    if (!speechEngine.current.isSupported()) {
      console.error("❌ SpeechRecognition API를 찾을 수 없습니다.");
      setError('not-supported');
    }
  }, []);

  const handleResult = useCallback((transcript: string, isFinal: boolean) => {
    if (isFinal) {
      console.log("🎤 Final transcript:", transcript.trim());
      onCommandRef.current(transcript.trim());
      setTranscribedText('');
    } else {
      setTranscribedText(transcript);
    }
  }, []);

  const handleError = useCallback((errorMessage: string) => {
    console.error("🚨 음성 인식 오류:", errorMessage);
    setError(errorMessage);
    if (errorMessage === 'not-allowed') {
      setIsListening(false);
    }
  }, []);

  const handleEnd = useCallback(() => {
    console.log("🎤 Recognition ended, restarting if still listening:", isListeningRef.current);
    if (isListeningRef.current) {
      const success = speechEngine.current.startListening(handleResult, handleError, handleEnd);
      if (!success) {
        setIsListening(false);
      }
    }
  }, [handleResult, handleError]);

  const toggleListening = useCallback(() => {
    const newIsListening = !isListening;
    setIsListening(newIsListening);

    if (newIsListening) {
      setError(null);
      setTranscribedText('');
      const success = speechEngine.current.startListening(handleResult, handleError, handleEnd);
      if (!success) {
        setIsListening(false);
      }
    } else {
      speechEngine.current.stopListening();
    }
  }, [isListening, handleResult, handleError, handleEnd]);

  return { 
    transcribedText, 
    isListening, 
    toggleListening, 
    error 
  };
};