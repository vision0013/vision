export function openExtensionSettings(): void {
  try {
    // 현재 확장 프로그램의 ID를 가져옵니다.
    const extensionId = chrome.runtime.id;
    
    // 설정 페이지 URL을 생성합니다.
    const settingsUrl = `chrome://settings/content/siteDetails?site=chrome-extension://${extensionId}`;
    
    // 새 탭에서 설정 페이지를 엽니다.
    chrome.tabs.create({ url: settingsUrl });
  } catch (error) {
    console.error('Failed to open extension settings:', error);
  }
}

export function getExtensionId(): string {
  return chrome.runtime.id;
}