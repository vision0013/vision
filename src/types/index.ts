export interface BoundingBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

export type ItemType = 'text' | 'image' | 'link' | 'button';

export interface CrawledItem {
  id: number;
  ownerId: number;
  parentId: number | null;
  tag: string;
  role: string;
  rect: BoundingBox;
  type: ItemType;
  text?: string;
  alt?: string;
  title?: string;
  src?: string;
  href?: string;
  label?: string;
}

export interface AnalysisResult {
  url: string;
  userAgent: string;
  visited: number;
  elapsedMs: number;
  items: CrawledItem[];
}

export interface MessagePayload {
  type: string;
  payload?: AnalysisResult;
}