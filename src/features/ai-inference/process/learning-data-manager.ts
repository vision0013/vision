import { PromptExample } from '../types/ai-types';
import {
  MODELS_DIR_NAME,
  LEARNED_EXAMPLES_FILE_NAME,
  LEARNED_EXAMPLES_BACKUP_FILE_NAME
} from '../config/opfs-config';

/**
 * AI 학습 데이터 관리자
 */
export class LearningDataManager {
  /**
   * OPFS에서 학습된 예시들 로드
   */
  static async getLearnedExamples(): Promise<PromptExample[]> {
    try {
      console.log('📖 [learning-data-manager] Loading learned examples from OPFS...');

      const opfsRoot = await navigator.storage.getDirectory();
      const modelsDir = await opfsRoot.getDirectoryHandle(MODELS_DIR_NAME, { create: true });

      try {
        const fileHandle = await modelsDir.getFileHandle(LEARNED_EXAMPLES_FILE_NAME, { create: false });
        const file = await fileHandle.getFile();
        const content = await file.text();

        if (!content.trim()) {
          console.log('📖 [learning-data-manager] Learned examples file is empty');
          return [];
        }

        const learnedExamples = JSON.parse(content);
        console.log(`📖 [learning-data-manager] Loaded ${learnedExamples.length} learned examples from OPFS`);
        return learnedExamples;

      } catch (error: any) {
        if (error.name === 'NotFoundError') {
          console.log('📖 [learning-data-manager] No learned examples file found, starting fresh');
          return [];
        }
        throw error;
      }
    } catch (error) {
      console.error('❌ [learning-data-manager] Failed to load learned examples from OPFS:', error);
      return [];
    }
  }

  /**
   * OPFS에 학습된 예시들을 JSON 파일로 저장
   */
  static async saveLearnedExamples(learnedExamples: PromptExample[]): Promise<void> {
    try {
      console.log('💾 [learning-data-manager] Saving learned examples to OPFS...');

      const opfsRoot = await navigator.storage.getDirectory();
      const modelsDir = await opfsRoot.getDirectoryHandle(MODELS_DIR_NAME, { create: true });
      const fileHandle = await modelsDir.getFileHandle(LEARNED_EXAMPLES_FILE_NAME, { create: true });

      const writable = await fileHandle.createWritable();

      // JSON 데이터를 예쁘게 포맷팅하여 저장
      const jsonContent = JSON.stringify(learnedExamples, null, 2);
      await writable.write(jsonContent);
      await writable.close();

      console.log(`💾 [learning-data-manager] Saved ${learnedExamples.length} learned examples to OPFS (${jsonContent.length} bytes)`);

    } catch (error: any) {
      console.error('❌ [learning-data-manager] Failed to save learned examples to OPFS:', error);
      throw new Error(`OPFS learned examples save failed: ${error.message}`);
    }
  }

  /**
   * OPFS에서 학습된 예시 파일 삭제 (필요시)
   */
  static async clearLearnedExamples(): Promise<void> {
    try {
      console.log('🗑️ [learning-data-manager] Clearing learned examples from OPFS...');

      const opfsRoot = await navigator.storage.getDirectory();
      const modelsDir = await opfsRoot.getDirectoryHandle('models', { create: false });

      try {
        await modelsDir.removeEntry(LEARNED_EXAMPLES_FILE_NAME);
        console.log('✅ [learning-data-manager] Learned examples file deleted from OPFS');
      } catch (error: any) {
        if (error.name === 'NotFoundError') {
          console.log('ℹ️ [learning-data-manager] No learned examples file to delete');
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      console.error('❌ [learning-data-manager] Failed to clear learned examples:', error);
      throw error;
    }
  }

  /**
   * 학습된 예시 현황 조회
   */
  static async getLearnedExamplesStats(): Promise<{ count: number, size: number }> {
    try {
      const opfsRoot = await navigator.storage.getDirectory();
      const modelsDir = await opfsRoot.getDirectoryHandle('models', { create: false });
      const fileHandle = await modelsDir.getFileHandle(LEARNED_EXAMPLES_FILE_NAME, { create: false });
      const file = await fileHandle.getFile();

      const content = await file.text();
      const examples = content.trim() ? JSON.parse(content) : [];

      return {
        count: examples.length,
        size: file.size
      };
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        return { count: 0, size: 0 };
      }
      throw error;
    }
  }

  /**
   * 실패한 테스트 케이스들을 학습 예시로 저장 (OPFS 파일)
   */
  static async learnFromFailedTests(failedTests: Array<{ command: string; expected: string; description: string }>): Promise<void> {
    console.log('🧠 [learning-data-manager] Learning from failed tests to OPFS...');

    const currentLearned = await this.getLearnedExamples();

    // 새로운 예시들을 생성 (중복 제거)
    const newExamples: PromptExample[] = failedTests
      .filter(test => !currentLearned.some(learned => learned.command === test.command))
      .map(test => ({
        command: test.command,
        action: test.expected,
        confidence: 0.95, // 학습된 예시는 높은 confidence로 설정
        reasoning: this.generateReasoningForAction(test.command, test.expected, test.description)
      }));

    if (newExamples.length > 0) {
      const updatedExamples = [...currentLearned, ...newExamples];
      await this.saveLearnedExamples(updatedExamples);
      console.log(`✅ [learning-data-manager] Learned ${newExamples.length} new examples. Total learned: ${updatedExamples.length}`);
    } else {
      console.log('ℹ️ [learning-data-manager] No new examples to learn (all already exist)');
    }
  }

  /**
   * 롤백 전 현재 데이터를 백업 파일로 저장
   */
  static async createBackupBeforeRollback(): Promise<void> {
    try {
      const currentExamples = await this.getLearnedExamples();
      const opfsRoot = await navigator.storage.getDirectory();
      const modelsDir = await opfsRoot.getDirectoryHandle(MODELS_DIR_NAME, { create: true });
      const fileHandle = await modelsDir.getFileHandle(LEARNED_EXAMPLES_BACKUP_FILE_NAME, { create: true });

      const writable = await fileHandle.createWritable();
      const jsonContent = JSON.stringify(currentExamples, null, 2);
      await writable.write(jsonContent);
      await writable.close();

      console.log('💾 [learning-data-manager] Created backup before rollback');

    } catch (error) {
      console.warn('⚠️ [learning-data-manager] Failed to create backup before rollback:', error);
      // 백업 실패해도 롤백은 계속 진행
    }
  }

  /**
   * 액션에 대한 적절한 reasoning 생성
   */
  private static generateReasoningForAction(command: string, action: string, description?: string): string {
    const baseReasonings = {
      'product_search': `'${command}'에서 제품 검색 의도가 명확하여 상품 검색으로 분류`,
      'price_comparison': `'${command}'에서 가격, 최저가, 비교 등의 키워드가 포함되어 가격 비교로 분류`,
      'simple_find': `'${command}'에서 버튼, 클릭, 찾기 등 UI 조작 의도가 명확함`,
      'purchase_flow': `'${command}'에서 구매, 주문, 장바구니 등 구매 프로세스 진행 의도`,
      'navigation': `'${command}'에서 페이지 이동, 뒤로가기 등 네비게이션 의도`
    };

    const baseReasoning = baseReasonings[action as keyof typeof baseReasonings] ||
      `'${command}'에서 ${action} 카테고리의 특징적 요소가 식별됨`;

    return description ? `${baseReasoning}. ${description}` : baseReasoning;
  }
}