import { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface Terms { termsVersion: string; termsEffectiveDate: string; privacyVersion: string; privacyEffectiveDate: string }

/** 이용약관·개인정보 처리방침 (005 FR-026). 수업 프로젝트용 기본 문안이다. */
export function TermsPage({ kind }: { kind: 'terms' | 'privacy' }) {
  const [terms, setTerms] = useState<Terms | null>(null)
  useEffect(() => {
    api<Terms>('/api/terms/current').then(setTerms).catch(() => setTerms(null))
  }, [])
  const date = kind === 'terms' ? terms?.termsEffectiveDate : terms?.privacyEffectiveDate
  return (
    <main className="container narrow terms">
      <h1 className="page-title">{kind === 'terms' ? '이용약관' : '개인정보 처리방침'}</h1>
      {date && <p className="muted small">시행일 {date}</p>}
      {kind === 'terms' ? <TermsBody /> : <PrivacyBody />}
      <p><a href={kind === 'terms' ? '/privacy' : '/terms'}>{kind === 'terms' ? '개인정보 처리방침 보기' : '이용약관 보기'}</a></p>
    </main>
  )
}

function TermsBody() {
  return (
    <>
      <h2>1. 목적</h2>
      <p>이 약관은 devlog(이하 "서비스")에서 글을 쓰고 읽는 데 필요한 회원과 서비스의 권리·의무를 정합니다.</p>
      <h2>2. 회원 가입과 계정</h2>
      <p>회원은 GitHub·Google 계정이나 이메일로 가입합니다. 블로그 주소와 이메일은 가입 뒤 바꿀 수 없습니다. 계정은 본인만 쓰며, 남에게 빌려주거나 넘기면 안 됩니다.</p>
      <h2>3. 게시물</h2>
      <p>회원이 쓴 글의 권리는 회원에게 있습니다. 서비스는 글을 보여 주는 데 필요한 범위에서만 씁니다. 다른 사람의 권리를 침해하거나 법을 어기는 글은 숨기거나 지울 수 있습니다.</p>
      <h2>4. 이용 제한</h2>
      <p>스팸·도배·불법 정보 게시, 서비스 방해가 확인되면 이용을 정지할 수 있으며, 정지 사유와 기간을 알립니다.</p>
      <h2>5. 탈퇴</h2>
      <p>회원은 언제든 탈퇴할 수 있습니다. 탈퇴한 계정의 처리 방식은 개인정보 처리방침을 따릅니다.</p>
    </>
  )
}

function PrivacyBody() {
  return (
    <>
      <h2>1. 모으는 정보</h2>
      <p>이메일, 로그인 수단(GitHub·Google·이메일), 블로그 주소, 닉네임, 소개, 프로필 사진, 로그인 시각, 친구 관계, 최근 활동 일자를 모읍니다. 이메일 가입자의 비밀번호는 되돌릴 수 없는 방식으로만 저장합니다.</p>
      <h2>2. 쓰는 곳</h2>
      <p>로그인, 블로그 운영, 계정 도용 알림(직전 로그인 표시), 인증·비밀번호 재설정 메일에만 씁니다.</p>
      <h2>3. 친구에게 최근 활동 시점 표시</h2>
      <p>서로 친구인 회원에게만 마지막으로 활동한 때를 "오늘·어제·N일 전·1주 이상"으로 보여 줍니다. 정확한 시각은 누구에게도 보이지 않습니다. 설정에서 끌 수 있고, 끄면 나도 친구들의 최근 활동을 볼 수 없습니다.</p>
      <h2>4. 프로필 사진</h2>
      <p>소셜 가입 때 고르면 소셜 프로필 사진을 한 번만 복사해 저장하며, 소셜 사진 주소는 저장하지 않습니다. 사진 속 촬영 위치 같은 정보는 올리기 전에 지웁니다.</p>
      <h2>5. 보관 기간</h2>
      <p>탈퇴하면 친구 관계는 바로 지우고, 30일 뒤 닉네임·소개·최근 활동 일자 등 개인정보를 지우고 블로그 주소만 남깁니다. 법으로 보관해야 하는 정보는 그 기간 동안 보관합니다.</p>
      <h2 id="ai">6. AI 기능</h2>
      <p>AI 기능 동의는 선택 항목으로, 가입 화면이나 AI를 처음 쓸 때 따로 받습니다. 동의하지 않아도 다른 기능은 그대로 쓸 수 있습니다. AI 태그 추천은 동의한 회원이 버튼을 누를 때만 동작합니다. 이때 글 제목, 본문 앞부분(서식을 뺀 글자), 지금 붙인 태그를 외부 AI 서비스(Google Gemini)로 전송합니다. 무료 등급이라 Google이 전송된 내용을 서비스 개선에 쓰고 사람이 검토할 수 있습니다. Gemini를 쓸 수 없을 때는 우리 서버의 AI로 처리하며, 이때는 외부로 전송하지 않습니다.</p>
      <p>이메일·닉네임 같은 회원 정보와 다른 사람의 글은 보내지 않습니다. 같은 내용을 다시 묻지 않도록 추천 결과를 30일, 같은 글의 마지막 요청 내용을 7일 동안 보관합니다. 개인정보·비밀번호·회사 기밀이 든 글에는 쓰지 마세요. 설정에서 언제든 동의를 철회할 수 있습니다.</p>
      <h2 id="ads">7. 광고와 쿠키</h2>
      <p>서비스는 운영비를 마련하려고 첫 화면, 글, 블로그, 태그, 검색 같은 공개 화면에 Google 애드센스 광고를 싣습니다. 로그인·글쓰기·설정·관리 화면에는 광고를 싣지 않습니다.</p>
      <p>Google을 비롯한 제3자 광고 사업자는 쿠키를 써서 이용자가 이 사이트와 다른 사이트를 방문한 기록을 바탕으로 광고를 보여 줍니다. Google은 광고 쿠키로 이용자에게 맞는 광고를 고릅니다. 맞춤 광고는 <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" title="새 창에서 열려요">Google 광고 설정</a>에서 끌 수 있고, 제3자 광고 사업자의 맞춤 광고 쿠키는 <a href="https://www.aboutads.info/choices" target="_blank" rel="noopener noreferrer" title="새 창에서 열려요">aboutads.info</a>에서 끌 수 있습니다. Google이 정보를 쓰는 방식은 <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer" title="새 창에서 열려요">Google 파트너 사이트 정책</a>에서 볼 수 있습니다.</p>
      <p>서비스는 회원 정보(이메일·닉네임 등)를 광고 사업자에게 넘기지 않습니다. 브라우저 설정에서 쿠키를 막을 수 있으며, 막아도 글을 읽고 쓰는 데는 지장이 없습니다.</p>
    </>
  )
}
