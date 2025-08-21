// Console에서 바로 실행할 수 있는 AI 테스트 코드

// 1. 빠른 테스트
async function quickTest(command = "아이폰 15 찾아줘") {
  console.log(`🧪 빠른 테스트: "${command}"`);
  const start = performance.now();
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'testAIAnalysis',
      command: command
    });
    
    const time = Math.round(performance.now() - start);
    console.log(`⚡ 응답 시간: ${time}ms`);
    
    if (response && response.intent) {
      console.log(`🤖 결과: ${response.intent.action} (신뢰도: ${response.intent.confidence})`);
      if (response.intent.product) console.log(`🛍️ 상품: ${response.intent.product}`);
      if (response.intent.target) console.log(`🎯 대상: ${response.intent.target}`);
    }
    
    return response;
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
  }
}

// 2. 모델 상태 확인
async function checkStatus() {
  const response = await chrome.runtime.sendMessage({ action: 'getAIModelStatus' });
  const states = { 1: '캐시없음', 2: '로딩중', 3: '로딩완료', 4: '캐시있음' };
  console.log(`📊 AI 상태: ${response.state} (${states[response.state]})`);
  return response;
}

// 3. 여러 명령어 테스트
async function multiTest() {
  const commands = [
    "아이폰 찾아줘",
    "최저가 알려줘", 
    "로그인 버튼 클릭해줘",
    "결제하기 눌러줘",
    "이전 페이지로"
  ];
  
  for (const cmd of commands) {
    await quickTest(cmd);
    await new Promise(r => setTimeout(r, 1000)); // 1초 대기
  }
}

console.log('🔧 사용법:');
console.log('await checkStatus() - AI 상태 확인');
console.log('await quickTest() - 빠른 테스트');
console.log('await quickTest("명령어") - 특정 명령어 테스트');
console.log('await multiTest() - 5개 명령어 연속 테스트');
console.log('');
console.log('🚀 시작: await checkStatus()');