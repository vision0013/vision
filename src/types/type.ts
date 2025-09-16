export type Mode = 'navigate' | 'search' | 'chat';

export interface BoundingBox {
  top: number;
  left: number;
  width: number;
  height: number;
  hidden?: boolean;
}

export type ItemType = 'text' | 'image' | 'link' | 'button' | 'container' | 'input' | 'textarea' | 'select' | 'iframe';

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
  hidden?: boolean;
  inputType?: string;
  placeholder?: string;
  state: {
    isDisabled: boolean;
    isChecked?: boolean;
    isFocused: boolean;
  };
  isClickable: boolean;
  isInputtable: boolean;
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

export interface ICrawler {
  analyze(): Promise<AnalysisResult>;
  analyzeElements(elements: HTMLElement[]): CrawledItem[];
}