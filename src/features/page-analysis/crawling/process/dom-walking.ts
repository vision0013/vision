import { CrawledItem } from '@/types';
import { MAX_NODES, TARGET_TAGS, SKIP_TAGS, IFRAME_TAGS } from '../../crawling/config/constants';
import { CrawlerState } from '../types/crawler-state';
import { normText } from './text-processing';
import { isCurrentlyVisible, roleOf, bbox } from './element-analysis';
import { coordinateTransformer } from './coordinate-transformer';

/**
 * DOM 요소를 재귀적으로 탐색하여 크롤링 아이템을 생성합니다.
 * @param el 탐색을 시작할 요소
 * @param state 크롤러의 현재 상태
 * @param parentElId 부모 요소의 ID
 * @param isDescendantOfLink 현재 요소가 'a' 태그의 자손인지 여부
 * @param isDescendantOfButton ✨ [수정] 현재 요소가 버튼의 자손인지 여부
 */
export function walkElement(
  el: Element, 
  state: CrawlerState, 
  parentElId: number | null = null, 
  isDescendantOfLink: boolean = false,
  isDescendantOfButton: boolean = false // ✨ [수정] 파라미터 추가
): void {
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

  // 좌표 계산 - iframe 내부 요소는 메인 페이지 좌표계로 변환
  let elementRect = bbox(el);
  if (coordinateTransformer.needsTransformation(el)) {
    const parentIframe = coordinateTransformer.findParentIframe(el);
    if (parentIframe) {
      elementRect = coordinateTransformer.transformIframeElementCoordinates(el, parentIframe);
    }
  }

  const meta = {
    tag,
    role: roleOf(el),
    rect: elementRect,
    parentId: parentElId,
  };

  // iframe 처리: 네이버 블로그 스타일 iframe 내부 컨텐츠 크롤링
  if (IFRAME_TAGS.has(tag)) {
    try {
      const iframe = el as HTMLIFrameElement;
      const src = iframe.src;
      
      // 같은 도메인 iframe만 처리 (CORS 제한으로 인해)
      if (src && (src.startsWith('/') || src.includes(window.location.hostname))) {
        state.items.push({ 
          id: state.nextItemId++, 
          ownerId, 
          parentId: parentElId, 
          tag, 
          role: meta.role, 
          rect: meta.rect, 
          type: "iframe", 
          src: src,
          text: `iframe: ${src}`,
          hidden: !isCurrentlyVisible(el)
        });

        // iframe 내부 문서 접근 시도
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc && iframeDoc.body) {
            // iframe 내부 DOM을 재귀적으로 크롤링
            walkElement(iframeDoc.body, state, ownerId, isDescendantOfLink, isDescendantOfButton);
          }
        } catch (e) {
          // CORS 에러 등으로 접근 불가능한 경우는 무시
          console.log(`Cannot access iframe content: ${src}`);
        }
      }
    } catch (e) {
      console.error('Error processing iframe:', e);
    }
    return; // iframe 처리 후 하위 탐색 중단
  }
  state.elMeta.set(ownerId, meta);

  const isTarget = TARGET_TAGS.has(tag);
  const isLink = tag === 'a';
  // ✨ [수정] <button> 태그와 role="button"을 모두 버튼으로 인식
  const isButton = tag === 'button' || meta.role === 'button';

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

      if (isLink) {
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

      // ✨ [수정] 버튼 처리 로직 통합
      if (isButton) {
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

      if (tag === "input") {
          const input = el as HTMLInputElement;
          const type = input.type || "text";
          const placeholder = normText(input.placeholder || "");
          const label = normText(el.getAttribute("aria-label") || input.name || "");
          
          state.items.push({ 
            id: state.nextItemId++, 
            ownerId, 
            parentId: parentElId, 
            tag, 
            role: meta.role, 
            rect: meta.rect, 
            type: "input", 
            inputType: type,
            placeholder,
            label: label || placeholder || `[${type} input]`,
            hidden: !isVisible
          });
      }

      if (tag === "textarea") {
          const textarea = el as HTMLTextAreaElement;
          const placeholder = normText(textarea.placeholder || "");
          const label = normText(el.getAttribute("aria-label") || textarea.name || "");
          
          state.items.push({ 
            id: state.nextItemId++, 
            ownerId, 
            parentId: parentElId, 
            tag, 
            role: meta.role, 
            rect: meta.rect, 
            type: "textarea", 
            placeholder,
            label: label || placeholder || "[textarea]",
            hidden: !isVisible
          });
      }

      if (tag === "select") {
          const select = el as HTMLSelectElement;
          const label = normText(el.getAttribute("aria-label") || select.name || "");
          
          state.items.push({ 
            id: state.nextItemId++, 
            ownerId, 
            parentId: parentElId, 
            tag, 
            role: meta.role, 
            rect: meta.rect, 
            type: "select", 
            label: label || "[select]",
            hidden: !isVisible
          });
      }

      // ✨ [수정] 링크나 버튼(역할 포함)의 자손이 아닐 경우에만 텍스트 노드로 분리
      if (!isLink && !isDescendantOfLink && !isButton && !isDescendantOfButton) {
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
              
              const ariaLabel = el.getAttribute('aria-label') || '';
              const role = el.getAttribute('role') || '';
              const hasInteractiveChildren = el.querySelector('button, input, textarea, select, a[href]');
              
              if ((ariaLabel || role || hasInteractiveChildren) && (className || id)) {
                  state.items.push({ 
                    id: state.nextItemId++, 
                    ownerId, 
                    parentId: parentElId, 
                    tag, 
                    role: meta.role, 
                    rect: meta.rect, 
                    type: "container", 
                    text: ariaLabel || `[${tag}${id ? '#' + id : ''}${className ? '.' + className.split(' ')[0] : ''}]`,
                    hidden: !isVisible
                  });
              }
          }
      }
  }

  // ✨ [수정] 재귀 호출 시, 현재 요소가 버튼이거나 부모가 버튼의 자손이었는지 여부를 전달
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