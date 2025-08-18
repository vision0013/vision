import { useState, useEffect, useRef, useCallback } from 'react';
import { createSpeechEngine } from '../process/speech-engine';

export const useSpeechRecognition = (onCommand: (command: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const speechEngine = useRef(createSpeechEngine());
  const isListeningRef = useRef(isListening);
  const onCommandRef = useRef(onCommand);
  
  // 결과 병합을 위한 상태
  const commandBuffer = useRef('');
  const lastResultTime = useRef(0);
  const COMMAND_MERGE_DELAY = 2000; // 2초로 연장
  const mergeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    const now = Date.now();
    
    if (isFinal) {
      const trimmedTranscript = transcript.trim();
      console.log("🎤 Final transcript:", trimmedTranscript);
      
      // 이전 결과와 시간 간격 확인
      if (commandBuffer.current && (now - lastResultTime.current < COMMAND_MERGE_DELAY)) {
        // 병합
        const mergedCommand = `${commandBuffer.current} ${trimmedTranscript}`.trim();
        console.log("🔗 Merging commands:", commandBuffer.current, "+", trimmedTranscript, "=", mergedCommand);
        
        // 기존 타이머 취소
        if (mergeTimeoutRef.current) {
          clearTimeout(mergeTimeoutRef.current);
          mergeTimeoutRef.current = null;
        }
        
        commandBuffer.current = '';
        onCommandRef.current(mergedCommand);
      } else {
        // 기존 타이머 취소
        if (mergeTimeoutRef.current) {
          clearTimeout(mergeTimeoutRef.current);
        }
        
        // 새로운 명령어 시작 - 버퍼에 저장하고 잠시 대기
        commandBuffer.current = trimmedTranscript;
        lastResultTime.current = now;
        
        // 2초 후 버퍼가 그대로 남아있으면 단독 명령으로 처리
        mergeTimeoutRef.current = setTimeout(() => {
          if (commandBuffer.current === trimmedTranscript) {
            console.log("🎤 Single command:", commandBuffer.current);
            onCommandRef.current(commandBuffer.current);
            commandBuffer.current = '';
          }
          mergeTimeoutRef.current = null;
        }, COMMAND_MERGE_DELAY);
      }
      
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