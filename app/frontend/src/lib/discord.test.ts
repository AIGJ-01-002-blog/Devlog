import { describe, expect, it } from 'vitest'
import { isDiscordWebhookUrl } from './discord'

const TOKEN = 'Abc-def_ghiJKLmnopQRSTuvwxYZ0123456789abcdefghijklmnopqrstuvwxyzAB'

describe('isDiscordWebhookUrl', () => {
  it('디스코드 앱이 주는 웹훅 주소를 받는다', () => {
    expect(isDiscordWebhookUrl(`https://discord.com/api/webhooks/123456789012345678/${TOKEN}`)).toBe(true)
    expect(isDiscordWebhookUrl(` https://canary.discord.com/api/webhooks/123456789012345678/${TOKEN} `)).toBe(true)
    expect(isDiscordWebhookUrl(`https://discordapp.com/api/v10/webhooks/123456789012345678/${TOKEN}/`)).toBe(true)
  })

  it('다른 주소는 받지 않는다', () => {
    expect(isDiscordWebhookUrl(`http://discord.com/api/webhooks/123456789012345678/${TOKEN}`)).toBe(false)
    expect(isDiscordWebhookUrl(`https://discord.com.evil.example/api/webhooks/123456789012345678/${TOKEN}`)).toBe(false)
    expect(isDiscordWebhookUrl('https://discord.com/channels/1/2')).toBe(false)
    expect(isDiscordWebhookUrl('')).toBe(false)
  })
})
