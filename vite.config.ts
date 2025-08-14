import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
// 최신 import 구문에 맞게 'assert'를 'with'로 변경합니다.
import manifest from './src/manifest.json' with { type: 'json' }

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  // 빌드 결과물이 'dist' 폴더에 생성되도록 명시합니다.
  build: {
    outDir: 'dist',
  },
})
