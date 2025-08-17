export interface BoundingBox {
  top: number;
  left: number;
  width: number;
  height: number;
    hidden?: boolean;  // 숨겨진 상태

}

export type ItemType = 'text' | 'image' | 'link' | 'button' |'container';

export interface CrawledItem {
  id: number;
  ownerId: number;
  parentId: number | null;
  tag: string;
  role: string;
  rect: BoundingBox;
  type: ItemType;
  // 일반 텍스트 내용 또는 링크(<a>)의 텍스트를 저장합니다.
  text?: string;
  alt?: string;
  title?: string;
  src?: string;
  href?: string;
  label?: string;
    hidden?: boolean;  // 숨겨진 상태 플래그

}

export interface AnalysisResult {
  url: string;
  userAgent: string;
  visited: number;
  elapsedMs: number;
  items: CrawledItem[];
    stats?: {
    total: number;
    visible: number;
    hidden: number;
  };
}

export interface MessagePayload {
  type: string;
  payload?: AnalysisResult;
}
