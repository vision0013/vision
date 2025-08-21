import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        // 1. 사이드 패널 UI (프로젝트 루트의 index.html을 가리킴)
        main: resolve(__dirname, 'index.html'),
        // 2. 백그라운드 스크립트
        background: resolve(__dirname, 'src/background/controllers/background-controller.ts'),
        // 3. 콘텐츠 스크립트
        content_script: resolve(__dirname, 'src/content/content_script.tsx'),
        // 4. 오프스크린 스크립트 (AI 추론용)
        offscreen: resolve(__dirname, 'src/offscreen/offscreen.ts'),
      },
      output: {
        // 빌드 결과물 파일 이름을 [name].js 형식으로 만듦 (예: background.js)
        entryFileNames: `[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
  },
});
