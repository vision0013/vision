import { ICrawler, CrawledItem } from '@/types';

export interface ObserverState {
  observer: MutationObserver;
  observerTimeout: number | null;
  crawler: ICrawler;
  onNewItemsFound: (newItems: CrawledItem[]) => void;
}

export interface DetectionResult {
  movedElements: HTMLElement[];
  portalChangedElements: HTMLElement[];
  regularElements: HTMLElement[];
}

export interface ScanResult {
  items: CrawledItem[];
  elementsScanned: number;
}