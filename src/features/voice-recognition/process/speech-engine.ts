import { CustomSpeechRecognition, SpeechRecognitionEvent } from '../types/speech-types';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export function createSpeechEngine() {
  let recognition: CustomSpeechRecognition | null = null;

  const isSupported = (): boolean => {
    return !!SpeechRecognition;
  };

  const createRecognition = (): CustomSpeechRecognition | null => {
    if (!isSupported()) {
      return null;
    }

    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'ko-KR';
    
    return recognitionInstance;
  };

  const startListening = (
    onResult: (transcript: string, isFinal: boolean) => void,
    onError: (error: string) => void,
    onEnd: () => void
  ): boolean => {
    if (!isSupported()) {
      onError('Speech Recognition is not supported in this browser');
      return false;
    }

    try {
      recognition = createRecognition();
      if (!recognition) {
        onError('Failed to create Speech Recognition instance');
        return false;
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const results = event.results;
        const lastResult = results[results.length - 1];
        const transcript = lastResult[0].transcript;
        const isFinal = lastResult.isFinal;
        
        onResult(transcript, isFinal);
      };

      recognition.onerror = (event: SpeechRecognitionEvent) => {
        onError(event.error || 'Speech recognition error occurred');
      };

      recognition.onend = onEnd;

      recognition.start();
      return true;
    } catch (error) {
      onError(`Failed to start speech recognition: ${error}`);
      return false;
    }
  };

  const stopListening = (): void => {
    if (recognition) {
      recognition.stop();
      recognition = null;
    }
  };

  return {
    isSupported,
    startListening,
    stopListening
  };
}