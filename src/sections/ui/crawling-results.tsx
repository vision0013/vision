import React from 'react';
import { CrawledItem } from '../../types';

interface ResultsListProps {
  items: CrawledItem[];
  onItemClick: (ownerId: number) => void;
  // ✨ [신규] 현재 활성화된 요소 ID
  activeElementId?: number | null;
}

export const ResultsList: React.FC<ResultsListProps> = ({ items, onItemClick, activeElementId }) => {
  // ✨ [수정] 컨테이너를 제외한, 실제 화면에 표시될 아이템 목록을 미리 계산합니다.
  const visibleItems = items.filter(item => item.type !== 'container');

  return (
    <div className="results">
      {/* ✨ [수정] 헤더에 표시되는 아이템 개수도 실제 보이는 요소들의 개수를 기준으로 변경합니다. */}
      <div className="results-header">Showing {visibleItems.length} items</div>
      <div className="items-list">
        {/* ✨ [수정] 기존 items 배열 대신, 컨테이너가 필터링된 visibleItems 배열을 사용하여 목록을 그립니다. */}
        {visibleItems.slice(0, 100).map((item) => {
          // ✨ [신규] 현재 활성화된 요소인지 확인
          const isActive = activeElementId === item.ownerId;
          
          return (
            <div
              key={item.id}
              className={`item item-${item.type}${isActive ? ' item-active' : ''}`}
              onClick={() => onItemClick(item.ownerId)}
              style={{ cursor: 'pointer' }}
            >
            <div className="item-header">
              <span className="item-type">{item.type}</span>
              <span className="item-tag">{item.tag}</span>
              <span className="item-role">{item.role}</span>
            </div>
            <div className="item-content">
              {item.text && <div className="item-text">{item.text}</div>}
              {item.href && <div className="item-link">→ {item.href}</div>}
              {item.src && <div className="item-src">Image: {item.src}</div>}
              {item.alt && <div className="item-alt">Alt: {item.alt}</div>}
              {item.label && <div className="item-label">Label: {item.label}</div>}
            </div>
            <div className="item-position">
              {item.rect.left}, {item.rect.top} • {item.rect.width}×{item.rect.height}
            </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
