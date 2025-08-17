// crawler.ts - 단순화 버전 (display:none만 제외, 나머지 모두 수집)
import { CrawledItem, BoundingBox, AnalysisResult } from '../../types';

export class PageCrawler {
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

  // ✨ 단순화: 현재 보이는지 여부만 체크 (필터링 아님, 플래그용)
  isCurrentlyVisible(el: HTMLElement): boolean {
    const rect = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    
    // 실제로 보이는지 체크 (플래그 설정용)
    return rect.width > 0 && 
           rect.height > 0 && 
           st.visibility !== 'hidden' && 
           st.opacity !== '0';
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
    
    // 크기가 0이어도 그대로 기록
    return {
      top: Math.round(r.top),
      left: Math.round(r.left),
      width: Math.round(r.width),
      height: Math.round(r.height)
    };
  }

  // ✨ 단순화: 중복 체크를 옵션으로 (기본값 false = 중복 허용)
  allowText(t: string, skipDuplicateCheck: boolean = true): boolean {
    if (!t || t.length < 1) return false;
    
    if (skipDuplicateCheck) {
      return true;  // 중복 체크 안 함
    }
    
    // 필요시 중복 체크
    const key = t.length <= 120 ? t : (t.slice(0, 60) + "…|" + t.slice(-60));
    if (this.seenTextGlobal.has(key)) return false;
    this.seenTextGlobal.add(key);
    return true;
  }

  walk(el: Element, parentElId: number | null = null): void {
    if (!(el instanceof HTMLElement)) return;

    // 이미 처리된 요소는 스킵
    if (this.elIdMap.has(el)) {
      return;
    }

    this.visited++;
    if (this.visited > this.MAX_NODES) return;

    const tag = el.tagName.toLowerCase();
    if (this.SKIP_TAGS.has(tag)) return;

    // ✨ 유일한 제외 조건: display:none
    if (getComputedStyle(el).display === 'none') {
      return;
    }

    // ✨ display:none이 아니면 무조건 ID 부여
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
    
    // ✨ 단순화: TARGET_TAGS에 있으면 무조건 수집
    if (isTarget) {
        // 현재 보이는지 여부 (필터링 아님, 플래그용)
        const isVisible = this.isCurrentlyVisible(el);
        
        // Handle images
        if (tag === "img") {
            const alt = this.normText(el.getAttribute("alt"));
            const title = this.normText(el.getAttribute("title"));
            const src = el.getAttribute("src") || "";
            
            // ✨ 무조건 추가
            this.items.push({ 
              id: this.nextItemId++, 
              ownerId, 
              parentId: parentElId, 
              tag, 
              role: meta.role, 
              rect: meta.rect, 
              type: "image", 
              alt, 
              title, 
              src,
              hidden: !isVisible  // 플래그만 설정
            });
        }

        // Handle links
        if (tag === "a") {
            const href = el.getAttribute("href") || "";
            const text = this.normText(el.textContent);
            
            // ✨ 텍스트나 href가 있으면 무조건 추가 (빈 링크도 포함)
            if (href || text) {
                this.items.push({ 
                  id: this.nextItemId++, 
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

        // Handle buttons
        if (tag === "button") {
            const label = this.normText(el.getAttribute("aria-label") || el.textContent || "");
            
            // ✨ 레이블이 있든 없든 무조건 추가
            this.items.push({ 
              id: this.nextItemId++, 
              ownerId, 
              parentId: parentElId, 
              tag, 
              role: meta.role, 
              rect: meta.rect, 
              type: "button", 
              label: label || "(no label)",  // 빈 버튼도 표시
              hidden: !isVisible
            });
        }

        // Handle text nodes
        if (tag !== 'a' && tag !== 'button' && !el.closest('a, button')) {
            let hasText = false;
            
            for (const node of el.childNodes) {
                if (node.nodeType === Node.TEXT_NODE) {
                    const t = this.normText(node.nodeValue || "");
                    if (t) {
                        // ✨ 텍스트가 있으면 무조건 추가
                        this.items.push({ 
                          id: this.nextItemId++, 
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
            
            // ✨ 빈 컨테이너도 기록 (디버깅/구조 파악용)
            if (!hasText && (tag === 'div' || tag === 'section' || tag === 'article')) {
                const className = el.className || '';
                const id = el.id || '';
                
                // 의미있는 컨테이너인지 체크 (class나 id가 있는 경우)
                if (className || id) {
                    this.items.push({ 
                      id: this.nextItemId++, 
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

    // 자식 요소들 처리
    for (const child of el.children) {
      if (this.visited > this.MAX_NODES) break;
      this.walk(child, ownerId);
    }
  }

  // ✨ 단순화: 중복 제거도 최소화 (위치 기반 중복만 제거)
  removeDuplicates(itemsToProcess: CrawledItem[]): CrawledItem[] {
    const keep: CrawledItem[] = [];
    const seen = new Set<string>();

    for (const item of itemsToProcess) {
      // 숨겨진 요소는 중복 체크 안 함 (모두 보관)
      if (item.hidden) {
        keep.push(item);
        continue;
      }
      
      // 보이는 요소만 위치 기반 중복 체크
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
    this.reset();
    
    // ✨ 단순 크롤링: display:none만 제외하고 모두 수집
    this.walk(document.body, null);
    
    // 중복 제거 (최소한만)
    const finalItems = this.removeDuplicates(this.items);
    this.items = finalItems;
    
    // 정렬: 보이는 것 먼저, 그 다음 위치순
    finalItems.sort((a, b) => {
      // 보이는 것 우선
      if (a.hidden !== b.hidden) {
        return a.hidden ? 1 : -1;
      }
      // 위치순 정렬
      return (a.rect.top - b.rect.top) || (a.rect.left - b.rect.left);
    });
    
    const elapsed = Number((performance.now() - T0).toFixed(1));
    const visibleCount = finalItems.filter(item => !item.hidden).length;
    const hiddenCount = finalItems.filter(item => item.hidden).length;
    
    console.log(`✅ Full analysis done: ${finalItems.length} total items`);
    console.log(`   📊 Visible: ${visibleCount}, Hidden: ${hiddenCount}`);
    console.log(`   ⏱️ Time: ${elapsed}ms`);
    console.log(`   🔍 Visited: ${this.visited} elements`);
    
    // 숨겨진 요소 샘플 출력 (디버깅용)
    const hiddenSamples = finalItems.filter(item => item.hidden).slice(0, 5);
    if (hiddenSamples.length > 0) {
      console.log('   🔽 Hidden element samples:');
      hiddenSamples.forEach((item, i) => {
        console.log(`      ${i+1}. [${item.type}] "${item.text || item.label || item.alt || 'empty'}" (${item.tag})`);
      });
    }
    
    return { 
      url: location.href, 
      userAgent: navigator.userAgent, 
      visited: this.visited, 
      elapsedMs: elapsed, 
      items: finalItems,
      stats: {
        total: finalItems.length,
        visible: visibleCount,
        hidden: hiddenCount
      }
    };
  }

  // ✨ 동적으로 보이게 된 요소 업데이트
  updateVisibility(): CrawledItem[] {
    const updatedItems: CrawledItem[] = [];
    
    this.items.forEach(item => {
      if (item.hidden) {
        const el = document.querySelector(`[data-crawler-id="${item.ownerId}"]`) as HTMLElement;
        if (el && this.isCurrentlyVisible(el)) {
          // 숨겨졌다가 보이게 된 요소
          item.hidden = false;
          item.rect = this.bbox(el);  // 위치 업데이트
          updatedItems.push(item);
          console.log(`👁️ Element became visible: [${item.type}] "${item.text || item.label || item.alt}"`);
        }
      }
    });
    
    return updatedItems;
  }

  analyzeElements(elements: HTMLElement[]): CrawledItem[] {
    const T0 = performance.now();
    
    // 새로운 아이템만 수집하기 위한 임시 배열
    const originalItems = this.items;
    const newItemsOnly: CrawledItem[] = [];
    this.items = newItemsOnly;

    console.log(`🔄 Analyzing ${elements.length} dynamic elements...`);
    
    // 변경된 요소들 크롤링
    elements.forEach(el => {
      if (el instanceof HTMLElement) {
        this.walk(el, null);
      }
    });

    // 원래 아이템 복구
    this.items = originalItems;
    
    // 기존에 숨겨졌던 요소가 보이게 되었는지 체크
    const visibilityUpdates = this.updateVisibility();
    
    // 새 아이템과 업데이트된 아이템 합치기
    const allNewItems = [...newItemsOnly, ...visibilityUpdates];
    const uniqueNewItems = this.removeDuplicates(allNewItems);
    
    const elapsed = Number((performance.now() - T0).toFixed(1));
    
    if (uniqueNewItems.length > 0) {
      console.log(`✅ Dynamic analysis: ${uniqueNewItems.length} items (${newItemsOnly.length} new, ${visibilityUpdates.length} revealed) in ${elapsed}ms`);
    }
    
    return uniqueNewItems;
  }
}