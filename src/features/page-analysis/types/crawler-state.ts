import { CrawledItem } from '../../../types';

export interface CrawlerState {
  visited: number;
  nextElementId: number;
  nextItemId: number;
  elIdMap: WeakMap<HTMLElement, number>;
  elMeta: Map<number, any>;
  items: CrawledItem[];
  seenTextGlobal: Set<string>;
}