import { CrawledItem } from '@/types';
import { CrawlerState } from '../../crawling/types/crawler-state';
import { createCrawlerState } from '../../crawling/process/state-management';
import { getElementStateAndActionability } from '../../crawling/process/element-analysis';
import { normText } from '../../crawling/process/text-processing';

export function scanChildrenWithoutIds(parentElement: HTMLElement): CrawledItem[] {
  const tempState = createCrawlerState();
  const targetTags = ['a', 'button', 'input', 'textarea', 'select'];
  
  const selector = targetTags
    .map(tag => `${tag}:not([data-crawler-id])`)
    .join(', ');
  
  const elementsWithoutIds = parentElement.querySelectorAll(selector) as NodeListOf<HTMLElement>;
  
  elementsWithoutIds.forEach(el => {
    walkSingleElement(el, tempState);
  });
  
  if (elementsWithoutIds.length > 0) {
    console.log(`🔍 Fast-scanned ${elementsWithoutIds.length} target elements in changed container`);
  }
  
  return tempState.items;
}

export function walkSingleElement(el: HTMLElement, state: CrawlerState): void {
  if (state.elIdMap.has(el)) {
    return;
  }
  
  // ✨ [수정] id를 유일한 ID로 사용
  const id = state.nextElementId++;
  state.elIdMap.set(el, id);
  el.setAttribute('data-crawler-id', id.toString());
  
  const tag = el.tagName.toLowerCase();
  const meta = {
    tag,
    role: el.getAttribute('role') || '',
    rect: el.getBoundingClientRect(),
    parentId: null, // 단일 스캔에서는 부모 컨텍스트가 없음
  };
  state.elMeta.set(id, meta);

  const { state: elementState, isClickable, isInputtable } = getElementStateAndActionability(el);
  
  if (['a', 'button', 'input', 'textarea', 'select'].includes(tag)) {
    const isVisible = getComputedStyle(el).display !== 'none';
    const commonProps = { id, ownerId: id, parentId: null, tag, role: meta.role, rect: meta.rect, hidden: !isVisible, state: elementState, isClickable, isInputtable };

    if (tag === 'a') {
        state.items.push({
          ...commonProps, type: 'link',
          href: el.getAttribute('href') || '',
          text: normText(el.textContent),
        });
    } else if (tag === 'button') {
        state.items.push({
          ...commonProps, type: 'button',
          label: normText(el.getAttribute("aria-label") || el.textContent || "") || "(no label)",
        });
    } else if (tag === 'input') {
        const input = el as HTMLInputElement;
        state.items.push({
          ...commonProps, type: 'input',
          inputType: input.type || "text",
          placeholder: normText(input.placeholder || ""),
          label: normText(el.getAttribute("aria-label") || input.name || "") || normText(input.placeholder || "") || `[${input.type} input]`,
        });
    } else if (tag === 'textarea') {
        const textarea = el as HTMLTextAreaElement;
        state.items.push({
          ...commonProps, type: 'textarea',
          placeholder: normText(textarea.placeholder || ""),
          label: normText(el.getAttribute("aria-label") || textarea.name || "") || normText(textarea.placeholder || "") || "[textarea]",
        });
    } else if (tag === 'select') {
        state.items.push({
          ...commonProps, type: 'select',
          label: normText(el.getAttribute("aria-label") || (el as HTMLSelectElement).name || "") || "[select]",
        });
    }
  }
}