// WebGPU 테스트 스크립트 - 콘솔에서 실행
async function testWebGPU() {
  if (!('gpu' in navigator)) {
    console.log('❌ WebGPU not supported');
    return;
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      console.log('❌ No GPU adapter found');
      return;
    }

    console.log('✅ WebGPU Adapter:', adapter);
    console.log('🔧 Adapter info:', {
      vendor: adapter.info?.vendor,
      architecture: adapter.info?.architecture,
      device: adapter.info?.device,
      description: adapter.info?.description
    });

    const device = await adapter.requestDevice();
    console.log('✅ WebGPU Device:', device);
    console.log('🔧 Device limits:', device.limits);

    // GPU 사용량 확인 (가능하면)
    if (adapter.info) {
      console.log('🚀 GPU 정보:', {
        벤더: adapter.info.vendor,
        디바이스: adapter.info.device,
        아키텍처: adapter.info.architecture
      });
    }

  } catch (error) {
    console.log('❌ WebGPU test failed:', error);
  }
}

// 실행
testWebGPU();