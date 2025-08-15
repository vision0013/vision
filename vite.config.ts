import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        panel: resolve(__dirname, 'panel.html'),
        background: resolve(__dirname, 'src/background/background.ts'),
        // ✨ 변경: content_script.tsx의 실제 파일 위치에 맞게 경로를 수정했습니다.
        content_script: resolve(__dirname, 'src/content/content_script.tsx'),
      },
      output: {
        // ✨ 변경: 빌드 결과물이 폴더 구조를 유지하도록 content_script 경우를 추가합니다.
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') {
            return 'src/background/background.js';
          }
          if (chunkInfo.name === 'content_script') {
            return 'src/content/content_script.js';
          }
          return 'src/[name].js';
        },
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
});
