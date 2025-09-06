import { CrawledItem } from '@/types';
import { CrawlerState } from '../types/crawler-state';
import { walkElement } from './dom-walking';
import { coordinateTransformer } from './coordinate-transformer';

/**
 * 네이버 블로그 iframe 처리 (간소화 버전)
 * 기존 Background 탭 관리를 활용하여 안전하고 간단하게 처리
 */
export async function processNaverIframes(state: CrawlerState): Promise<void> {
  const iframes = document.querySelectorAll('iframe');
  
  if (iframes.length === 0) {
    console.log('📱 [naver] No iframes found');
    return;
  }
  
  console.log(`📱 [naver] Found ${iframes.length} iframe(s), processing...`);
  
  for (const iframe of iframes) {
    await processNaverIframe(iframe as HTMLIFrameElement, state);
  }
}

/**
 * 개별 네이버 iframe 처리
 */
async function processNaverIframe(
  iframe: HTMLIFrameElement, 
  state: CrawlerState
): Promise<void> {
  const src = iframe.src;
  
  // 네이버 블로그 관련 iframe만 처리
  if (!isNaverBlogIframe(src)) {
    return;
  }
  
  console.log(`🔍 [naver] Processing iframe: ${src}`);
  
  // 1. iframe 로딩 대기
  const loaded = await waitForIframeLoad(iframe);
  if (!loaded) {
    console.log('⏰ [naver] Iframe loading timeout');
    addIframeAsItem(iframe, state);
    return;
  }
  
  // 2. iframe 좌표 변환을 위해 등록
  coordinateTransformer.registerIframe(iframe);

  // 3. 직접 접근 시도
  const doc = await tryDirectAccess(iframe);
  if (doc && doc.body) {
    console.log('✅ [naver] Direct iframe access successful');
    const beforeCount = state.items.length;
    walkElement(doc.body, state);
    const newCount = state.items.length - beforeCount;
    console.log(`📊 [naver] Added ${newCount} items from iframe`);
  } else {
    console.log('🚫 [naver] Cannot access iframe content (CORS)');
    addIframeAsItem(iframe, state);
  }
}

/**
 * iframe 로딩 완료 대기
 */
async function waitForIframeLoad(iframe: HTMLIFrameElement): Promise<boolean> {
  if (iframe.contentDocument) {
    return true;
  }
  
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 3000); // 3초 대기
    
    iframe.addEventListener('load', () => {
      clearTimeout(timeout);
      resolve(true);
    }, { once: true });
  });
}

/**
 * iframe 내용 직접 접근 시도
 */
async function tryDirectAccess(iframe: HTMLIFrameElement): Promise<Document | null> {
  try {
    // 방법 1: contentDocument
    if (iframe.contentDocument && iframe.contentDocument.body) {
      return iframe.contentDocument;
    }
    
    // 방법 2: contentWindow.document
    if (iframe.contentWindow && iframe.contentWindow.document) {
      return iframe.contentWindow.document;
    }
    
    // 방법 3: 잠깐 대기 후 재시도
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (iframe.contentDocument && iframe.contentDocument.body) {
      return iframe.contentDocument;
    }
    
  } catch (error) {
    console.log('🚫 [naver] CORS blocked iframe access:', error);
  }
  
  return null;
}

/**
 * iframe 정보를 아이템으로 추가 (최후의 수단)
 */
function addIframeAsItem(iframe: HTMLIFrameElement, state: CrawlerState): void {
  const ownerId = state.nextElementId++;
  state.elIdMap.set(iframe, ownerId);
  
  const rect = iframe.getBoundingClientRect();
  
  state.items.push({
    id: state.nextItemId++,
    ownerId,
    parentId: null,
    tag: 'iframe',
    role: 'frame',
    rect: {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height
    },
    type: 'iframe',
    text: `네이버 블로그 컨텐츠: ${iframe.src}`,
    src: iframe.src,
    hidden: false
  } as CrawledItem);
  
  console.log('📝 [naver] Added iframe as fallback item');
}

/**
 * 네이버 블로그 iframe 여부 확인
 */
function isNaverBlogIframe(src: string): boolean {
  if (!src) return false;
  
  return src.includes('PostList.naver') || 
         src.includes('PostView.naver') ||
         src.includes('blog.naver.com') ||
         src.startsWith('/Post'); // 상대 경로
}