// AI 추론 시스템 빠른 테스트 스크립트
// Console에서 실행하여 응답 시간 및 정확도 측정

console.log('🧪 AI 추론 시스템 테스트 시작');

// 테스트 명령어 목록
const testCommands = [
  // price_comparison 카테고리
  { command: "이 제품 최저가 찾아줘", expected: "price_comparison", description: "가격 비교 - 명확한 키워드" },
  { command: "더 싼 곳 있나요?", expected: "price_comparison", description: "가격 비교 - 자연스러운 표현" },
  
  // product_search 카테고리  
  { command: "아이폰 15 검색해줘", expected: "product_search", description: "상품 검색 - 구체적 상품명" },
  { command: "노트북 찾아줘", expected: "product_search", description: "상품 검색 - 일반적 키워드" },
  
  // simple_find 카테고리
  { command: "로그인 버튼 클릭해줘", expected: "simple_find", description: "요소 찾기 - 버튼" },
  { command: "검색창 찾아줘", expected: "simple_find", description: "요소 찾기 - 입력창" },
  
  // purchase_flow 카테고리
  { command: "장바구니에 담아줘", expected: "purchase_flow", description: "구매 플로우 - 장바구니" },
  { command: "결제하기 클릭해줘", expected: "purchase_flow", description: "구매 플로우 - 결제" },
  
  // navigation 카테고리
  { command: "이전 페이지로", expected: "navigation", description: "네비게이션 - 뒤로가기" },
  { command: "홈으로 이동해줘", expected: "navigation", description: "네비게이션 - 홈" }
];

// AI 모델 상태 확인
async function checkAIModelStatus() {
  try {
    console.log('📊 AI 모델 상태 확인 중...');
    const response = await chrome.runtime.sendMessage({ action: 'getAIModelStatus' });
    console.log('🤖 AI 모델 상태:', response);
    
    const stateNames = {
      1: '캐시없음',
      2: '로딩중', 
      3: '로딩완료',
      4: '캐시있음(로드안됨)'
    };
    
    console.log(`📋 현재 상태: ${response.state} (${stateNames[response.state]})`);
    
    if (response.state === 1) {
      console.log('⚠️  AI 모델이 없습니다. 먼저 다운로드해주세요:');
      console.log('   1. 🤖 AI 버튼 클릭');
      console.log('   2. Hugging Face 토큰 입력');
      console.log('   3. Download Model 버튼 클릭');
      return false;
    }
    
    if (response.state === 4) {
      console.log('💡 모델이 캐시되어 있지만 메모리에 로드되지 않았습니다.');
      console.log('   Load Model 버튼을 클릭하여 메모리에 로드해주세요.');
      return false;
    }
    
    if (response.state === 2) {
      console.log('⏳ 모델 로딩 중입니다. 잠시 기다려주세요...');
      return false;
    }
    
    if (response.state === 3) {
      console.log('✅ AI 모델이 메모리에 로드되어 테스트 준비 완료!');
      if (response.loadTime) {
        console.log(`⚡ 로딩 시간: ${response.loadTime}ms`);
      }
      if (response.modelSize) {
        console.log(`📦 모델 크기: ${(response.modelSize / 1024 / 1024).toFixed(1)}MB`);
      }
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error('❌ AI 모델 상태 확인 실패:', error);
    return false;
  }
}

// AI 분석 테스트 실행
async function testAIAnalysis(command, expectedCategory, description) {
  console.log(`\n🎯 테스트: "${command}"`);
  console.log(`📝 설명: ${description}`);
  console.log(`🎯 예상 카테고리: ${expectedCategory}`);
  
  const startTime = performance.now();
  
  try {
    // Offscreen으로 AI 분석 요청 (Background를 통해)
    const response = await chrome.runtime.sendMessage({
      action: 'testAIAnalysis',
      command: command
    });
    
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    
    console.log(`⚡ 응답 시간: ${responseTime}ms`);
    
    if (response && response.intent) {
      const { action, confidence, product, target, detail } = response.intent;
      
      console.log(`🤖 AI 분석 결과:`);
      console.log(`   📂 카테고리: ${action}`);
      console.log(`   🎯 신뢰도: ${confidence}`);
      if (product) console.log(`   🛍️  상품: ${product}`);
      if (target) console.log(`   🎪 대상: ${target}`);
      if (detail) console.log(`   📄 세부사항: ${detail}`);
      
      // 정확도 확인
      const isCorrect = action === expectedCategory;
      console.log(`${isCorrect ? '✅' : '❌'} 정확도: ${isCorrect ? '정확' : '부정확'}`);
      
      if (response.reasoning) {
        console.log(`💭 AI 판단 근거: ${response.reasoning}`);
      }
      
      return {
        command,
        expected: expectedCategory,
        actual: action,
        correct: isCorrect,
        confidence,
        responseTime,
        product,
        target,
        detail
      };
      
    } else {
      console.log('❌ AI 응답을 받지 못했습니다.');
      return {
        command,
        expected: expectedCategory,
        actual: 'error',
        correct: false,
        responseTime,
        error: 'No response received'
      };
    }
    
  } catch (error) {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    
    console.error(`❌ AI 분석 실패 (${responseTime}ms):`, error.message);
    return {
      command,
      expected: expectedCategory,
      actual: 'error',
      correct: false,
      responseTime,
      error: error.message
    };
  }
}

// 전체 테스트 실행
async function runFullTest() {
  console.log('🚀 AI 추론 시스템 전체 테스트 시작\n');
  
  // 1. AI 모델 상태 확인
  const modelReady = await checkAIModelStatus();
  if (!modelReady) {
    console.log('\n❌ AI 모델이 준비되지 않았습니다. 테스트를 중단합니다.');
    return;
  }
  
  console.log('\n📋 테스트 명령어 목록:');
  testCommands.forEach((test, index) => {
    console.log(`${index + 1}. "${test.command}" → ${test.expected}`);
  });
  
  console.log('\n⏳ AI 분석 테스트 실행 중...\n');
  
  const results = [];
  let totalResponseTime = 0;
  
  // 각 명령어 테스트 실행
  for (let i = 0; i < testCommands.length; i++) {
    const test = testCommands[i];
    const result = await testAIAnalysis(test.command, test.expected, test.description);
    results.push(result);
    totalResponseTime += result.responseTime;
    
    // 다음 테스트 전에 잠시 대기
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // 결과 요약
  console.log('\n📊 테스트 결과 요약:');
  console.log('═'.repeat(60));
  
  const correctResults = results.filter(r => r.correct);
  const accuracy = (correctResults.length / results.length * 100).toFixed(1);
  const avgResponseTime = Math.round(totalResponseTime / results.length);
  
  console.log(`✅ 정확도: ${correctResults.length}/${results.length} (${accuracy}%)`);
  console.log(`⚡ 평균 응답 시간: ${avgResponseTime}ms`);
  console.log(`📊 총 테스트 시간: ${Math.round(totalResponseTime)}ms`);
  
  console.log('\n📋 카테고리별 정확도:');
  const categoryAccuracy = {};
  results.forEach(result => {
    if (!categoryAccuracy[result.expected]) {
      categoryAccuracy[result.expected] = { total: 0, correct: 0 };
    }
    categoryAccuracy[result.expected].total++;
    if (result.correct) categoryAccuracy[result.expected].correct++;
  });
  
  Object.entries(categoryAccuracy).forEach(([category, stats]) => {
    const acc = ((stats.correct / stats.total) * 100).toFixed(1);
    console.log(`   📂 ${category}: ${stats.correct}/${stats.total} (${acc}%)`);
  });
  
  console.log('\n❌ 오류 분석:');
  const errorResults = results.filter(r => !r.correct);
  if (errorResults.length === 0) {
    console.log('   🎉 모든 테스트 통과!');
  } else {
    errorResults.forEach(result => {
      console.log(`   • "${result.command}"`);
      console.log(`     예상: ${result.expected} → 실제: ${result.actual}`);
    });
  }
  
  console.log('\n✅ AI 추론 시스템 테스트 완료!');
  return results;
}

// 단일 명령어 빠른 테스트
async function quickTest(command) {
  console.log(`🧪 빠른 테스트: "${command}"`);
  
  const modelReady = await checkAIModelStatus();
  if (!modelReady) {
    console.log('❌ AI 모델이 준비되지 않았습니다.');
    return;
  }
  
  return await testAIAnalysis(command, 'unknown', '빠른 테스트');
}

// 사용 가이드
console.log('🔧 사용 방법:');
console.log('1. await runFullTest()     - 전체 테스트 실행');
console.log('2. await quickTest("명령어") - 단일 명령어 테스트');
console.log('3. await checkAIModelStatus() - AI 모델 상태 확인');
console.log('\n예시:');
console.log('await quickTest("아이폰 찾아줘")');
console.log('await runFullTest()');

// 전역에 함수 등록
window.aiTest = { runFullTest, quickTest, checkAIModelStatus, testCommands };