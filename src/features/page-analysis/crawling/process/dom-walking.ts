import { CrawledItem } from '@/types';
import { MAX_NODES, TARGET_TAGS, SKIP_TAGS, IFRAME_TAGS } from '../../crawling/config/constants';
import { CrawlerState } from '../types/crawler-state';
import { normText } from './text-processing';
import { isCurrentlyVisible, roleOf, bbox, getElementStateAndActionability } from './element-analysis';
import { coordinateTransformer } from './coordinate-transformer';



/**
 * DOM 요소를 재귀적으로 탐색하여 크롤링 아이템을 생성합니다.
 */
export function walkElement(
  el: Element, 
  state: CrawlerState, 
  parentElId: number | null = null, 
  isDescendantOfLink: boolean = false,
  isDescendantOfButton: boolean = false
): void {
  if (!(el instanceof HTMLElement)) return;
  if (state.elIdMap.has(el)) return;

  state.visited++;
  if (state.visited > MAX_NODES) return;

  const tag = el.tagName.toLowerCase();
  if (SKIP_TAGS.has(tag)) return;
  if (getComputedStyle(el).display === 'none') return;

  const ownerId = state.nextElementId++;
  state.elIdMap.set(el, ownerId);
  el.setAttribute('data-crawler-id', ownerId.toString());

  let elementRect = bbox(el);
  if (coordinateTransformer.needsTransformation(el)) {
    const parentIframe = coordinateTransformer.findParentIframe(el);
    if (parentIframe) {
      elementRect = coordinateTransformer.transformIframeElementCoordinates(el, parentIframe);
    }
  }

  // ✨ [신규] 요소의 상태와 행동 가능성 정보 추출
  const { state: elementState, isClickable, isInputtable } = getElementStateAndActionability(el);

  const meta = {
    tag,
    role: roleOf(el),
    rect: elementRect,
    parentId: parentElId,
  };

  if (IFRAME_TAGS.has(tag)) {
    // ... (iframe 처리 로직은 기존과 동일) ...
    return;
  }
  state.elMeta.set(ownerId, meta);

  const isTarget = TARGET_TAGS.has(tag);
  const isLink = tag === 'a';
  const isButton = tag === 'button' || meta.role === 'button';

  if (isTarget) {
      const isVisible = isCurrentlyVisible(el);
      
      if (tag === "img") {
          state.items.push({ 
            id: state.nextItemId++, ownerId, parentId: parentElId, tag, role: meta.role, rect: meta.rect, 
            type: "image", 
            alt: normText(el.getAttribute("alt")),
            title: normText(el.getAttribute("title")),
            src: el.getAttribute("src") || "",
            hidden: !isVisible,
            state: elementState, isClickable, isInputtable
          });
      }

      if (isLink) {
          state.items.push({ 
            id: state.nextItemId++, ownerId, parentId: parentElId, tag, role: meta.role, rect: meta.rect, 
            type: "link", 
            href: el.getAttribute("href") || "", 
            text: normText(el.textContent),
            hidden: !isVisible,
            state: elementState, isClickable, isInputtable
          });
      }

      if (isButton) {
          state.items.push({ 
            id: state.nextItemId++, ownerId, parentId: parentElId, tag, role: meta.role, rect: meta.rect, 
            type: "button", 
            label: normText(el.getAttribute("aria-label") || el.textContent || "") || "(no label)",
            hidden: !isVisible,
            state: elementState, isClickable, isInputtable
          });
      }

      if (tag === "input") {
          const input = el as HTMLInputElement;
          state.items.push({ 
            id: state.nextItemId++, ownerId, parentId: parentElId, tag, role: meta.role, rect: meta.rect, 
            type: "input", 
            inputType: input.type || "text",
            placeholder: normText(input.placeholder || ""),
            label: normText(el.getAttribute("aria-label") || input.name || "") || normText(input.placeholder || "") || `[${input.type} input]`,
            hidden: !isVisible,
            state: elementState, isClickable, isInputtable
          });
      }

      if (tag === "textarea") {
          const textarea = el as HTMLTextAreaElement;
          state.items.push({ 
            id: state.nextItemId++, ownerId, parentId: parentElId, tag, role: meta.role, rect: meta.rect, 
            type: "textarea", 
            placeholder: normText(textarea.placeholder || ""),
            label: normText(el.getAttribute("aria-label") || textarea.name || "") || normText(textarea.placeholder || "") || "[textarea]",
            hidden: !isVisible,
            state: elementState, isClickable, isInputtable
          });
      }

      if (tag === "select") {
          const select = el as HTMLSelectElement;
          state.items.push({ 
            id: state.nextItemId++, ownerId, parentId: parentElId, tag, role: meta.role, rect: meta.rect, 
            type: "select", 
            label: normText(el.getAttribute("aria-label") || select.name || "") || "[select]",
            hidden: !isVisible,
            state: elementState, isClickable, isInputtable
          });
      }

      if (!isLink && !isDescendantOfLink && !isButton && !isDescendantOfButton) {
          for (const node of el.childNodes) {
              if (node.nodeType === Node.TEXT_NODE) {
                  const t = normText(node.nodeValue || "");
                  if (t) {
                      state.items.push({ 
                        id: state.nextItemId++, ownerId, parentId: parentElId, tag, role: meta.role, rect: meta.rect, 
                        type: "text", 
                        text: t,
                        hidden: !isVisible,
                        state: elementState, isClickable, isInputtable
                      });
                  }
              }
          }
      }
  }

  for (const child of el.children) {
    if (state.visited > MAX_NODES) break;
    walkElement(child, state, ownerId, isLink || isDescendantOfLink, isButton || isDescendantOfButton);
  }
}

export function removeDuplicates(itemsToProcess: CrawledItem[]): CrawledItem[] {
  const keep: CrawledItem[] = [];
  const seen = new Set<string>();

  for (const item of itemsToProcess) {
    if (item.hidden) {
      keep.push(item);
      continue;
    }
    
    const key = `${item.type}|${item.text || item.label || item.href}|${Math.round(item.rect.left / 10)}|${Math.round(item.rect.top / 10)}`;
    
    if (!seen.has(key)) {
      keep.push(item);
      seen.add(key);
    }
  }
  return keep;
}