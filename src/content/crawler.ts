// 기존 content.js 로직을 TypeScript로 변환
import { CrawledItem, BoundingBox, ItemType, AnalysisResult } from '../types';

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

  normText(s: string | null | undefined): string {
    return (s || "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, this.MAX_TEXT_LEN);
  }

  isVisible(el: HTMLElement): boolean {
    const st = getComputedStyle(el);
    if (st.display === "none" || st.visibility === "hidden" || st.opacity === "0") {
      return false;
    }
    const r = el.getBoundingClientRect();
    return r.width >= this.MIN_W && r.height >= this.MIN_H;
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

  allowTextGlobal(t: string): boolean {
    if (!t || t.length < 3) return false;
    const key = t.length <= 120 ? t : (t.slice(0, 60) + "…|" + t.slice(-60));
    if (this.seenTextGlobal.has(key)) return false;
    this.seenTextGlobal.add(key);
    return true;
  }

  walk(el: Element, parentElId: number | null = null): void {
    if (!(el instanceof HTMLElement)) return;
    this.visited++;
    if (this.visited > this.MAX_NODES) return;

    const tag = el.tagName.toLowerCase();
    if (this.SKIP_TAGS.has(tag)) return;

    const isTarget = this.TARGET_TAGS.has(tag);
    if (isTarget && !this.isVisible(el)) return;

    const ownerId = this.nextElementId++;
    this.elIdMap.set(el, ownerId);

    const meta = {
      tag,
      role: this.roleOf(el),
      rect: this.bbox(el),
      parentId: parentElId,
    };
    this.elMeta.set(ownerId, meta);

    if (isTarget) {
      // Handle images
      if (tag === "img") {
        const alt = this.normText(el.getAttribute("alt"));
        const title = this.normText(el.getAttribute("title"));
        const src = el.getAttribute("src") || "";
        this.items.push({
          id: this.nextItemId++,
          ownerId,
          parentId: parentElId,
          tag,
          role: meta.role,
          rect: meta.rect,
          type: "image" as ItemType,
          alt,
          title,
          src
        });
      }

      // Handle links
      if (tag === "a") {
        const href = el.getAttribute("href") || "";
        if (href) {
          this.items.push({
            id: this.nextItemId++,
            ownerId,
            parentId: parentElId,
            tag,
            role: meta.role,
            rect: meta.rect,
            type: "link" as ItemType,
            href
          });
        }
      }

      // Handle buttons
      if (tag === "button") {
        const label = this.normText(el.getAttribute("aria-label") || el.textContent || "");
        if (label) {
          this.items.push({
            id: this.nextItemId++,
            ownerId,
            parentId: parentElId,
            tag,
            role: meta.role,
            rect: meta.rect,
            type: "button" as ItemType,
            label
          });
        }
      }

      // Handle text nodes
      for (const node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          const t = this.normText(node.nodeValue || "");
          if (this.allowTextGlobal(t)) {
            this.items.push({
              id: this.nextItemId++,
              ownerId,
              parentId: parentElId,
              tag,
              role: meta.role,
              rect: meta.rect,
              type: "text" as ItemType,
              text: t
            });
          }
        }
      }
    }

    // Traverse children
    for (const child of el.children) {
      if (this.visited > this.MAX_NODES) break;
      this.walk(child, ownerId);
    }
  }

  removeDuplicates(): CrawledItem[] {
    const rectKey = (r: BoundingBox) => `${r.top},${r.left},${r.width},${r.height}`;
    const textSeenPerRect = new Map<string, Set<string>>();
    const keep: CrawledItem[] = [];

    for (const item of this.items) {
      if (item.type !== "text") {
        keep.push(item);
        continue;
      }
      const key = rectKey(item.rect);
      if (!textSeenPerRect.has(key)) {
        textSeenPerRect.set(key, new Set());
      }
      const bag = textSeenPerRect.get(key)!;
      const t = item.text || "";
      if (bag.has(t)) continue;
      bag.add(t);
      keep.push(item);
    }

    return keep;
  }

  analyze(): AnalysisResult {
    const T0 = performance.now();
    
    this.walk(document.body, null);
    const finalItems = this.removeDuplicates();
    
    // Sort by visual order
    finalItems.sort((a, b) => (a.rect.top - b.rect.top) || (a.rect.left - b.rect.left));
    
    const elapsed = Number((performance.now() - T0).toFixed(1));
    
    console.log(`✅ Pruned DFS done: ${finalItems.length} items (visited ${this.visited}) in ${elapsed}ms`);
    
    return {
      url: location.href,
      userAgent: navigator.userAgent,
      visited: this.visited,
      elapsedMs: elapsed,
      items: finalItems
    };
  }
}