// OPFS 파일 시스템 설정 상수

// OPFS 디렉토리 및 파일명 설정
export const MODELS_DIR_NAME = 'models';

// 모델별 파일명 생성 함수
export function getModelFileName(modelId: string): string {
  return `${modelId}.task`;
}

// 다운로드 설정
export const DOWNLOAD_TIMEOUT_MS = 10 * 60 * 1000; // 10분 타임아웃
export const PROGRESS_UPDATE_INTERVAL = 1; // 1%마다 UI 업데이트
export const LOG_INTERVAL_MS = 1000; // 1초마다 로그 출력