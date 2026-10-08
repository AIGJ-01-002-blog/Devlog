import { describe, expect, it } from 'vitest'
import { claudeCodeCommand, codexConfig, MCP_TOOLS, mcpEndpoint, mcpJsonConfig, oauthParams, TOKEN_PLACEHOLDER } from './mcp'

describe('MCP 연결 안내 (051)', () => {
  it('주소는 지금 사이트를 따라간다', () => {
    expect(mcpEndpoint('https://devlog.life')).toBe('https://devlog.life/api/mcp')
    expect(mcpEndpoint('http://localhost:5173/')).toBe('http://localhost:5173/api/mcp')
  })

  it('Claude Code 명령과 설정 파일은 같은 주소와 토큰 자리를 쓴다', () => {
    expect(claudeCodeCommand('https://devlog.life')).toBe(
      `claude mcp add --transport http devlog https://devlog.life/api/mcp --header "Authorization: Bearer ${TOKEN_PLACEHOLDER}"`)
    const config = JSON.parse(mcpJsonConfig('https://devlog.life'))
    expect(config.mcpServers.devlog).toEqual({ url: 'https://devlog.life/api/mcp', headers: { Authorization: `Bearer ${TOKEN_PLACEHOLDER}` } })
  })

  it('바로 발행·삭제하는 도구는 허용을 켠 회원에게만 열린다 (053)', () => {
    expect(MCP_TOOLS.filter((t) => t.aiPublish).map((t) => t.name)).toEqual(['publish_post', 'delete_post'])
    expect(MCP_TOOLS.filter((t) => !t.aiPublish).map((t) => t.name)).not.toContain('publish_post')
    expect(MCP_TOOLS.find((t) => t.name === 'request_publish')?.does).toContain('[발행]')
    expect(MCP_TOOLS.map((t) => t.name)).toEqual(expect.arrayContaining(['upload_image', 'create_image_upload_link']))
    expect(MCP_TOOLS.find((t) => t.name === 'update_draft')?.does).toContain('다시 발행')
    expect(MCP_TOOLS.filter((t) => t.diary).map((t) => t.name)).toEqual(['add_note'])
    expect(MCP_TOOLS.map((t) => t.name)).toEqual(expect.arrayContaining(['propose_post', 'list_post_proposals']))
  })

  it('Codex 설정은 토큰을 환경 변수로 받는다 (052)', () => {
    expect(codexConfig('https://devlog.life')).toBe('[mcp_servers.devlog]\nurl = "https://devlog.life/api/mcp"\nbearer_token_env_var = "DEVLOG_TOKEN"')
  })

  it('OAuth 주소의 매개변수를 동의 API 모양으로 바꾼다 (052)', () => {
    const p = oauthParams('?client_id=dvc_1&redirect_uri=https%3A%2F%2Fchatgpt.com%2Fcb&response_type=code&code_challenge=abc&code_challenge_method=S256&state=s%201')
    expect(p).toMatchObject({ clientId: 'dvc_1', redirectUri: 'https://chatgpt.com/cb', responseType: 'code', codeChallengeMethod: 'S256', state: 's 1' })
    expect(p.scope).toBeUndefined()
  })
})
