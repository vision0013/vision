// 모델 전환 테스트 스크립트
// 확장 프로그램에서 개발자 도구 콘솔에 붙여넣어서 실행하세요

async function testModelSwitching() {
  console.log('🔧 모델 전환 테스트 시작...');

  // 1. 현재 모델 상태 확인
  console.log('\n=== 1단계: 현재 모델 상태 확인 ===');
  let statusResponse = await chrome.runtime.sendMessage({
    action: 'getAIModelStatus'
  });
  console.log('현재 상태:', statusResponse);

  // 2. 사용 가능한 모델 목록 확인
  console.log('\n=== 2단계: 사용 가능한 모델 목록 확인 ===');
  let modelsResponse = await chrome.runtime.sendMessage({
    action: 'getAvailableModels'
  });
  console.log('모델 목록:', modelsResponse);

  if (!modelsResponse.success) {
    console.error('❌ 모델 목록을 가져올 수 없습니다');
    return;
  }

  const currentModel = modelsResponse.currentModelId;
  console.log('🎯 현재 선택된 모델:', currentModel);

  // 3. 다른 모델로 전환 (현재가 gemma3-4b-it면 gemma3-12b-it로, 아니면 gemma3-4b-it로)
  const targetModel = currentModel === 'gemma3-4b-it' ? 'gemma3-12b-it' : 'gemma3-4b-it';
  console.log(`\n=== 3단계: ${targetModel}로 모델 전환 ===`);

  const switchResponse = await chrome.runtime.sendMessage({
    action: 'switchAIModel',
    modelId: targetModel
  });
  console.log('전환 응답:', switchResponse);

  // 4. 전환 후 상태 확인 (잠시 대기 후)
  console.log('\n=== 4단계: 전환 후 상태 확인 (3초 대기) ===');
  await new Promise(resolve => setTimeout(resolve, 3000));

  statusResponse = await chrome.runtime.sendMessage({
    action: 'getAIModelStatus'
  });
  console.log('전환 후 상태:', statusResponse);

  modelsResponse = await chrome.runtime.sendMessage({
    action: 'getAvailableModels'
  });
  console.log('전환 후 현재 모델:', modelsResponse.currentModelId);

  // 5. 검증
  console.log('\n=== 5단계: 전환 검증 ===');
  if (modelsResponse.currentModelId === targetModel) {
    console.log('✅ 모델 전환 성공!');
  } else {
    console.log('❌ 모델 전환 실패 - 여전히', modelsResponse.currentModelId);
  }

  // 6. AI 추론 테스트 (모델이 실제로 바뀌었는지 확인)
  console.log('\n=== 6단계: AI 추론으로 실제 모델 확인 ===');

  // 모델이 로드된 상태인지 확인
  if (statusResponse.status.state === 3) { // 로드 완료 상태
    console.log('🤖 현재 로드된 모델로 간단한 추론 테스트...');

    try {
      const testResponse = await chrome.runtime.sendMessage({
        action: 'getAIPlan',
        command: '현재 사용중인 모델 이름을 알려줘',
        crawledItems: [],
        mode: 'chat'
      });

      console.log('추론 결과:', testResponse);

      // 응답에서 모델 정보 확인
      if (testResponse.result && testResponse.result.response) {
        console.log('🎯 AI 응답:', testResponse.result.response);
      }
    } catch (error) {
      console.log('⚠️ 추론 테스트 실패:', error);
    }
  } else {
    console.log('ℹ️ 모델이 로드되지 않은 상태입니다. 로드 후 추론 테스트를 해보세요.');
  }

  console.log('\n🏁 모델 전환 테스트 완료');
}

// 테스트 실행
testModelSwitching().catch(console.error);