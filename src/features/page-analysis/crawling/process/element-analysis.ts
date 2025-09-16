import { BoundingBox } from '@/types';

export function isCurrentlyVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  const st = getComputedStyle(el);
  
  return rect.width > 0 && 
         rect.height > 0 && 
         st.visibility !== 'hidden' && 
         st.opacity !== '0';
}

export function roleOf(el: HTMLElement): string {
  if (el.closest("header")) return "header";
  if (el.closest("footer")) return "footer";
  if (el.closest("nav")) return "nav";
  if (el.closest("aside")) return "sidebar";
  if (el.closest("main")) return "main";
  if (el.closest("article")) return "article";
  if (el.closest("section")) return "section";
  return "block";
}

export function bbox(el: HTMLElement): BoundingBox {
  const r = el.getBoundingClientRect();
  
  return {
    top: Math.round(r.top),
    left: Math.round(r.left),
    width: Math.round(r.width),
    height: Math.round(r.height)
  };
}

/**
 * ✨ [신규] 요소의 상태와 행동 가능성을 분석하여 공통으로 사용
 */
export function getElementStateAndActionability(el: HTMLElement) {
  const tag = el.tagName.toLowerCase();
  const role = el.getAttribute('role');

  const isButton = tag === 'button' || role === 'button';
  const isLink = tag === 'a' && el.hasAttribute('href');

  const isDisabled = (el as HTMLButtonElement | HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).disabled || false;

  const state = {
    isDisabled: isDisabled,
    isChecked: (el as HTMLInputElement).checked, // input이 아니면 undefined
    isFocused: document.activeElement === el,
  };

  const isClickable = !isDisabled && (isButton || isLink);
  const isInputtable = !isDisabled && (tag === 'input' || tag === 'textarea');

  return { state, isClickable, isInputtable };
}
