import React from 'react';
import { CrawledItem } from '../../../../types';

interface ResultsListProps {
  items: CrawledItem[];
  onItemClick: (ownerId: number) => void;
}

export const ResultsList: React.FC<ResultsListProps> = ({ items, onItemClick }) => {
  return (
    <div className="results">
      <div className="results-header">Showing {items.length} items</div>
      <div className="items-list">
        {items.slice(0, 100).map((item) => (
          <div
            key={item.id}
            className={`item item-${item.type}`}
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
        ))}
      </div>
    </div>
  );
};