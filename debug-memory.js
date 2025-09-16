// 메모리 상태 디버깅 스크립트
// 개발자 도구 콘솔에서 실행

async function debugMemoryStatus() {
  console.log('🔍 === 메모리 상태 디버깅 ===');

  // 1. GPU 메모리 정보
  if (navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      console.log('GPU Adapter:', adapter);

      const device = await adapter.requestDevice();
      console.log('GPU Device:', device);
      console.log('GPU Device limits:', device.limits);
    } catch (error) {
      console.log('GPU 정보 조회 실패:', error);
    }
  }

  // 2. 메모리 정보 (Chrome 전용)
  if ('memory' in performance) {
    const memory = performance.memory;
    console.log('🧠 JavaScript 메모리 상태:');
    console.log('  - 사용 중:', (memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + 'MB');
    console.log('  - 전체 할당:', (memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + 'MB');
    console.log('  - 힙 크기 한계:', (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + 'MB');
  }

  // 3. Storage 상태
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      console.log('💾 스토리지 상태:');
      console.log('  - 사용량:', (estimate.usage / 1024 / 1024).toFixed(2) + 'MB');
      console.log('  - 할당량:', (estimate.quota / 1024 / 1024).toFixed(2) + 'MB');
      console.log('  - 남은 공간:', ((estimate.quota - estimate.usage) / 1024 / 1024).toFixed(2) + 'MB');
    } catch (error) {
      console.log('스토리지 정보 조회 실패:', error);
    }
  }

  // 4. ArrayBuffer 테스트 (점진적으로 크기 증가)
  console.log('🧪 ArrayBuffer 할당 테스트:');
  const testSizes = [
    1024 * 1024 * 100,   // 100MB
    1024 * 1024 * 500,   // 500MB
    1024 * 1024 * 1000,  // 1GB
    1024 * 1024 * 2000,  // 2GB
    1024 * 1024 * 3000,  // 3GB
    1024 * 1024 * 3800   // 3.8GB (Phi-4 크기)
  ];

  for (const size of testSizes) {
    try {
      const buffer = new ArrayBuffer(size);
      console.log(`  ✅ ${(size / 1024 / 1024).toFixed(0)}MB 할당 성공`);
      // 즉시 해제하여 메모리 확보
      // buffer = null; // 참조 해제
    } catch (error) {
      console.log(`  ❌ ${(size / 1024 / 1024).toFixed(0)}MB 할당 실패: ${error.message}`);
      break; // 실패하면 더 큰 크기는 시도하지 않음
    }
  }

  // 5. 가비지 컬렉션 강제 실행 (가능한 경우)
  if (window.gc) {
    console.log('🗑️ 가비지 컬렉션 실행 중...');
    window.gc();
    console.log('✅ 가비지 컬렉션 완료');
  } else {
    console.log('ℹ️ 가비지 컬렉션 함수를 사용할 수 없음 (Chrome에서 --enable-precise-memory-info 플래그로 실행)');
  }
}

// 실행
debugMemoryStatus().catch(console.error);