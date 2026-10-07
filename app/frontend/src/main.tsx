import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { AuthProvider } from './lib/auth'
import './styles.css'

const root = document.getElementById('root')!
// 서버가 넣은 첫 화면 HTML은 검색 엔진·JS 없는 환경용이다. React가 그 자리를 새로 그린다.
root.innerHTML = ''
createRoot(root).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
