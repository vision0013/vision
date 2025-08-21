// AI 추론 시스템 포괄적 자동화 테스트
// Console에서 실행: await runComprehensiveTest()

console.log('🧪 AI 추론 시스템 포괄적 테스트 로드됨');

// 카테고리별 테스트 케이스
const testCases = {
  product_search: [
    { command: "아이폰 15 찾아줘", expected: "product_search", description: "기본 제품 검색" },
    { command: "갤럭시 S24 검색해줘", expected: "product_search", description: "다른 제품 검색" },
    { command: "노트북 보여줘", expected: "product_search", description: "일반 제품 검색" },
    { command: "맥북 프로 찾아줘", expected: "product_search", description: "복합 제품명" },
    { command: "에어팟 검색", expected: "product_search", description: "간단한 검색" }
  ],
  
  price_comparison: [
    { command: "최저가 알려줘", expected: "price_comparison", description: "기본 최저가 요청" },
    { command: "가격 비교해줘", expected: "price_comparison", description: "가격 비교 요청" },
    { command: "더 싼 곳 있나요", expected: "price_comparison", description: "자연스러운 가격 문의" },
    { command: "할인가 찾아줘", expected: "price_comparison", description: "할인 관련" },
    { command: "가격 확인해줘", expected: "price_comparison", description: "가격 확인" }
  ],
  
  simple_find: [
    { command: "로그인 버튼 클릭해줘", expected: "simple_find", description: "기본 버튼 클릭" },
    { command: "검색창 찾아줘", expected: "simple_find", description: "입력창 찾기" },
    { command: "메뉴 버튼 눌러줘", expected: "simple_find", description: "메뉴 조작" },
    { command: "회원가입 링크 클릭", expected: "simple_find", description: "링크 클릭" },
    { command: "설정 아이콘 눌러줘", expected: "simple_find", description: "아이콘 조작" }
  ],
  
  purchase_flow: [
    { command: "장바구니에 담아줘", expected: "purchase_flow", description: "기본 장바구니 추가" },
    { command: "결제하기 눌러줘", expected: "purchase_flow", description: "결제 진행" },
    { command: "주문하기 클릭해줘", expected: "purchase_flow", description: "주문 진행" },
    { command: "구매하기 버튼 눌러줘", expected: "purchase_flow", description: "구매 진행" },
    { command: "카트에 추가해줘", expected: "purchase_flow", description: "영어식 표현" }
  ],
  
  navigation: [
    { command: "이전 페이지로", expected: "navigation", description: "기본 뒤로가기" },
    { command: "뒤로 가줘", expected: "navigation", description: "간단한 뒤로가기" },
    { command: "홈으로 이동해줘", expected: "navigation", description: "홈 이동" },
    { command: "메인 페이지로", expected: "navigation", description: "메인 이동" },
    { command: "앞으로 이동", expected: "navigation", description: "앞으로 가기" }
  ]
};

// AI 모델 상태 확인
async function checkModelReady() {
  try {
    console.log('📊 AI 모델 상태 확인 중...');
    const response = await chrome.runtime.sendMessage({ action: 'getAIModelStatus' });
    
    const stateNames = {
      1: '캐시없음',
      2: '로딩중', 
      3: '로딩완료',
      4: '캐시있음(로드안됨)'
    };
    
    console.log(`📋 현재 상태: ${response.state} (${stateNames[response.state]})`);
    
    if (response.state !== 3) {
      console.log('⚠️ AI 모델이 메모리에 로드되지 않았습니다.');
      console.log('🤖 AI 버튼 → Load Model 버튼을 클릭해주세요.');
      return false;
    }
    
    console.log('✅ AI 모델 준비 완료!');
    if (response.loadTime) {
      console.log(`⚡ 로딩 시간: ${response.loadTime}ms`);
    }
    return true;
    
  } catch (error) {
    console.error('❌ AI 모델 상태 확인 실패:', error);
    return false;
  }
}

// 단일 명령어 테스트
async function testSingleCommand(testCase) {
  const { command, expected, description } = testCase;
  console.log(`\n🎯 테스트: "${command}"`);
  console.log(`📝 설명: ${description}`);
  console.log(`🎯 예상: ${expected}`);
  
  const startTime = performance.now();
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'testAIAnalysis',
      command: command
    });
    
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    
    console.log(`⚡ 응답 시간: ${responseTime}ms`);
    
    if (response && response.intent) {
      const { action, confidence, product, target } = response.intent;
      
      console.log(`🤖 AI 결과: ${action} (신뢰도: ${confidence})`);
      if (product) console.log(`   🛍️ 상품: ${product}`);
      if (target) console.log(`   🎯 대상: ${target}`);
      
      const isCorrect = action === expected;
      console.log(`${isCorrect ? '✅' : '❌'} 정확도: ${isCorrect ? '정확' : '부정확'} (예상: ${expected})`);
      
      return {
        command,
        expected,
        actual: action,
        correct: isCorrect,
        confidence,
        responseTime,
        product,
        target,
        description
      };
      
    } else {
      console.log('❌ AI 응답을 받지 못했습니다.');
      return {
        command,
        expected,
        actual: 'error',
        correct: false,
        responseTime,
        error: 'No response received',
        description
      };
    }
    
  } catch (error) {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    
    console.error(`❌ AI 분석 실패 (${responseTime}ms):`, error.message);
    return {
      command,
      expected,
      actual: 'error',
      correct: false,
      responseTime,
      error: error.message,
      description
    };
  }
}

// 카테고리별 테스트 실행
async function testCategory(categoryName, testCases) {
  console.log(`\n📂 ${categoryName.toUpperCase()} 카테고리 테스트 시작`);
  console.log('═'.repeat(50));
  
  const results = [];
  let totalTime = 0;
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const result = await testSingleCommand(testCase);
    results.push(result);
    totalTime += result.responseTime;
    
    // 다음 테스트 전에 잠시 대기 (AI 모델 과부하 방지)
    if (i < testCases.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // 카테고리 결과 요약
  const correctResults = results.filter(r => r.correct);
  const accuracy = (correctResults.length / results.length * 100).toFixed(1);
  const avgResponseTime = Math.round(totalTime / results.length);
  
  console.log(`\n📊 ${categoryName} 결과 요약:`);
  console.log(`✅ 정확도: ${correctResults.length}/${results.length} (${accuracy}%)`);
  console.log(`⚡ 평균 응답 시간: ${avgResponseTime}ms`);
  
  const errors = results.filter(r => !r.correct);
  if (errors.length > 0) {
    console.log(`❌ 오류 케이스:`);
    errors.forEach(error => {
      console.log(`   • "${error.command}" → 예상: ${error.expected}, 실제: ${error.actual}`);
    });
  }
  
  return {
    category: categoryName,
    results,
    accuracy: parseFloat(accuracy),
    avgResponseTime,
    totalTests: results.length,
    correctTests: correctResults.length
  };
}

// 전체 포괄적 테스트 실행
async function runComprehensiveTest() {
  console.log('🚀 AI 추론 시스템 포괄적 테스트 시작');
  console.log('🎯 총 25개 테스트 케이스 (카테고리당 5개)');
  
  // 1. AI 모델 상태 확인
  const modelReady = await checkModelReady();
  if (!modelReady) {
    console.log('\n❌ AI 모델이 준비되지 않았습니다. 테스트를 중단합니다.');
    return;
  }
  
  const startTime = performance.now();
  const categoryResults = [];
  
  // 2. 각 카테고리별 테스트 실행
  for (const [categoryName, tests] of Object.entries(testCases)) {
    const categoryResult = await testCategory(categoryName, tests);
    categoryResults.push(categoryResult);
    
    // 카테고리 간 잠시 대기
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  const endTime = performance.now();
  const totalTime = Math.round(endTime - startTime);
  
  // 3. 전체 결과 분석
  console.log('\n🏆 전체 테스트 결과');
  console.log('═'.repeat(60));
  
  const allResults = categoryResults.flatMap(cat => cat.results);
  const totalTests = allResults.length;
  const totalCorrect = allResults.filter(r => r.correct).length;
  const overallAccuracy = (totalCorrect / totalTests * 100).toFixed(1);
  const avgResponseTime = Math.round(allResults.reduce((sum, r) => sum + r.responseTime, 0) / totalTests);
  
  console.log(`📊 전체 정확도: ${totalCorrect}/${totalTests} (${overallAccuracy}%)`);
  console.log(`⚡ 평균 응답 시간: ${avgResponseTime}ms`);
  console.log(`🕐 총 테스트 시간: ${Math.round(totalTime / 1000)}초`);
  
  // 4. 카테고리별 정확도
  console.log('\n📋 카테고리별 성능:');
  categoryResults.forEach(cat => {
    console.log(`   📂 ${cat.category}: ${cat.correctTests}/${cat.totalTests} (${cat.accuracy}%) - 평균 ${cat.avgResponseTime}ms`);
  });
  
  // 5. 신뢰도 분석
  const confidenceScores = allResults.filter(r => r.confidence).map(r => r.confidence);
  if (confidenceScores.length > 0) {
    const avgConfidence = (confidenceScores.reduce((sum, c) => sum + c, 0) / confidenceScores.length).toFixed(2);
    console.log(`\n🎯 평균 AI 신뢰도: ${avgConfidence}`);
  }
  
  // 6. 실패 케이스 분석
  const failedTests = allResults.filter(r => !r.correct);
  if (failedTests.length > 0) {
    console.log('\n❌ 실패 케이스 분석:');
    failedTests.forEach(fail => {
      console.log(`   • "${fail.command}"`);
      console.log(`     예상: ${fail.expected} → 실제: ${fail.actual}`);
      if (fail.error) console.log(`     오류: ${fail.error}`);
    });
  } else {
    console.log('\n🎉 모든 테스트 케이스 통과! Perfect Score!');
  }
  
  console.log('\n✅ 포괄적 테스트 완료!');
  return {
    overallAccuracy: parseFloat(overallAccuracy),
    avgResponseTime,
    totalTime,
    categoryResults,
    failedTests
  };
}

// 빠른 테스트 (각 카테고리 1개씩)
async function runQuickTest() {
  console.log('⚡ AI 추론 빠른 테스트 시작');
  
  const modelReady = await checkModelReady();
  if (!modelReady) return;
  
  const quickTests = [
    testCases.product_search[0],
    testCases.price_comparison[0], 
    testCases.simple_find[0],
    testCases.purchase_flow[0],
    testCases.navigation[0]
  ];
  
  const results = [];
  for (const test of quickTests) {
    const result = await testSingleCommand(test);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  const correctResults = results.filter(r => r.correct);
  const accuracy = (correctResults.length / results.length * 100).toFixed(1);
  
  console.log(`\n📊 빠른 테스트 결과: ${correctResults.length}/${results.length} (${accuracy}%)`);
  return results;
}

// 전역에 함수 등록
window.aiComprehensiveTest = { 
  runComprehensiveTest, 
  runQuickTest, 
  testCategory,
  testCases,
  checkModelReady
};

console.log('🔧 사용법:');
console.log('await runComprehensiveTest()  - 전체 25개 테스트 (약 2-3분)');
console.log('await runQuickTest()          - 빠른 5개 테스트 (30초)');
console.log('await testCategory("product_search", testCases.product_search) - 특정 카테고리만');
console.log('');
console.log('🚀 시작: await runComprehensiveTest()');