// Controllers
export { 
  startDynamicObserver, 
  stopDynamicObserver 
} from './controllers/dynamic-observer-controller';

// Types
export type { 
  ObserverState, 
  DetectionResult, 
  ScanResult 
} from './types/observer-types';

// Process functions (if needed externally)
export { 
  detectElementMoves, 
  detectPortalNavigationChanges 
} from './process/mutation-detector';

export { 
  scanChildrenWithoutIds, 
  walkSingleElement 
} from './process/element-scanner';

export { 
  processMutations 
} from './process/mutation-handler';