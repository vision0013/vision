import { CrawledItem } from '@/types';
import { MAX_NODES, TARGET_TAGS, SKIP_TAGS, IFRAME_TAGS } from '../../crawling/config/constants';
import { CrawlerState } from '../types/crawler-state';
import { normText } from './text-processing';
import { getElementStateAndActionability, isCurrentlyVisible, roleOf, bbox } from './element-analysis';
import { coordinateTransformer } from './coordinate-transformer';

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

  // ✨ [수정] ownerId를 유일한 ID로 사용
  const id = state.nextElementId++;
  state.elIdMap.set(el, id);
  el.setAttribute('data-crawler-id', id.toString());

  let elementRect = bbox(el);
  if (coordinateTransformer.needsTransformation(el)) {
    const parentIframe = coordinateTransformer.findParentIframe(el);
    if (parentIframe) {
      elementRect = coordinateTransformer.transformIframeElementCoordinates(el, parentIframe);
    }
  }

  const { state: elementState, isClickable, isInputtable } = getElementStateAndActionability(el);

  const meta = {
    tag,
    role: roleOf(el),
    rect: elementRect,
    parentId: parentElId,
  };

  if (IFRAME_TAGS.has(tag)) {
    // ... iframe 로직 ...
    return;
  }
  state.elMeta.set(id, meta);

  const isTarget = TARGET_TAGS.has(tag);
  const isLink = tag === 'a';
  const isButton = tag === 'button' || meta.role === 'button';

  if (isTarget) {
      const isVisible = isCurrentlyVisible(el);
      const commonProps = { id, ownerId: id, parentId: parentElId, tag, role: meta.role, rect: meta.rect, hidden: !isVisible, state: elementState, isClickable, isInputtable };

      if (tag === "img") {
          state.items.push({ 
            ...commonProps, type: "image", 
            alt: normText(el.getAttribute("alt")),
            title: normText(el.getAttribute("title")),
            src: el.getAttribute("src") || ""
          });
      }

      if (isLink) {
          state.items.push({ 
            ...commonProps, type: "link", 
            href: el.getAttribute("href") || "", 
            text: normText(el.textContent)
          });
      }

      if (isButton) {
          state.items.push({ 
            ...commonProps, type: "button", 
            label: normText(el.getAttribute("aria-label") || el.textContent || "") || "(no label)"
          });
      }

      if (tag === "input") {
          const input = el as HTMLInputElement;
          state.items.push({ 
            ...commonProps, type: "input", 
            inputType: input.type || "text",
            placeholder: normText(input.placeholder || ""),
            label: normText(el.getAttribute("aria-label") || input.name || "") || normText(input.placeholder || "") || `[${input.type} input]`
          });
      }

      if (tag === "textarea") {
          const textarea = el as HTMLTextAreaElement;
          state.items.push({ 
            ...commonProps, type: "textarea", 
            placeholder: normText(textarea.placeholder || ""),
            label: normText(el.getAttribute("aria-label") || textarea.name || "") || normText(textarea.placeholder || "") || "[textarea]"
          });
      }

      if (tag === "select") {
          state.items.push({ 
            ...commonProps, type: "select", 
            label: normText(el.getAttribute("aria-label") || (el as HTMLSelectElement).name || "") || "[select]"
          });
      }

      if (!isLink && !isDescendantOfLink && !isButton && !isDescendantOfButton) {
          for (const node of el.childNodes) {
              if (node.nodeType === Node.TEXT_NODE) {
                  const t = normText(node.nodeValue || "");
                  if (t) {
                      state.items.push({ 
                        ...commonProps, type: "text", text: t
                      });
                  }
              }
          }
      }
  }

  for (const child of el.children) {
    if (state.visited > MAX_NODES) break;
    walkElement(child, state, id, isLink || isDescendantOfLink, isButton || isDescendantOfButton);
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
