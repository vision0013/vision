import {
  MODELS_DIR_NAME,
  getModelFileName,
  PROGRESS_UPDATE_INTERVAL,
  LOG_INTERVAL_MS
} from '../config/opfs-config';
import { ModelDownloadProgress, ModelInfo } from '../types/ai-types';

/**
 * OPFS 파일 시스템 관리자
 */
export class OPFSFileManager {
  /**
   * OPFS에서 모델 존재 여부 확인
   */
  static async checkModelExists(modelId: string): Promise<boolean> {
    const modelFileName = getModelFileName(modelId);

    console.log(`🔍 [opfs-manager] Checking OPFS file existence for ${modelId}...`);

    try {
      const opfsRoot = await navigator.storage.getDirectory();
      const modelsDir = await opfsRoot.getDirectoryHandle(MODELS_DIR_NAME, { create: false });
      const fileHandle = await modelsDir.getFileHandle(modelFileName, { create: false });
      const file = await fileHandle.getFile();

      const exists = file.size > 0;
      console.log(`🔍 [opfs-manager] Found model ${modelId} in OPFS: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return exists;
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        console.log(`🔍 [opfs-manager] No model file found in OPFS: ${modelFileName}`);
        return false;
      } else {
        console.error(`❌ [opfs-manager] Failed to check OPFS model existence for ${modelId}:`, error);
        return false;
      }
    }
  }

  /**
   * OPFS에서 모델 파일의 Object URL 반환
   */
  static async getModelFileURL(modelId: string): Promise<string> {
    try {
      const modelFileName = getModelFileName(modelId);
      console.log(`🔗 [opfs-manager] Getting OPFS root directory for ${modelId}...`);
      const opfsRoot = await navigator.storage.getDirectory();

      console.log('🔗 [opfs-manager] Getting models directory...');
      const modelsDir = await opfsRoot.getDirectoryHandle(MODELS_DIR_NAME, { create: false });

      console.log(`🔗 [opfs-manager] Getting file handle for: ${modelFileName}`);
      const fileHandle = await modelsDir.getFileHandle(modelFileName, { create: false });

      console.log('🔗 [opfs-manager] Getting file object...');
      const file = await fileHandle.getFile();
      console.log(`🔗 [opfs-manager] File size for ${modelId}: ${(file.size / 1024 / 1024).toFixed(2)}MB`);

      const fileUrl = URL.createObjectURL(file);
      console.log(`🔗 [opfs-manager] Created file URL from OPFS for ${modelId}: ${fileUrl}`);

      return fileUrl;

    } catch (error: any) {
      console.error(`❌ [opfs-manager] Failed to get OPFS file URL for ${modelId}:`, error);
      console.error('❌ [opfs-manager] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw new Error(`OPFS file URL creation failed for ${modelId}: ${error.message}`);
    }
  }

  /**
   * OPFS 파일 쓰기용 WritableStream 생성
   */
  static async createFileWriter(modelId: string): Promise<{ writable: FileSystemWritableFileStream, fileHandle: FileSystemFileHandle }> {
    try {
      const modelFileName = getModelFileName(modelId);
      console.log(`📁 [opfs-manager] Creating OPFS file writer for ${modelId}...`);

      const opfsRoot = await navigator.storage.getDirectory();
      const modelsDir = await opfsRoot.getDirectoryHandle(MODELS_DIR_NAME, { create: true });
      const fileHandle = await modelsDir.getFileHandle(modelFileName, { create: true });
      const writable = await fileHandle.createWritable();

      console.log(`📄 [opfs-manager] Created OPFS writable stream: ${modelFileName}`);
      return { writable, fileHandle };

    } catch (error: any) {
      console.error(`❌ [opfs-manager] Failed to create OPFS writer for ${modelId}:`, error);
      throw new Error(`OPFS writer creation failed: ${error.message}`);
    }
  }

  /**
   * OPFS 캐시된 모델 삭제
   */
  static async deleteModel(modelId: string): Promise<void> {
    const modelFileName = getModelFileName(modelId);

    try {
      const opfsRoot = await navigator.storage.getDirectory();
      const modelsDir = await opfsRoot.getDirectoryHandle(MODELS_DIR_NAME, { create: false });
      await modelsDir.removeEntry(modelFileName);
      console.log(`✅ [opfs-manager] OPFS model file deleted: ${modelFileName}`);
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        console.log(`ℹ️ [opfs-manager] Model file not found in OPFS: ${modelFileName}`);
      } else {
        console.error(`❌ [opfs-manager] Failed to delete OPFS model ${modelId}:`, error);
        throw error;
      }
    }
  }

  /**
   * 스트리밍 방식으로 모델 다운로드 및 OPFS 저장
   */
  static async downloadModelToOPFS(
    modelId: string,
    modelInfo: ModelInfo,
    token?: string,
    progressCallback?: (progress: ModelDownloadProgress) => void,
    abortSignal?: AbortSignal
  ): Promise<boolean> {
    console.log(`📥 [opfs-manager] Downloading model ${modelInfo.name} from Hugging Face...`);

    // 다운로드 진행률 초기화
    const downloadProgress: ModelDownloadProgress = {
      modelId: modelId,
      progress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      status: 'downloading'
    };

    try {
      const modelPath = modelInfo.modelPath;
      console.log(`🔗 [opfs-manager] Attempting to fetch: ${modelPath}`);

      const headers: Record<string, string> = {
        'User-Agent': 'Chrome Extension Crawler v4.18.1',
      };

      // 토큰이 필요한 모델만 인증 헤더 추가
      if (modelInfo.requiresToken) {
        if (!token) {
          throw new Error(`Model ${modelInfo.name} requires authentication token`);
        }
        headers.Authorization = `Bearer ${token}`;
        console.log('🔑 [opfs-manager] Using token:', `${token.substring(0, 10)}...`);
      } else {
        console.log('🔓 [opfs-manager] No authentication required for this model');
      }

      const response = await fetch(modelPath, {
        headers,
        signal: abortSignal
      });

      console.log('📡 [opfs-manager] Response status:', response.status, response.statusText);
      console.log('📡 [opfs-manager] Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error(`Failed to download model: ${response.status} ${response.statusText}`);
      }

      console.log('📊 [opfs-manager] Starting model download to OPFS, this may take several minutes...');

      // 스트리밍 방식으로 OPFS에 직접 저장 (메모리 안전)
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const contentLength = parseInt(response.headers.get('content-length') || '0');
      console.log(`📦 [opfs-manager] Expected size: ${(contentLength / 1024 / 1024).toFixed(2)}MB`);

      // 다운로드 진행률 초기화
      downloadProgress.totalBytes = contentLength;

      // OPFS 파일 핸들 생성
      const { writable } = await this.createFileWriter(modelId);
      let receivedLength = 0;
      let lastProgressUpdate = 0;
      let lastLogTime = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // OPFS에 직접 스트리밍 쓰기
          await writable.write(value);
          receivedLength += value.length;

          // 실시간 진행률 업데이트
          const currentProgress = contentLength > 0 ? Math.floor((receivedLength / contentLength) * 100) : 0;
          const currentTime = Date.now();

          downloadProgress.downloadedBytes = receivedLength;
          downloadProgress.progress = currentProgress;

          // UI에 실시간 진행률 전송 (1%마다)
          if (currentProgress - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL) {
            progressCallback?.(downloadProgress);
            lastProgressUpdate = currentProgress;
          }

          // 로그 출력 (1초마다만)
          if (currentTime - lastLogTime >= LOG_INTERVAL_MS) {
            console.log(`📊 [opfs-manager] Download progress: ${(receivedLength / 1024 / 1024).toFixed(1)}MB / ${(contentLength / 1024 / 1024).toFixed(1)}MB (${currentProgress}%)`);
            lastLogTime = currentTime;
          }
        }

        // 파일 쓰기 완료
        await writable.close();
        console.log(`✅ [opfs-manager] Download complete to OPFS: ${(receivedLength / 1024 / 1024).toFixed(2)}MB`);

        // 다운로드 진행률 완료 업데이트
        downloadProgress.progress = 100;
        downloadProgress.status = 'completed';
        progressCallback?.(downloadProgress); // 완료 상태 전송

        return true;

      } catch (writeError) {
        // 쓰기 실패 시 파일 정리
        await writable.abort();
        downloadProgress.status = 'error';
        downloadProgress.error = 'Write failed';
        progressCallback?.(downloadProgress); // 에러 상태 전송
        throw writeError;
      }

    } catch (error: any) {
      console.error('❌ [opfs-manager] Full error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });

      // 다운로드 진행률 에러 업데이트
      downloadProgress.status = 'error';
      downloadProgress.error = error.message;
      progressCallback?.(downloadProgress); // 에러 상태 전송

      if (error.name === 'AbortError') {
        console.error('❌ [opfs-manager] Download aborted (timeout or user cancellation)');

        // 불완전한 파일 정리
        try {
          await this.deleteModel(modelId);
          console.log('🗑️ [opfs-manager] Incomplete download file cleaned up');
        } catch (cleanupError) {
          console.warn('⚠️ [opfs-manager] Failed to cleanup incomplete file:', cleanupError);
        }
      } else if (error.message.includes('Failed to fetch')) {
        const errorMsg = modelInfo.requiresToken
          ? 'Network error. Check your internet connection or Hugging Face token.'
          : 'Network error. Check your internet connection.';
        console.error(`❌ [opfs-manager] Network error during download of ${modelInfo.name}`);
        throw new Error(errorMsg);
      } else {
        console.error(`❌ [opfs-manager] Failed to download ${modelInfo.name}:`, error);
        throw error;
      }

      return false;
    }
  }
}