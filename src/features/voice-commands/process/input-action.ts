import { CrawledItem } from "../../../types";
import { VoiceCommandResult } from "../types/voice-types";
import { findBestMatch } from "./element-matcher";

export const inputAction = (
  targetText: string, 
  items: CrawledItem[]
): VoiceCommandResult => {
  // 입력할 텍스트와 타겟 요소 분리
  let inputText = '';
  let targetElement = '';
  
  console.log('🔍 inputAction analyzing:', targetText);
  
  const inputPatterns = [
    /(.+)에\s*(.+?)\s*(써줘|써|입력해줘|입력|타이핑)/,
    /^(.+?)\s*(써줘|써|입력해줘|입력|타이핑)$/,
    /^(써줘|써|입력해줘|입력|타이핑)\s*(.+)$/
  ];
  
  for (const pattern of inputPatterns) {
    const match = targetText.match(pattern);
    if (match) {
      console.log('🎯 Pattern matched:', pattern.source, 'with groups:', match);
      
      if (pattern.source.includes('에')) {
        targetElement = match[1];
        inputText = match[2];
      } else if (pattern.source.startsWith('^(.+?)')) {
        inputText = match[1];
        targetElement = '';
      } else {
        inputText = match[2];
        targetElement = '';
      }
      
      console.log('📝 Extracted - inputText:', inputText, 'targetElement:', targetElement);
      break;
    }
  }
  
  if (!inputText) {
    inputText = targetText;
    targetElement = '';
    console.log('⚠️ No pattern matched, using full text as input:', inputText);
  }
  
  let foundElement: HTMLElement | null = null;
  
  if (targetElement && targetElement.trim()) {
    console.log('🎯 Looking for specific target element:', targetElement);
    // ✨ [수정] findBestMatch 호출 시 direction 인수로 null 전달
    const foundItem = findBestMatch(targetElement, items, null); 
    if (foundItem?.ownerId) {
      const element = document.querySelector(`[data-crawler-id="${foundItem.ownerId}"]`) as HTMLElement;
      if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.contentEditable === 'true')) {
        foundElement = element;
        console.log('✅ Found specific target element:', element.tagName);
      }
    }
  }
  
  if (!foundElement) {
    console.log('🔍 Looking for general input field...');
    
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      foundElement = activeElement;
      console.log('✅ Using focused element:', activeElement.tagName);
    } else {
      const selectors = [
        'input:not([type])', 
        'input[type="text"]', 
        'input[type="search"]',
        'input[type="email"]',
        'input[type="password"]',
        'textarea'
      ].join(', ');
      
      foundElement = document.querySelector(selectors) as HTMLElement;
      if (foundElement) {
        console.log('✅ Found input field by selector:', foundElement.tagName, (foundElement as HTMLInputElement).type || 'textarea');
      }
    }
  }
  
  if (foundElement) {
    console.log('✅ Input element found, proceeding with input...');
    
    foundElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    foundElement.focus();
    
    const cleanInputText = inputText
      .replace(/(써줘|써|입력해줘|입력|타이핑|해줘|주세요|줄)/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('📝 Clean input text:', cleanInputText);
    
    if (cleanInputText) {
      if (foundElement.tagName === 'INPUT' || foundElement.tagName === 'TEXTAREA') {
        (foundElement as HTMLInputElement).value = cleanInputText;
        foundElement.dispatchEvent(new Event('input', { bubbles: true }));
        foundElement.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('✅ Text input completed:', cleanInputText);
      } else if (foundElement.contentEditable === 'true') {
        foundElement.textContent = cleanInputText;
        console.log('✅ ContentEditable text set:', cleanInputText);
      }
    }
    
    const ownerIdAttr = foundElement.getAttribute('data-crawler-id');
    if (ownerIdAttr) {
      return { type: "element_found", ownerId: parseInt(ownerIdAttr) };
    } else {
      console.log('⚠️ Element found but no ownerId attribute');
      return { type: "element_found", ownerId: -1 };
    }
  }
  
  console.log('❌ No input element found');
  return { type: "not_found", message: "입력 가능한 요소를 찾을 수 없습니다" };
};
