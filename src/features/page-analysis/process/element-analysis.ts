import { BoundingBox } from '../../../types';

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