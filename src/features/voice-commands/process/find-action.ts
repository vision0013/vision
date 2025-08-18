import { CrawledItem } from "../../../types";
import { VoiceCommandResult } from "../types/voice-types";
import { applyHighlightToElement } from "../../highlighting";
import { findBestMatch } from "./element-matcher";

export const findAction = (
  targetText: string, 
  items: CrawledItem[]
): VoiceCommandResult => {
  const foundItem = findBestMatch(targetText, items);
  
  if (foundItem?.ownerId) {
    const element = document.querySelector(`[data-crawler-id="${foundItem.ownerId}"]`) as HTMLElement;
    if (element) {
      applyHighlightToElement(element);
      return { type: "element_found", ownerId: foundItem.ownerId };
    }
  }
  return { type: "not_found" };
};