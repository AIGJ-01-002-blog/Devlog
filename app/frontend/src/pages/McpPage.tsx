import { useEffect } from 'react'
import { CopyCode } from '../components/CopyCode'
import { loginPath, useAuth } from '../lib/auth'
import { claudeCodeCommand, codexConfig, MCP_TOOLS, mcpEndpoint, mcpJsonConfig } from '../lib/mcp'
import { Link } from '../lib/router'

/** AI에 devlog 연결하기 (051): MCP가 무엇인지, 무엇을 할 수 있는지, 어떻게 연결하는지. */
export function McpPage() {
  const { me } = useAuth()
  const origin = window.location.origin
  useEffect(() => { document.title = 'AI에 devlog 연결하기 - devlog' }, [])
  return (
    <main className="container narrow mcp-page">
      <p className="home-hero-eyebrow"><span className="home-hero-dot" aria-hidden="true" />devlog MCP</p>
      <h1 className="mcp-title">당신의 AI가 개발 일지를 씁니다</h1>
      <p className="mcp-lead">
        MCP는 Claude·ChatGPT·Cursor·Codex 같은 AI 도구에 바깥 서비스를 "도구"로 꽂는 표준이에요. devlog를 연결해 두면 코딩을 마친 뒤
        <b> "오늘 개발 일지 써 줘"</b> 한마디로, AI가 그날 대화와 커밋을 정리해 내 devlog에 임시글로 올려 줘요.
        나는 읽어 보고 <b>[발행]</b>만 누르면 돼요.
      </p>

      <ol className="mcp-steps">
        <li><b>토큰 만들기</b><span>설정 › AI 연결에서 개인 접근 토큰을 만들어요. 읽기·쓰기 범위와 만료일을 고르고, 언제든 폐기할 수 있어요. ChatGPT는 토큰 없이 로그인으로 연결해요.</span></li>
        <li><b>AI에 연결하기</b><span>아래 명령이나 설정을 내 AI 도구에 붙여 넣어요.</span></li>
        <li><b>"개발 일지 써 줘"</b><span>AI가 임시글을 만들고 링크를 알려 줘요. 확인하고 발행하면 끝.</span></li>
      </ol>

      <p className="mcp-status">
        {me?.authenticated
          ? <Link to="/settings#ai" className="btn btn-primary">설정에서 토큰 만들기</Link>
          : <>로그인한 회원 누구나 쓸 수 있어요. <Link to={loginPath('/mcp')}>로그인하고 토큰 만들기</Link></>}
      </p>

      <h2>연결하기</h2>
      <h3>Claude Code (터미널)</h3>
      <CopyCode label="Claude Code 연결 명령" code={claudeCodeCommand(origin)} />
      <h3>Claude 데스크톱 · Cursor (설정 파일)</h3>
      <CopyCode label="MCP 설정" code={mcpJsonConfig(origin)} />
      <h3>Codex (터미널)</h3>
      <CopyCode label="Codex 설정 (~/.codex/config.toml)" code={codexConfig(origin)} />
      <p className="muted small">토큰은 설정 파일 대신 환경 변수 <code>DEVLOG_TOKEN</code>에 넣어 두세요.</p>
      <h3>ChatGPT (커넥터)</h3>
      <p className="mcp-chatgpt">
        ChatGPT는 토큰 대신 <b>devlog 로그인</b>으로 연결해요. 설정 › 앱과 커넥터에서 개발자 모드를 켜고 커넥터를 만든 뒤,
        아래 주소를 넣고 인증 방식은 <b>OAuth</b>를 고르세요. devlog 동의 화면에서 [허용]을 누르면 끝이에요.
      </p>
      <CopyCode label="MCP 서버 주소" code={mcpEndpoint(origin)} />
      <p className="muted small">ChatGPT에서 쓰기 도구까지 되는지는 요금제마다 달라요(2026년 10월 기준 일부 요금제는 읽기만). 연결은 설정 › AI 연결에서 언제든 끊을 수 있어요.</p>
      <p className="muted small">토큰은 비밀번호처럼 다뤄 주세요. 저장소나 글에 붙여 넣지 말고, 새면 설정에서 바로 폐기하세요.</p>

      <h2>AI가 쓸 수 있는 도구</h2>
      <table className="mcp-tools">
        <thead><tr><th scope="col">도구</th><th scope="col">하는 일</th><th scope="col">권한</th></tr></thead>
        <tbody>
          {MCP_TOOLS.map((t) => (
            <tr key={t.name}><td><code>{t.name}</code></td><td>{t.does}</td><td>{t.aiPublish ? `${t.scope} · 허용했을 때만` : t.scope}</td></tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">
        <code>publish_post</code>·<code>delete_post</code>는 설정 › AI 연결에서 <b>AI가 발행·삭제하도록 허용</b>을 켰을 때만 AI에게 보이고 쓸 수 있어요. 기본은 꺼져 있어요.
      </p>

      <h2>안심하고 쓰도록</h2>
      <ul className="mcp-safety">
        <li><b>발행은 기본으로 내가</b> 해요. AI는 임시글과 "발행 대기"까지만 만들 수 있어요.</li>
        <li>설정 › AI 연결에서 <b>AI가 발행·삭제하도록 허용</b>을 켠 경우에만 AI가 글을 바로 발행하거나 삭제할 수 있어요. 삭제는 웹에서 지울 때와 같아 휴지통에서 30일 안에 복구할 수 있어요. 이 설정은 로그인한 웹 화면에서만 바꿀 수 있어 AI가 스스로 켤 수 없어요.</li>
        <li>AI가 <b>발행한 글을 고치면</b> "고치는 중"으로만 저장돼요. 내가 편집 화면에서 [다시 발행]을 눌러야(또는 발행을 허용했다면 AI에게 말해야) 독자에게 보여요.</li>
        <li>AI가 올리는 사진도 웹과 같아요. 긴 변 1920px로 줄이고 <b>위치 같은 사진 정보를 지운 뒤</b> 내 사진 저장 공간(1GB)에 올려요.</li>
        <li>AI가 읽는 글도 <b>웹과 같은 공개 범위</b>를 따라요. 남의 비공개·친구 공개 글은 읽을 수 없어요.</li>
        <li>토큰마다 <b>범위·만료일</b>이 있고, 회원마다 <b>요청 수 제한</b>(1분에 60번, 글쓰기는 한 시간에 30번)이 있어요.</li>
        <li>글쓰기 도구는 <b>이메일 인증을 마친 회원</b>만 쓸 수 있어요.</li>
        <li>AI가 <code>report_bug</code>로 보낸 버그 신고는 <b>운영자만</b> 읽어요. 고치면 답변과 고친 버전이 <Link to="/support?tab=mine">문의·신고</Link>에 보여요.</li>
        <li>글을 만드는 AI 비용은 내 AI 도구가 써요. devlog는 받은 글을 저장할 뿐이에요.</li>
      </ul>

      <div className="mcp-cta">
        {me?.authenticated
          ? <Link to="/settings#ai" className="btn btn-primary btn-lg">토큰 만들고 연결하기</Link>
          : <Link to={loginPath('/mcp')} className="btn btn-primary btn-lg">가입하고 연결하기</Link>}
        <Link to="/" className="btn btn-outline btn-lg">글 둘러보기</Link>
      </div>
    </main>
  )
}
