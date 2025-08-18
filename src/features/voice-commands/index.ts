// Voice Commands Barrel Exports

// Controller
export { processVoiceCommand } from './controllers/voice-controller';
export type { VoiceCommandResult } from './types/voice-types';

// Process Functions  
export { clickAction } from './process/click-action';
export { findAction } from './process/find-action';
export { findBestMatch, findExactMatch } from './process/element-matcher';
export { selectBestMatch, calculateScore } from './process/priority-resolver';