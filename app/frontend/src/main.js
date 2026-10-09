import { jsx as _jsx } from "react/jsx-runtime";
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './lib/auth';
// 글꼴 (072): 본문 IBM Plex Sans KR, 제목 함렛. 한글은 글자 범위별 작은 파일로 나뉘어 쓰는 글자만 받는다
import '@fontsource/ibm-plex-sans-kr/400.css';
import '@fontsource/ibm-plex-sans-kr/600.css';
import '@fontsource/ibm-plex-sans-kr/700.css';
import '@fontsource/hahmlet/700.css';
import '@fontsource/hahmlet/800.css';
import './styles.css';
const root = document.getElementById('root');
// 서버가 넣은 첫 화면 HTML은 검색 엔진·JS 없는 환경용이다. React가 그 자리를 새로 그린다.
root.innerHTML = '';
createRoot(root).render(_jsx(StrictMode, { children: _jsx(AuthProvider, { children: _jsx(App, {}) }) }));
