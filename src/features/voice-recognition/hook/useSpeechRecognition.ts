import { useState, useEffect, useRef, useCallback } from 'react';

// --- 타입 정의 ---
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
  readonly error?: string;
}
interface CustomSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
}
interface SpeechRecognitionStatic {
  new(): CustomSpeechRecognition;
}
declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionStatic;
    webkitSpeechRecognition: SpeechRecognitionStatic;
  }
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export const useSpeechRecognition = (onCommand: (command: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [error, setError] = useState<string | null>(null); // 에러 상태
  const recognitionRef = useRef<CustomSpeechRecognition | null>(null);
  const isListeningRef = useRef(isListening);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const onCommandRef = useRef(onCommand);
  
  // onCommand가 변경될 때마다 ref 업데이트
  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  useEffect(() => {
    if (!SpeechRecognition) {
      console.error("❌ SpeechRecognition API를 찾을 수 없습니다.");
      setError('not-supported');
      return;
    }

    console.log("🎤 Creating new SpeechRecognition instance");
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ko-KR';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setTranscribedText(interimTranscript);
      if (finalTranscript) {
        console.log("🎤 Final transcript:", finalTranscript.trim());
        onCommandRef.current(finalTranscript.trim()); // ref를 통해 호출
      }
    };
    
    recognition.onerror = (event: SpeechRecognitionEvent) => {
      console.error("🚨 'onerror' 이벤트 발생: 음성 인식 오류", event.error);
      setError(event.error || 'unknown-error');
      if (event.error === 'not-allowed') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      console.log("🎤 Recognition ended, restarting if still listening:", isListeningRef.current);
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.error("🚨 Failed to restart recognition:", e);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      console.log("🎤 Cleaning up SpeechRecognition");
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    };
  }, []); // 의존성 제거로 한 번만 생성

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
        return;
    }

    const newIsListening = !isListening;
    setIsListening(newIsListening);

    if (newIsListening) {
      setError(null); // 인식 시작 시 에러 초기화
      setTranscribedText('');
      recognitionRef.current.start();
    } else {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  // 반환 값에 'error'를 포함합니다.
  return { transcribedText, isListening, toggleListening, error };
};
