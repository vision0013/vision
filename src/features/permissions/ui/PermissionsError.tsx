import React from 'react';

// CSS에서 사용할 수 있도록 별도의 스타일을 추가할 수 있습니다.
// 여기서는 인라인 스타일로 간단하게 처리합니다.
const errorStyle: React.CSSProperties = {
  backgroundColor: '#fffbe6',
  border: '1px solid #ffe58f',
  borderRadius: '6px',
  padding: '12px 16px',
  margin: '0 16px 12px 16px',
  fontSize: '13px',
  color: '#d46b08',
};

const linkStyle: React.CSSProperties = {
  color: '#d46b08',
  fontWeight: 'bold',
  textDecoration: 'underline',
  cursor: 'pointer'
};

export const PermissionsError: React.FC = () => {
  // 확장 프로그램 설정 페이지를 여는 함수
  const openExtensionSettings = () => {
    // 'chrome-extension://'으로 시작하는 현재 확장 프로그램의 ID를 가져옵니다.
    const extensionId = chrome.runtime.id;
    // 설정 페이지 URL을 만듭니다.
    const settingsUrl = `chrome://settings/content/siteDetails?site=chrome-extension://${extensionId}`;
    // 새 탭에서 설정 페이지를 엽니다.
    chrome.tabs.create({ url: settingsUrl });
  };

  return (
    <div style={errorStyle}>
      <strong>마이크 권한이 필요합니다.</strong>
      <p style={{ marginTop: '4px' }}>
        음성 인식을 사용하려면 마이크 접근 권한을 허용해야 합니다. 
        <span onClick={openExtensionSettings} style={linkStyle}>
          여기를 클릭
        </span>
        하여 설정에서 마이크 권한을 "허용"으로 변경해주세요.
      </p>
    </div>
  );
};
