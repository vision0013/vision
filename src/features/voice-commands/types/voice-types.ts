export type VoiceCommandResult = 
  | { type: "element_found"; ownerId: number }
  | { type: "scroll_executed"; direction: string }
  | { type: "navigation_executed"; action: string }
  | { type: "not_found"; message?: string }; // message 추가

export interface VoiceProcessorState {
  highlightManager: any; // HighlightManager 타입 (임시로 any)
}