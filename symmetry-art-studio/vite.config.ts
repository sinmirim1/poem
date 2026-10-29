import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// 학교 컴퓨터에서 인터넷 없이 더블클릭으로 열 수 있도록
// JS·CSS를 모두 index.html 한 파일 안에 넣어서 빌드한다.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  build: { outDir: 'dist', assetsInlineLimit: 100000000 },
});
