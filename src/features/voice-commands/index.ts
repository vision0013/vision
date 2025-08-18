// Voice Commands Barrel Exports

// Controller
export { processVoiceCommand } from './controllers/voice-controller';
export type { VoiceCommandResult } from './types/voice-types';

// Process Functions  
export { clickAction } from './process/click-action';
export { findAction } from './process/find-action';
export { inputAction } from './process/input-action';
export { scrollAction } from './process/scroll-action';
export { navigationAction } from './process/navigation-action';
export { findBestMatch, findExactMatch } from './process/element-matcher';
export { selectBestMatch, calculateScore } from './process/priority-resolver';