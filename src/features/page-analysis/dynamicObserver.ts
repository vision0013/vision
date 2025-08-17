import { PageCrawler } from './crawler';

// DynamicElementObserver.ts - 상세 디버깅 버전
export class DynamicElementObserver {
  private observer: MutationObserver;
  private observerTimeout: number | null = null;
  private crawler: PageCrawler;
  private onNewItemsFound: (newItems: any[]) => void;
  private lastMutationTime: number = 0;

  constructor(crawler: PageCrawler, onNewItemsCallback: (newItems: any[]) => void) {
    this.crawler = crawler;
    this.onNewItemsFound = onNewItemsCallback;
    
    this.observer = new MutationObserver((mutations) => {
      this.lastMutationTime = performance.now();
      this.handleMutations(mutations);
    });
  }

  private handleMutations(mutations: MutationRecord[]) {
    const mutationStartTime = this.lastMutationTime;
    
    if (this.observerTimeout) {
      clearTimeout(this.observerTimeout);
    }
    
    this.observerTimeout = window.setTimeout(() => {
      const processingStartTime = performance.now();
      const waitTime = processingStartTime - mutationStartTime;
      
      const addedElements: HTMLElement[] = [];
      
      // ✨ 추가된 요소들 상세 분석
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          console.log(`🔍 Mutation detected in:`, mutation.target);
          
          mutation.addedNodes.forEach(node => {
            if (node instanceof HTMLElement) {
              // ✨ 추가된 요소 상세 정보 로깅
              console.log(`➕ Added element:`, {
                tag: node.tagName.toLowerCase(),
                text: node.textContent?.trim().slice(0, 100) || 'NO TEXT',
                classes: node.className || 'NO CLASSES',
                id: node.id || 'NO ID',
                childCount: node.children.length,
                innerHTML: node.innerHTML.slice(0, 200) + (node.innerHTML.length > 200 ? '...' : '')
              });
              
              addedElements.push(node);
              
              // 자식 요소들도 추가하면서 로깅
              const children = Array.from(node.querySelectorAll('*')) as HTMLElement[];
              console.log(`  └─ Found ${children.length} child elements`);
              
              children.forEach((child, index) => {
                if (index < 5) { // 처음 5개만 상세 로깅
                  console.log(`    ${index + 1}. ${child.tagName.toLowerCase()}: "${child.textContent?.trim().slice(0, 50) || 'NO TEXT'}"`);
                }
              });
              
              if (children.length > 5) {
                console.log(`    ... and ${children.length - 5} more children`);
              }
              
              addedElements.push(...children);
            }
          });
        }
      });
      
      if (addedElements.length > 0) {
        console.log(`🔄 DOM changed, analyzing ${addedElements.length} new elements (waited ${waitTime.toFixed(1)}ms)`);
        
        // ✨ 요소 타입별 분류 로깅
        const elementsByTag = addedElements.reduce((acc, el) => {
          const tag = el.tagName.toLowerCase();
          acc[tag] = (acc[tag] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log(`📊 Element breakdown:`, elementsByTag);
        
        const tryAnalyze = (attempt: number = 1) => {
          const analysisStartTime = performance.now();
          
          // ✨ 분석 전 요소 샘플링 로깅
          console.log(`🔍 Analyzing elements (attempt ${attempt}):`);
          addedElements.slice(0, 10).forEach((el, index) => {
            const text = el.textContent?.trim() || '';
            const isVisible = getComputedStyle(el).display !== 'none';
            const hasSize = el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0;
            
            console.log(`  ${index + 1}. ${el.tagName.toLowerCase()}: "${text.slice(0, 40)}" (visible: ${isVisible}, hasSize: ${hasSize})`);
          });
          
          const newItems = this.crawler.analyzeElements(addedElements);
          const analysisTime = performance.now() - analysisStartTime;
          
          if (newItems.length > 0) {
            const totalTime = performance.now() - mutationStartTime;
            console.log(`✅ Found ${newItems.length} new items from dynamic elements (attempt ${attempt})`);
            
            // ✨ 새로 발견된 아이템들 상세 로깅
            console.log(`🎉 New items discovered:`);
            newItems.forEach((item, index) => {
              console.log(`  ${index + 1}. [${item.type}] "${item.text || item.label || item.alt || item.href}" (${item.tag})`);
            });
            
            console.log(`⏱️ Timing: Wait ${waitTime.toFixed(1)}ms + Analysis ${analysisTime.toFixed(1)}ms = Total ${totalTime.toFixed(1)}ms`);
            this.onNewItemsFound(newItems);
          } else if (attempt === 1) {
            console.log(`🔄 No items found on first attempt:`);
            
            // ✨ 왜 아이템을 찾지 못했는지 상세 분석
            console.log(`❓ Analysis of why 0 items found:`);
            const sampleElements = addedElements.slice(0, 5);
            sampleElements.forEach((el, index) => {
              const rect = el.getBoundingClientRect();
              const style = getComputedStyle(el);
              const text = el.textContent?.trim() || '';
              
              console.log(`  ${index + 1}. ${el.tagName.toLowerCase()}:`);
              console.log(`    - Text: "${text.slice(0, 50)}"`);
              console.log(`    - Display: ${style.display}`);
              console.log(`    - Visibility: ${style.visibility}`);
              console.log(`    - Size: ${rect.width}x${rect.height}`);
              console.log(`    - Position: (${rect.left}, ${rect.top})`);
            });
            
            console.log(`🔄 Retrying in 500ms... (waited ${waitTime.toFixed(1)}ms so far)`);
            setTimeout(() => tryAnalyze(2), 1000);
          } else {
            const totalTime = performance.now() - mutationStartTime;
            console.log(`❌ No items found after retry (total time: ${totalTime.toFixed(1)}ms)`);
            console.log(`📝 Final analysis: ${addedElements.length} elements processed, 0 items collected`);
          }
        };
        
        tryAnalyze();
      }
      this.observerTimeout = null;
    }, 800);
  }

  start() {
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      attributeOldValue: false,
      characterData: false,
      characterDataOldValue: false
    });
    console.log('🔍 Dynamic element observer started');
  }

  stop() {
    this.observer.disconnect();
    if (this.observerTimeout) {
      clearTimeout(this.observerTimeout);
      this.observerTimeout = null;
    }
    console.log('🛑 Dynamic element observer stopped');
  }
}