import { useState, useEffect } from 'react';
import { AnalysisResult, CrawledItem } from '../types';
import './App.css';

function App() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const crawlCurrentPage = async () => {
    setLoading(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tab && tab.id) {
        const tabId = tab.id;

        chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('콘텐츠 스크립트 연결 실패:', chrome.runtime.lastError.message);
            alert('페이지에 연결할 수 없습니다. 페이지를 새로고침한 후 다시 시도해 주세요.');
            setLoading(false);
            return;
          }

          if (response?.status === 'ready') {
            chrome.tabs.sendMessage(
              tabId,
              { action: 'crawl' },
              (crawlResponse) => {
                if (chrome.runtime.lastError) {
                  console.error('크롤링 실패:', chrome.runtime.lastError.message);
                  setLoading(false);
                  return;
                }

                if (crawlResponse?.success) {
                  setAnalysisResult(crawlResponse.data);
                  chrome.storage.local.set({ lastCrawl: crawlResponse.data });
                }
                setLoading(false);
              }
            );
          } else {
            alert('페이지 크롤러가 준비되지 않았습니다. 페이지를 새로고침하고 다시 시도해 주세요.');
            setLoading(false);
          }
        });
      } else {
        console.error('활성 탭을 찾을 수 없습니다.');
        setLoading(false);
      }
    } catch (error) {
      console.error('크롤링 오류:', error);
      setLoading(false);
    }
  };

  // 팝업이 처음 열릴 때 스토리지에서 데이터 로드
  useEffect(() => {
    chrome.storage.local.get(['lastCrawl'], (result) => {
      if (result.lastCrawl) {
        setAnalysisResult(result.lastCrawl);
      }
    });
  }, []);

  // 백그라운드로부터 오는 실시간 업데이트 메시지를 수신
  useEffect(() => {
    const messageListener = (request: any) => {
      if (request.action === 'updatePopup') {
        setAnalysisResult(request.data);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // 팝업이 닫힐 때 리스너를 정리
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

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
            onClick={crawlCurrentPage}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Crawling...' : 'Crawl Page'}
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