// Offscreen Document 관리자 - Chrome Extension API 래퍼

export class OffscreenManager {
  private ready = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Offscreen Document 준비 보장 (중복 생성 방지)
   */
  async ensureReady(): Promise<void> {
    if (this.ready) return;
    
    // 이미 초기화 중이면 기존 Promise 반환
    if (this.initPromise) {
      return this.initPromise;
    }
    
    this.initPromise = this.createOffscreenDocument();
    await this.initPromise;
  }

  /**
   * 준비 상태 확인
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * Offscreen 준비 완료 알림 (background.ts에서 호출)
   */
  onReady(): void {
    this.ready = true;
    this.initPromise = null;
  }

  /**
   * 실제 Offscreen Document 생성
   */
  private async createOffscreenDocument(): Promise<void> {
    if (!chrome.offscreen) {
      throw new Error('❌ Offscreen API not supported');
    }
    
    try {
      // 이미 존재하는지 확인
      if (await chrome.offscreen.hasDocument?.()) {
        console.log('📄 [offscreen] Document already exists');
        this.ready = true;
        return;
      }
    } catch (error) {
      console.log('⚠️ [offscreen] hasDocument check failed, proceeding...');
    }
    
    try {
      console.log('🔨 [offscreen] Creating document...');
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: [chrome.offscreen.Reason.WORKERS],
        justification: 'AI inference using MediaPipe requires DOM context'
      });
      console.log('✅ [offscreen] Document created successfully');
    } catch (error: any) {
      console.error('❌ [offscreen] Failed to create document:', error.message);
      throw error;
    }
  }
}

// 싱글톤 인스턴스
export const offscreenManager = new OffscreenManager();