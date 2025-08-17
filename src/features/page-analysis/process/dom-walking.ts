import { CrawledItem } from '../../../types';
import { MAX_NODES, TARGET_TAGS, SKIP_TAGS } from '../config/constants';
import { CrawlerState } from '../types/crawler-state';
import { normText } from './text-processing';
import { isCurrentlyVisible, roleOf, bbox } from './element-analysis';

export function walkElement(el: Element, state: CrawlerState, parentElId: number | null = null): void {
  if (!(el instanceof HTMLElement)) return;

  if (state.elIdMap.has(el)) {
    return;
  }

  state.visited++;
  if (state.visited > MAX_NODES) return;

  const tag = el.tagName.toLowerCase();
  if (SKIP_TAGS.has(tag)) return;

  if (getComputedStyle(el).display === 'none') {
    return;
  }

  const ownerId = state.nextElementId++;
  state.elIdMap.set(el, ownerId);
  el.setAttribute('data-crawler-id', ownerId.toString());

  const meta = {
    tag,
    role: roleOf(el),
    rect: bbox(el),
    parentId: parentElId,
  };
  state.elMeta.set(ownerId, meta);

  const isTarget = TARGET_TAGS.has(tag);
  
  if (isTarget) {
      const isVisible = isCurrentlyVisible(el);
      
      if (tag === "img") {
          const alt = normText(el.getAttribute("alt"));
          const title = normText(el.getAttribute("title"));
          const src = el.getAttribute("src") || "";
          
          state.items.push({ 
            id: state.nextItemId++, 
            ownerId, 
            parentId: parentElId, 
            tag, 
            role: meta.role, 
            rect: meta.rect, 
            type: "image", 
            alt, 
            title, 
            src,
            hidden: !isVisible
          });
      }

      if (tag === "a") {
          const href = el.getAttribute("href") || "";
          const text = normText(el.textContent);
          
          if (href || text) {
              state.items.push({ 
                id: state.nextItemId++, 
                ownerId, 
                parentId: parentElId, 
                tag, 
                role: meta.role, 
                rect: meta.rect, 
                type: "link", 
                href, 
                text,
                hidden: !isVisible
              });
          }
      }

      if (tag === "button") {
          const label = normText(el.getAttribute("aria-label") || el.textContent || "");
          
          state.items.push({ 
            id: state.nextItemId++, 
            ownerId, 
            parentId: parentElId, 
            tag, 
            role: meta.role, 
            rect: meta.rect, 
            type: "button", 
            label: label || "(no label)",
            hidden: !isVisible
          });
      }

      if (tag !== 'a' && tag !== 'button' && !el.closest('a, button')) {
          let hasText = false;
          
          for (const node of el.childNodes) {
              if (node.nodeType === Node.TEXT_NODE) {
                  const t = normText(node.nodeValue || "");
                  if (t) {
                      state.items.push({ 
                        id: state.nextItemId++, 
                        ownerId, 
                        parentId: parentElId, 
                        tag, 
                        role: meta.role, 
                        rect: meta.rect, 
                        type: "text", 
                        text: t,
                        hidden: !isVisible
                      });
                      hasText = true;
                  }
              }
          }
          
          if (!hasText && (tag === 'div' || tag === 'section' || tag === 'article')) {
              const className = el.className || '';
              const id = el.id || '';
              
              if (className || id) {
                  state.items.push({ 
                    id: state.nextItemId++, 
                    ownerId, 
                    parentId: parentElId, 
                    tag, 
                    role: meta.role, 
                    rect: meta.rect, 
                    type: "container", 
                    text: `[${tag}${id ? '#' + id : ''}${className ? '.' + className.split(' ')[0] : ''}]`,
                    hidden: !isVisible
                  });
              }
          }
      }
  }

  for (const child of el.children) {
    if (state.visited > MAX_NODES) break;
    walkElement(child, state, ownerId);
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