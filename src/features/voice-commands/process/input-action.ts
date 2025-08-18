import { CrawledItem } from "../../../types";
import { VoiceCommandResult } from "../types/voice-types";
import { findBestMatch } from "./element-matcher";

export const inputAction = (
  targetText: string, 
  items: CrawledItem[]
): VoiceCommandResult => {
  // 입력할 텍스트와 타겟 요소 분리
  let inputText = '';
  let targetElement = targetText;
  
  // "입력창에 안녕하세요 써줘" 같은 패턴 분석
  const inputPatterns = [
    /(.+)에\s*(.+)\s*(써줘|써|입력|타이핑)/,
    /(.+)\s*(써줘|써|입력|타이핑)\s*(.+)/,
    /(써줘|써|입력|타이핑)\s*(.+)/
  ];
  
  for (const pattern of inputPatterns) {
    const match = targetText.match(pattern);
    if (match) {
      if (pattern.source.includes('에')) {
        targetElement = match[1];
        inputText = match[2];
      } else if (match.length === 4) {
        targetElement = match[1];
        inputText = match[3];
      } else {
        inputText = match[2];
        targetElement = '입력'; // 기본값
      }
      break;
    }
  }
  
  // 타겟 요소가 없으면 일반적인 입력 필드 찾기
  if (!targetElement || targetElement === targetText) {
    targetElement = '입력';
  }
  
  // 입력 가능한 요소 우선 검색
  const inputTypes = ['input', 'textarea', 'select'];
  let foundElement: HTMLElement | null = null;
  
  // 1. 특정 타겟 요소 찾기
  if (targetElement !== '입력') {
    const foundItem = findBestMatch(targetElement, items);
    if (foundItem?.ownerId) {
      const element = document.querySelector(`[data-crawler-id="${foundItem.ownerId}"]`) as HTMLElement;
      if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.contentEditable === 'true')) {
        foundElement = element;
      }
    }
  }
  
  // 2. 일반적인 입력 필드 찾기
  if (!foundElement) {
    // 먼저 포커스된 요소 확인
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      foundElement = activeElement;
    } else {
      // inputTypes를 활용하여 입력 필드 찾기
      const selectors = inputTypes.map(type => 
        type === 'input' ? 'input:not([type]), input[type="text"]' :
        type === 'textarea' ? 'textarea' :
        `input[type="${type}"]`
      ).join(', ');
      foundElement = document.querySelector(selectors) as HTMLElement;
    }
  }
  
  if (foundElement) {
    // 요소로 스크롤하고 포커스
    foundElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    foundElement.focus();
    
    // 텍스트 입력
    if (inputText) {
      if (foundElement.tagName === 'INPUT' || foundElement.tagName === 'TEXTAREA') {
        (foundElement as HTMLInputElement).value = inputText;
        // input 이벤트 발생시켜 React 등의 프레임워크에서 감지하도록
        foundElement.dispatchEvent(new Event('input', { bubbles: true }));
        foundElement.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (foundElement.contentEditable === 'true') {
        foundElement.textContent = inputText;
      }
    }
    
    // ownerId 찾기
    const ownerIdAttr = foundElement.getAttribute('data-crawler-id');
    if (ownerIdAttr) {
      return { type: "element_found", ownerId: parseInt(ownerIdAttr) };
    }
  }
  
  return { type: "not_found", message: "입력 가능한 요소를 찾을 수 없습니다" };
};