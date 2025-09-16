import { LearningSnapshot } from '../types/ai-types';
import {
  MODELS_DIR_NAME,
  SNAPSHOTS_DIR_NAME,
  MAX_SNAPSHOTS
} from '../config/opfs-config';
import { LearningDataManager } from './learning-data-manager';

/**
 * 학습 데이터 스냅샷 관리자
 */
export class SnapshotManager {
  /**
   * 현재 학습 데이터의 스냅샷 생성 (학습 전 백업)
   */
  static async createSnapshot(description?: string): Promise<LearningSnapshot> {
    try {
      console.log('📸 [snapshot-manager] Creating learning data snapshot...');

      // 최대 스냅샷 수 확인 및 정리
      const snapshots = await this.getSnapshots();
      if (snapshots.length >= MAX_SNAPSHOTS) {
        // 가장 오래된 스냅샷 찾기 (생성 날짜 오름차순 정렬)
        const oldestSnapshot = snapshots.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
        if (oldestSnapshot) {
          console.log(`🗑️ [snapshot-manager] Max snapshots reached. Deleting oldest: ${oldestSnapshot.name}`);
          await this.deleteSnapshot(oldestSnapshot.id);
        }
      }

      const currentExamples = await LearningDataManager.getLearnedExamples();
      const snapshotId = `snapshot_${Date.now()}`;
      const snapshotName = description || `Auto backup ${new Date().toLocaleString()}`;

      const snapshot: LearningSnapshot = {
        id: snapshotId,
        name: snapshotName,
        createdAt: new Date(),
        examples: currentExamples,
        description
      };

      // 스냅샷을 OPFS에 저장
      await this.saveSnapshotToOPFS(snapshot);

      console.log(`📸 [snapshot-manager] Snapshot created: ${snapshotId} with ${currentExamples.length} examples`);
      return snapshot;

    } catch (error: any) {
      console.error('❌ [snapshot-manager] Failed to create snapshot:', error);
      throw new Error(`Snapshot creation failed: ${error.message}`);
    }
  }

  /**
   * 특정 스냅샷으로 롤백
   */
  static async rollbackToSnapshot(snapshotId: string): Promise<boolean> {
    try {
      console.log(`⏪ [snapshot-manager] Rolling back to snapshot: ${snapshotId}`);

      const snapshot = await this.loadSnapshotFromOPFS(snapshotId);
      if (!snapshot) {
        throw new Error(`Snapshot not found: ${snapshotId}`);
      }

      // 현재 데이터를 백업용으로 저장
      await LearningDataManager.createBackupBeforeRollback();

      // 스냅샷 데이터로 현재 파일 교체
      await LearningDataManager.saveLearnedExamples(snapshot.examples);

      console.log(`⏪ [snapshot-manager] Successfully rolled back to snapshot: ${snapshotId}`);
      console.log(`📊 [snapshot-manager] Restored ${snapshot.examples.length} examples from ${snapshot.name}`);

      return true;

    } catch (error: any) {
      console.error('❌ [snapshot-manager] Rollback failed:', error);
      throw new Error(`Rollback failed: ${error.message}`);
    }
  }

  /**
   * 모든 스냅샷 목록 조회
   */
  static async getSnapshots(): Promise<LearningSnapshot[]> {
    try {
      const opfsRoot = await navigator.storage.getDirectory();
      const modelsDir = await opfsRoot.getDirectoryHandle(MODELS_DIR_NAME, { create: true });

      try {
        const snapshotsDir = await modelsDir.getDirectoryHandle(SNAPSHOTS_DIR_NAME, { create: false });
        const snapshots: LearningSnapshot[] = [];

        // @ts-ignore - OPFS의 entries() 메서드 사용
        for await (const [name, handle] of snapshotsDir.entries()) {
          if (handle.kind === 'file' && name.endsWith('.json')) {
            try {
              const file = await handle.getFile();
              const content = await file.text();
              const snapshot = JSON.parse(content);

              // Date 객체로 변환
              snapshot.createdAt = new Date(snapshot.createdAt);
              snapshots.push(snapshot);
            } catch (error) {
              console.warn(`⚠️ [snapshot-manager] Failed to load snapshot ${name}:`, error);
            }
          }
        }

        // 생성 시간순으로 정렬 (최신순)
        return snapshots.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      } catch (error: any) {
        if (error.name === 'NotFoundError') {
          console.log('📸 [snapshot-manager] No snapshots directory found');
          return [];
        }
        throw error;
      }
    } catch (error) {
      console.error('❌ [snapshot-manager] Failed to get snapshots:', error);
      return [];
    }
  }

  /**
   * 특정 스냅샷 삭제
   */
  static async deleteSnapshot(snapshotId: string): Promise<boolean> {
    try {
      console.log(`🗑️ [snapshot-manager] Deleting snapshot: ${snapshotId}`);

      const opfsRoot = await navigator.storage.getDirectory();
      const modelsDir = await opfsRoot.getDirectoryHandle('models', { create: false });
      const snapshotsDir = await modelsDir.getDirectoryHandle(SNAPSHOTS_DIR_NAME, { create: false });

      const fileName = `${snapshotId}.json`;
      await snapshotsDir.removeEntry(fileName);

      console.log(`✅ [snapshot-manager] Snapshot deleted: ${snapshotId}`);
      return true;

    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        console.log(`ℹ️ [snapshot-manager] Snapshot not found: ${snapshotId}`);
        return false;
      }
      console.error('❌ [snapshot-manager] Failed to delete snapshot:', error);
      return false;
    }
  }

  /**
   * 스냅샷을 OPFS에 저장
   */
  private static async saveSnapshotToOPFS(snapshot: LearningSnapshot): Promise<void> {
    try {
      const opfsRoot = await navigator.storage.getDirectory();
      const modelsDir = await opfsRoot.getDirectoryHandle(MODELS_DIR_NAME, { create: true });
      const snapshotsDir = await modelsDir.getDirectoryHandle(SNAPSHOTS_DIR_NAME, { create: true });

      const fileName = `${snapshot.id}.json`;
      const fileHandle = await snapshotsDir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();

      const jsonContent = JSON.stringify(snapshot, null, 2);
      await writable.write(jsonContent);
      await writable.close();

      console.log(`💾 [snapshot-manager] Snapshot saved to OPFS: ${fileName} (${jsonContent.length} bytes)`);

    } catch (error: any) {
      console.error('❌ [snapshot-manager] Failed to save snapshot to OPFS:', error);
      throw new Error(`Snapshot save failed: ${error.message}`);
    }
  }

  /**
   * OPFS에서 스냅샷 로드
   */
  private static async loadSnapshotFromOPFS(snapshotId: string): Promise<LearningSnapshot | null> {
    try {
      const opfsRoot = await navigator.storage.getDirectory();
      const modelsDir = await opfsRoot.getDirectoryHandle('models', { create: false });
      const snapshotsDir = await modelsDir.getDirectoryHandle(SNAPSHOTS_DIR_NAME, { create: false });

      const fileName = `${snapshotId}.json`;
      const fileHandle = await snapshotsDir.getFileHandle(fileName, { create: false });
      const file = await fileHandle.getFile();
      const content = await file.text();

      const snapshot = JSON.parse(content);
      snapshot.createdAt = new Date(snapshot.createdAt);

      return snapshot;

    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        console.log(`📸 [snapshot-manager] Snapshot not found: ${snapshotId}`);
        return null;
      }
      console.error('❌ [snapshot-manager] Failed to load snapshot from OPFS:', error);
      return null;
    }
  }
}