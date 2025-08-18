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
  
  // "안녕하세요 써줘", "입력창에 안녕하세요 써줘" 같은 패턴 분석
  const inputPatterns = [
    // "입력창에 안녕하세요 써줘" - 타겟 + 텍스트 + 명령어
    /(.+)에\s*(.+?)\s*(써줘|써|입력해줘|입력|타이핑)/,
    // "안녕하세요 써줘" - 텍스트 + 명령어 (가장 일반적)
    /^(.+?)\s*(써줘|써|입력해줘|입력|타이핑)$/,
    // "써줘 안녕하세요" - 명령어 + 텍스트
    /^(써줘|써|입력해줘|입력|타이핑)\s*(.+)$/
  ];
  
  for (const pattern of inputPatterns) {
    const match = targetText.match(pattern);
    if (match) {
      console.log('🎯 Pattern matched:', pattern.source, 'with groups:', match);
      
      if (pattern.source.includes('에')) {
        // "입력창에 안녕하세요 써줘"
        targetElement = match[1];
        inputText = match[2];
      } else if (pattern.source.startsWith('^(.+?)')) {
        // "안녕하세요 써줘"
        inputText = match[1];
        targetElement = ''; // 일반 입력 필드 사용
      } else {
        // "써줘 안녕하세요"
        inputText = match[2];
        targetElement = ''; // 일반 입력 필드 사용
      }
      
      console.log('📝 Extracted - inputText:', inputText, 'targetElement:', targetElement);
      break;
    }
  }
  
  // 패턴 매칭 실패시 전체를 입력 텍스트로 사용
  if (!inputText) {
    inputText = targetText;
    targetElement = '';
    console.log('⚠️ No pattern matched, using full text as input:', inputText);
  }
  
  // 입력 가능한 요소 우선 검색
  let foundElement: HTMLElement | null = null;
  
  // 1. 특정 타겟 요소 찾기 (타겟이 지정된 경우만)
  if (targetElement && targetElement.trim()) {
    console.log('🎯 Looking for specific target element:', targetElement);
    const foundItem = findBestMatch(targetElement, items);
    if (foundItem?.ownerId) {
      const element = document.querySelector(`[data-crawler-id="${foundItem.ownerId}"]`) as HTMLElement;
      if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.contentEditable === 'true')) {
        foundElement = element;
        console.log('✅ Found specific target element:', element.tagName);
      }
    }
  }
  
  // 2. 일반적인 입력 필드 찾기
  if (!foundElement) {
    console.log('🔍 Looking for general input field...');
    
    // 먼저 포커스된 요소 확인
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      foundElement = activeElement;
      console.log('✅ Using focused element:', activeElement.tagName);
    } else {
      // inputTypes를 활용하여 입력 필드 찾기
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
    
    // 요소로 스크롤하고 포커스
    foundElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    foundElement.focus();
    
    // 명령어 키워드 제거하여 순수한 입력 텍스트만 추출
    const cleanInputText = inputText
      .replace(/(써줘|써|입력해줘|입력|타이핑|해줘|주세요|줄)/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('📝 Clean input text:', cleanInputText);
    
    // 텍스트 입력
    if (cleanInputText) {
      if (foundElement.tagName === 'INPUT' || foundElement.tagName === 'TEXTAREA') {
        (foundElement as HTMLInputElement).value = cleanInputText;
        // input 이벤트 발생시켜 React 등의 프레임워크에서 감지하도록
        foundElement.dispatchEvent(new Event('input', { bubbles: true }));
        foundElement.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('✅ Text input completed:', cleanInputText);
      } else if (foundElement.contentEditable === 'true') {
        foundElement.textContent = cleanInputText;
        console.log('✅ ContentEditable text set:', cleanInputText);
      }
    }
    
    // ownerId 찾기
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