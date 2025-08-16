// 기존 content.js 로직을 TypeScript로 변환
import { CrawledItem, BoundingBox, AnalysisResult } from '../types';

export class PageCrawler {
  private readonly MIN_W = 5;
  private readonly MIN_H = 5;
  private readonly MAX_NODES = 8000;
  private readonly MAX_TEXT_LEN = 600;

  private readonly TARGET_TAGS = new Set([
    "p", "h1", "h2", "h3", "h4", "h5", "h6", "span", "a", "li",
    "div", "section", "header", "footer", "main", "aside", "article",
    "img", "button"
  ]);

  private readonly SKIP_TAGS = new Set([
    "script", "style", "noscript", "link", "meta", "template",
    "svg", "canvas", "iframe", "object"
  ]);

  private visited = 0;
  private nextElementId = 0;
  private nextItemId = 0;
  private elIdMap = new WeakMap<HTMLElement, number>();
  private elMeta = new Map<number, any>();
  private items: CrawledItem[] = [];
  private seenTextGlobal = new Set<string>();

  // ✨ 1. 핵심 수정: 크롤러 상태를 초기화하는 reset 메서드 추가
  reset(): void {
    this.visited = 0;
    this.nextElementId = 0;
    this.nextItemId = 0;
    this.elIdMap = new WeakMap<HTMLElement, number>();
    this.elMeta = new Map<number, any>();
    this.items = [];
    this.seenTextGlobal = new Set<string>();
  }

  normText(s: string | null | undefined): string {
    return (s || "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, this.MAX_TEXT_LEN);
  }

  isCollectable(el: HTMLElement): boolean {
    const st = getComputedStyle(el);
    if (st.display === "none" || st.visibility === "hidden" || st.opacity === "0") {
      return false;
    }
    const r = el.getBoundingClientRect();
    return r.width >= this.MIN_W && r.height >= this.MIN_H;
  }

  isVisibleRelaxed(el: HTMLElement): boolean {
    const st = getComputedStyle(el);
    if (st.display === "none") {
      return false;
    }
    const r = el.getBoundingClientRect();
    return r.width >= 1 && r.height >= 1;
  }

  roleOf(el: HTMLElement): string {
    if (el.closest("header")) return "header";
    if (el.closest("footer")) return "footer";
    if (el.closest("nav")) return "nav";
    if (el.closest("aside")) return "sidebar";
    if (el.closest("main")) return "main";
    if (el.closest("article")) return "article";
    if (el.closest("section")) return "section";
    return "block";
  }

  bbox(el: HTMLElement): BoundingBox {
    const r = el.getBoundingClientRect();
    return {
      top: Math.round(r.top),
      left: Math.round(r.left),
      width: Math.round(r.width),
      height: Math.round(r.height),
    };
  }

  allowTextGlobal(t: string, skipDuplicateCheck: boolean = false): boolean {
    if (!t || t.length < 1) return false;
    const key = t.length <= 120 ? t : (t.slice(0, 60) + "…|" + t.slice(-60));
    if (skipDuplicateCheck) {
      this.seenTextGlobal.add(key);
      return true;
    }
    if (this.seenTextGlobal.has(key)) return false;
    this.seenTextGlobal.add(key);
    return true;
  }

  walk(el: Element, parentElId: number | null = null, isPartialCrawling: boolean = false): void {
    if (!(el instanceof HTMLElement)) return;

    if (this.elIdMap.has(el)) {
      return;
    }

    this.visited++;
    if (this.visited > this.MAX_NODES) return;

    const tag = el.tagName.toLowerCase();
    if (this.SKIP_TAGS.has(tag)) return;

    if (getComputedStyle(el).display === 'none') {
      return;
    }

    const ownerId = this.nextElementId++;
    this.elIdMap.set(el, ownerId);
    el.setAttribute('data-crawler-id', ownerId.toString());

    const meta = {
      tag,
      role: this.roleOf(el),
      rect: this.bbox(el),
      parentId: parentElId,
    };
    this.elMeta.set(ownerId, meta);

    const isTarget = this.TARGET_TAGS.has(tag);
    
    const shouldCollect = isPartialCrawling ? this.isVisibleRelaxed(el) : this.isCollectable(el);

    if (isTarget && shouldCollect) {
        // Handle images
        if (tag === "img") {
            const alt = this.normText(el.getAttribute("alt"));
            const title = this.normText(el.getAttribute("title"));
            const src = el.getAttribute("src") || "";
            this.items.push({ id: this.nextItemId++, ownerId, parentId: parentElId, tag, role: meta.role, rect: meta.rect, type: "image", alt, title, src });
        }

        // Handle links
        if (tag === "a") {
            const href = el.getAttribute("href") || "";
            const text = this.normText(el.textContent);
            if (href && text && this.allowTextGlobal(text, isPartialCrawling)) {
                this.items.push({ id: this.nextItemId++, ownerId, parentId: parentElId, tag, role: meta.role, rect: meta.rect, type: "link", href, text });
            }
        }

        // Handle buttons
        if (tag === "button") {
            const label = this.normText(el.getAttribute("aria-label") || el.textContent || "");
            if (label && this.allowTextGlobal(label, isPartialCrawling)) {
                this.items.push({ id: this.nextItemId++, ownerId, parentId: parentElId, tag, role: meta.role, rect: meta.rect, type: "button", label });
            }
        }

        // Handle text nodes (not in a or button)
        if (tag !== 'a' && tag !== 'button' && !el.closest('a, button')) {
            for (const node of el.childNodes) {
                if (node.nodeType === Node.TEXT_NODE) {
                    const t = this.normText(node.nodeValue || "");
                    if (this.allowTextGlobal(t, isPartialCrawling)) {
                        this.items.push({ id: this.nextItemId++, ownerId, parentId: parentElId, tag, role: meta.role, rect: meta.rect, type: "text", text: t });
                    }
                }
            }
        }
    }

    for (const child of el.children) {
      if (this.visited > this.MAX_NODES) break;
      this.walk(child, ownerId, isPartialCrawling);
    }
  }

  removeDuplicates(itemsToProcess: CrawledItem[]): CrawledItem[] {
    const keep: CrawledItem[] = [];
    const seen = new Set<string>();

    for (const item of itemsToProcess) {
      const key = `${item.type}|${item.text || item.label || item.href}|${Math.round(item.rect.left / 10)}|${Math.round(item.rect.top / 10)}`;
      if (!seen.has(key)) {
        keep.push(item);
        seen.add(key);
      }
    }
    return keep;
  }

  analyze(): AnalysisResult {
    const T0 = performance.now();
    // ✨ 2. 핵심 수정: 전체 분석 시작 시 크롤러 상태 초기화
    this.reset();
    this.walk(document.body, null);
    
    const finalItems = this.removeDuplicates(this.items);
    this.items = finalItems; // Update the main list with unique items
    
    finalItems.sort((a, b) => (a.rect.top - b.rect.top) || (a.rect.left - b.rect.left));
    const elapsed = Number((performance.now() - T0).toFixed(1));
    console.log(`✅ Full analysis done: ${finalItems.length} items (visited ${this.visited}) in ${elapsed}ms`);
    return { url: location.href, userAgent: navigator.userAgent, visited: this.visited, elapsedMs: elapsed, items: finalItems };
  }

  analyzeElements(elements: HTMLElement[]): CrawledItem[] {
    const T0 = performance.now();
    
    // ✨ 3. 핵심 수정: 임시 배열을 사용하여 새로 발견된 아이템만 수집
    const originalItems = this.items;
    const newItemsOnly: CrawledItem[] = [];
    this.items = newItemsOnly; // 수집 대상을 임시 배열로 전환

    console.log(`🔄 Partial crawling ${elements.length} changed elements...`);
    
    elements.forEach(el => {
      if (el instanceof HTMLElement) {
        this.walk(el, null, true);
      }
    });

    this.items = originalItems; // 수집 대상 원상 복구
    
    const uniqueNewItems = this.removeDuplicates(newItemsOnly);
    const elapsed = Number((performance.now() - T0).toFixed(1));
    console.log(`✅ Partial crawling done: Found ${uniqueNewItems.length} new items in ${elapsed}ms`);
    
    return uniqueNewItems;
  }
}
