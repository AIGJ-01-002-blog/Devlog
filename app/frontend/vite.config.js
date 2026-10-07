/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// 개발 서버(5173)는 API·로그인·서버가 그리는 화면 주소를 백엔드(8080)로 넘긴다.
const backend = 'http://localhost:8080';
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/api': backend,
            '/oauth2': backend,
            '/login/oauth2': backend,
            '/actuator': backend,
        },
    },
    build: {
        outDir: 'dist',
        // 인라인 스크립트를 만들지 않는다 (CSP script-src 'self')
        modulePreload: { polyfill: false },
        sourcemap: false,
    },
    test: {
        environment: 'jsdom',
        // theme.test.ts가 styles.css 원문(?raw)을 읽는다
        css: { include: [/styles\.css/] },
    },
});
