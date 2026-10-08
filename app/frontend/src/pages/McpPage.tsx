import { useEffect } from 'react'
import { CopyCode } from '../components/CopyCode'
import { loginPath, useAuth } from '../lib/auth'
import { claudeCodeCommand, MCP_TOOLS, mcpJsonConfig } from '../lib/mcp'
import { Link } from '../lib/router'

/** AI에 devlog 연결하기 (050): MCP가 무엇인지, 무엇을 할 수 있는지, 어떻게 연결하는지. */
export function McpPage() {
  const { me } = useAuth()
  const origin = window.location.origin
  useEffect(() => { document.title = 'AI에 devlog 연결하기 - devlog' }, [])
  return (
    <main className="container narrow mcp-page">
      <p className="home-hero-eyebrow"><span className="home-hero-dot" aria-hidden="true" />devlog MCP</p>
      <h1 className="mcp-title">당신의 AI가 개발 일지를 씁니다</h1>
      <p className="mcp-lead">
        MCP는 Claude·Cursor 같은 AI 도구에 바깥 서비스를 "도구"로 꽂는 표준이에요. devlog를 연결해 두면 코딩을 마친 뒤
        <b> "오늘 개발 일지 써 줘"</b> 한마디로, AI가 그날 대화와 커밋을 정리해 내 devlog에 임시글로 올려 줘요.
        나는 읽어 보고 <b>[발행]</b>만 누르면 돼요.
      </p>

      <ol className="mcp-steps">
        <li><b>토큰 만들기</b><span>설정 › AI 연결에서 개인 접근 토큰을 만들어요. 읽기·쓰기 범위와 만료일을 고르고, 언제든 폐기할 수 있어요.</span></li>
        <li><b>AI에 연결하기</b><span>아래 명령이나 설정을 내 AI 도구에 붙여 넣어요.</span></li>
        <li><b>"개발 일지 써 줘"</b><span>AI가 임시글을 만들고 링크를 알려 줘요. 확인하고 발행하면 끝.</span></li>
      </ol>

      <div className="banner mcp-status">
        토큰 발급과 MCP 서버는 곧 열려요. 열리면 이 페이지와 설정 화면에서 바로 쓸 수 있어요.
      </div>

      <h2>연결하기</h2>
      <h3>Claude Code (터미널)</h3>
      <CopyCode label="Claude Code 연결 명령" code={claudeCodeCommand(origin)} />
      <h3>Claude 데스크톱 · Cursor (설정 파일)</h3>
      <CopyCode label="MCP 설정" code={mcpJsonConfig(origin)} />
      <p className="muted small">토큰은 비밀번호처럼 다뤄 주세요. 저장소나 글에 붙여 넣지 말고, 새면 설정에서 바로 폐기하세요.</p>

      <h2>AI가 쓸 수 있는 도구</h2>
      <table className="mcp-tools">
        <thead><tr><th scope="col">도구</th><th scope="col">하는 일</th><th scope="col">권한</th></tr></thead>
        <tbody>
          {MCP_TOOLS.map((t) => (
            <tr key={t.name}><td><code>{t.name}</code></td><td>{t.does}</td><td>{t.scope}</td></tr>
          ))}
        </tbody>
      </table>

      <h2>안심하고 쓰도록</h2>
      <ul className="mcp-safety">
        <li><b>발행은 언제나 내가</b> 해요. AI는 임시글과 "발행 대기"까지만 만들 수 있어요.</li>
        <li>AI가 읽는 글도 <b>웹과 같은 공개 범위</b>를 따라요. 남의 비공개·친구 공개 글은 읽을 수 없어요.</li>
        <li>토큰마다 <b>범위·만료일</b>이 있고, 회원마다 <b>요청 수 제한</b>이 있어요.</li>
        <li>글을 만드는 AI 비용은 내 AI 도구가 써요. devlog는 받은 글을 저장할 뿐이에요.</li>
      </ul>

      <div className="mcp-cta">
        {me?.authenticated
          ? <Link to="/write" className="btn btn-primary btn-lg">직접 글쓰기</Link>
          : <Link to={loginPath('/mcp')} className="btn btn-primary btn-lg">가입하고 연결 준비하기</Link>}
        <Link to="/" className="btn btn-outline btn-lg">글 둘러보기</Link>
      </div>
    </main>
  )
}
