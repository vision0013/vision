import { useState } from 'react';
import { AnalysisResult, CrawledItem } from '../types';
import './App.css';

// App 컴포넌트가 크롤링된 초기 데이터를 props로 받도록 수정합니다.
function App({ initialData }: { initialData: AnalysisResult }) {
  // useState를 사용하지 않고 prop을 직접 사용하도록 변경하여 경고를 제거합니다.
  const analysisResult = initialData;
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 수동 크롤링 버튼은 이제 새로고침을 안내하는 역할만 합니다.
  const refreshCrawl = () => {
    // confirm은 확장 프로그램 환경에서 불안정할 수 있으므로 alert로 변경합니다.
    alert('페이지를 새로고침하여 다시 크롤링할 수 있습니다.');
    window.location.reload();
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

  return (
    <div className="app">
      <header className="header">
        <h1>Page Crawler</h1>
        <div className="controls">
          <button
            onClick={refreshCrawl}
            className="btn btn-primary"
          >
            Refresh Crawl
          </button>
          {analysisResult && (
            <button onClick={exportData} className="btn btn-secondary">
              Export JSON
            </button>
          )}
        </div>
      </header>

      {analysisResult && (
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
                <div key={item.id} className={`item item-${item.type}`}>
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
        </>
      )}
    </div>
  );
}

export default App;
