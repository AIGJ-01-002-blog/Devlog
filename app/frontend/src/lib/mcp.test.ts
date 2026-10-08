import { describe, expect, it } from 'vitest'
import { claudeCodeCommand, MCP_TOOLS, mcpEndpoint, mcpJsonConfig, TOKEN_PLACEHOLDER } from './mcp'

describe('MCP 연결 안내 (049)', () => {
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

  it('바로 발행하는 도구는 없다', () => {
    expect(MCP_TOOLS.map((t) => t.name)).not.toContain('publish_post')
    expect(MCP_TOOLS.find((t) => t.name === 'request_publish')?.does).toContain('[발행]')
  })
})
