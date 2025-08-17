import { CSSProperties } from 'react';

export const PERMISSION_STYLES = {
  container: {
    backgroundColor: '#fffbe6',
    border: '1px solid #ffe58f',
    borderRadius: '6px',
    padding: '12px 16px',
    margin: '0 16px 12px 16px',
    fontSize: '13px',
    color: '#d46b08',
  } as CSSProperties,

  link: {
    color: '#d46b08',
    fontWeight: 'bold',
    textDecoration: 'underline',
    cursor: 'pointer'
  } as CSSProperties,

  description: {
    marginTop: '4px'
  } as CSSProperties
} as const;

export const MESSAGES = {
  title: '마이크 권한이 필요합니다.',
  description: '음성 인식을 사용하려면 마이크 접근 권한을 허용해야 합니다.',
  linkText: '여기를 클릭',
  instruction: '하여 설정에서 마이크 권한을 "허용"으로 변경해주세요.'
} as const;