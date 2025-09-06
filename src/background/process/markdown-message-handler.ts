import TurndownService from 'turndown';
import { BackgroundMessage } from '../types/background-types';

// Main handler function that will be registered in the router
export async function handleMarkdownMessage(request: BackgroundMessage, _sender: chrome.runtime.MessageSender): Promise<any> {
    switch (request.action) {
        case 'GET_PAGE_CONTENT':
            return await handleGetPageContent();
        
        case 'PROCESS_HTML_TO_MARKDOWN':
            return await handleProcessHtmlToMarkdown(request as unknown as { html: string; title: string; });

        case 'DOWNLOAD_MARKDOWN':
            return await handleDownloadMarkdown(request as unknown as { markdown: string; title: string; });

        default:
            console.warn(`Unknown markdown action: ${request.action}`);
            return { error: `Unknown markdown action: ${request.action}` };
    }
}


async function handleGetPageContent() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0 && tabs[0].id) {
      // Use 'action' for consistency
      await chrome.tabs.sendMessage(tabs[0].id, { action: 'FETCH_MAIN_CONTENT' });
    } else {
      console.error('Markdown Handler: No active tab found.');
      // Inform the side-panel about the error
      await chrome.runtime.sendMessage({
        action: 'MARKDOWN_RESULT',
        markdown: '오류: 활성 탭을 찾을 수 없습니다. 브라우저의 현재 탭에서 다시 시도해주세요.',
        title: '오류'
      });
    }
  } catch (error) {
    console.error('Error in handleGetPageContent:', error);
    await chrome.runtime.sendMessage({
        action: 'MARKDOWN_RESULT',
        markdown: `오류가 발생했습니다: ${(error as Error).message}`, 
        title: '오류'
    });
  }
}

async function handleProcessHtmlToMarkdown(request: { html: string; title: string; }) {
  try {
    const turndownService = new TurndownService({ headingStyle: 'atx' });
    const markdown = turndownService.turndown(request.html);
    
    // Send the result back to the side panel
    await chrome.runtime.sendMessage({
      action: 'MARKDOWN_RESULT',
      markdown: markdown,
      title: request.title
    });
  } catch (error) {
      console.error('Error converting HTML to Markdown:', error);
      await chrome.runtime.sendMessage({
        action: 'MARKDOWN_RESULT',
        markdown: `마크다운 변환 중 오류가 발생했습니다: ${(error as Error).message}`, 
        title: '변환 오류'
    });
  }
}

async function handleDownloadMarkdown(request: { markdown: string; title: string; }) {
  try {
    const { markdown, title } = request;
    
    // Sanitize filename
    const safeTitle = title.replace(/[\\/\:\"*?<>|]/g, '_').replace(/\s+/g, ' ').trim();
    const filename = `${safeTitle || 'Untitled'}.md`;

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    await chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true // Ask user where to save
    });
  } catch (error) {
      console.error('Error during download:', error);
  }
}
