/**
 * 이 파일은 voice-commands 기능의 진입점 역할을 합니다.
 * 외부 모듈(예: content_script)에서는 이 파일을 통해 필요한 함수를 import 합니다.
 */

// ✨ [수정] 개별 액션 함수 대신, 모든 것을 관장하는 processVoiceCommand 함수를 내보냅니다.
export { processVoiceCommand, processAIVoiceCommand } from './controllers/voice-controller';

// ✨ [수정] 개별 액션 함수들은 더 이상 외부로 직접 노출할 필요가 없으므로 주석 처리하거나 삭제합니다.
/*
export { clickAction } from './process/click-action';
export { findAction } from './process/find-action';
export { scrollAction } from './process/scroll-action';
export { inputAction } from './process/input-action';
export { navigationAction } from './process/navigation-action';
*/
