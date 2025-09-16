// 콘솔에서 실행해서 현재 모델 확인
// 개발자 도구 → 콘솔에서 복사해서 실행하세요

async function checkCurrentModel() {
  try {
    console.log('🔍 현재 AI 모델 상태 확인 중...');

    const response = await chrome.runtime.sendMessage({
      action: 'getAIModelStatus'
    });

    if (response.success && response.status) {
      console.log('📊 AI 모델 상태:', response.status);
      console.log('🤖 현재 모델 ID:', response.status.currentModelId);
      console.log('📈 모델 상태:', {
        1: '토큰 필요',
        2: '로딩 중',
        3: '로드 완료',
        4: '캐시됨, 로드 필요'
      }[response.status.state] || '알 수 없음');

      if (response.status.loadTime) {
        console.log('⏱️ 로드 시간:', response.status.loadTime + 'ms');
      }
    } else {
      console.log('❌ 모델 상태 확인 실패:', response.error);
    }
  } catch (error) {
    console.log('❌ 에러:', error);
  }
}

// 사용 가능한 모델 목록도 확인
async function checkAvailableModels() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getAvailableModels'
    });

    if (response.success) {
      console.log('📋 사용 가능한 모델들:');
      Object.entries(response.models).forEach(([id, info]) => {
        console.log(`  - ${id}: ${info.name} (${info.size})`);
      });
      console.log('🎯 현재 선택된 모델:', response.currentModelId);
    }
  } catch (error) {
    console.log('❌ 모델 목록 확인 실패:', error);
  }
}

// 실행
console.log('=== 현재 AI 모델 정보 ===');
checkCurrentModel();
checkAvailableModels();