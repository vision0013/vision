/**
 * 지정된 탭의 특정 요소를 하이라이트하도록 background script에 요청합니다.
 * 이 함수는 SidePanel과 같이 content_script 외부 환경에서 사용됩니다.
 * @param tabId 하이라이트를 적용할 탭의 ID
 * @param ownerId 하이라이트할 요소의 data-crawler-id
 */
export const requestHighlight = (tabId: number, ownerId: number): void => {
  chrome.runtime.sendMessage({
    action: 'highlightElement',
    tabId: tabId,
    ownerId: ownerId
  });
};