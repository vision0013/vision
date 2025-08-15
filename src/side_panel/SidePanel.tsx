import { useState, useEffect } from 'react';
import { AnalysisResult, CrawledItem } from '../types';
import './SidePanel.css';

function SidePanel() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTabId, setActiveTabId] = useState<number | null>(null);

  // 컴포넌트 마운트 시 현재 활성 탭 ID를 가져오고 메시지 리스너 설정
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        setActiveTabId(tabs[0].id);
      }
    });

    const messageListener = (request: any) => {
      if (request.action === 'updatePanelData') {
        setAnalysisResult(request.data);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // 컴포넌트 언마운트 시 리스너 제거
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  const handleItemClick = (ownerId: number) => {
    if (activeTabId) {
      chrome.runtime.sendMessage({
        action: 'highlightElement',
        tabId: activeTabId,
        ownerId: ownerId,
      });
    }
  };

  const getFilteredItems = (): CrawledItem[] => {
    if (!analysisResult) return [];
    
    let items = analysisResult.items;
    if (filter !== 'all') {
      items = items.filter(item => item.type === filter);
    }
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      items = items.filter(item => 
        item.text?.toLowerCase().includes(searchLower) ||
        item.alt?.toLowerCase().includes(searchLower) ||
        item.label?.toLowerCase().includes(searchLower) ||
        item.href?.toLowerCase().includes(searchLower)
      );
    }
    
    return items;
  };

  const exportData = () => {
    if (!analysisResult) return;
    const dataStr = JSON.stringify(analysisResult, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `crawl-${new Date().getTime()}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const filteredItems = getFilteredItems();

  if (!analysisResult) {
    return <div className="app" style={{ padding: '20px', textAlign: 'center' }}>Loading page data...</div>;
  }
  
  return (
    <div className="app">
      <header className="header">
        <h1>Page Crawler</h1>
        <div className="controls">
          {analysisResult && (
            <button onClick={exportData} className="btn btn-secondary">
              Export JSON
            </button>
          )}
        </div>
      </header>

      <>
        <div className="stats">
          <div className="stat">
            <span className="stat-label">URL:</span>
            <span className="stat-value">{analysisResult.url}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Items:</span>
            <span className="stat-value">{analysisResult.items.length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Time:</span>
            <span className="stat-value">{analysisResult.elapsedMs}ms</span>
          </div>
          <div className="stat">
            <span className="stat-label">Nodes visited:</span>
            <span className="stat-value">{analysisResult.visited}</span>
          </div>
        </div>

        <div className="filters">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="text">Text</option>
            <option value="image">Images</option>
            <option value="link">Links</option>
            <option value="button">Buttons</option>
          </select>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="results">
          <div className="results-header">
            Showing {filteredItems.length} items
          </div>
          <div className="items-list">
            {filteredItems.slice(0, 100).map((item) => (
              <div
                key={item.id}
                className={`item item-${item.type}`}
                onClick={() => handleItemClick(item.ownerId)}
                style={{ cursor: 'pointer' }}
              >
                <div className="item-header">
                  <span className="item-type">{item.type}</span>
                  <span className="item-tag">{item.tag}</span>
                  <span className="item-role">{item.role}</span>
                </div>
                {/* ✨ 변경: item.text가 있으면 먼저 보여주고, 그 다음에 다른 속성들을 보여줍니다. */}
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
      </>
    </div>
  );
}

export default SidePanel;
