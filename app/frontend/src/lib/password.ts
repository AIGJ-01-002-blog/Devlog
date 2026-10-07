// 비밀번호 규칙 (docs/07 §4, 004 FR-015·FR-018). 서버 PasswordPolicy와 같은 규칙을 입력 중에 보여 주기 위한 것이고,
// 최종 판정(흔한 비밀번호 목록 포함)은 서버가 한다.
export const SPECIALS = "!@#$%^&*()-_=+[]{};:'\",.<>/?\\|`~"

export interface Rule {
  id: 'length' | 'letter' | 'digit' | 'special' | 'chars' | 'email'
  label: string
  ok: boolean
}

export function passwordRules(password: string, email = ''): Rule[] {
  const chars = [...password]
  const local = email.includes('@') ? email.slice(0, email.indexOf('@')).trim().toLowerCase() : ''
  return [
    { id: 'length', label: '8~16자 (최대 16자)', ok: chars.length >= 8 && chars.length <= 16 },
    { id: 'letter', label: '영문 1자 이상', ok: /[A-Za-z]/.test(password) },
    { id: 'digit', label: '숫자 1자 이상', ok: /[0-9]/.test(password) },
    { id: 'special', label: '특수문자 1자 이상', ok: chars.some((c) => SPECIALS.includes(c)) },
    { id: 'chars', label: '공백·한글 없이 영문·숫자·특수문자만', ok: chars.every((c) => /[A-Za-z0-9]/.test(c) || SPECIALS.includes(c)) },
    { id: 'email', label: '이메일 앞부분 넣지 않기', ok: local.length < 3 || !password.toLowerCase().includes(local) },
  ]
}

export function passwordOk(password: string, email = ''): boolean {
  return passwordRules(password, email).every((r) => r.ok)
}

/**
 * 이메일 가입 주소 칸 입력 정리 (004 FR-012): 대문자는 소문자로, `-`와 허용하지 않는 글자는 지운다.
 * 한글 자판 상태로 친 글자(ㅏ, ㄱ…)는 같은 자리의 영문으로 바꾼다 (두벌식).
 */
const DUBEOLSIK: Record<string, string> = {
  ㅂ: 'q', ㅈ: 'w', ㄷ: 'e', ㄱ: 'r', ㅅ: 't', ㅛ: 'y', ㅕ: 'u', ㅑ: 'i', ㅐ: 'o', ㅔ: 'p',
  ㅁ: 'a', ㄴ: 's', ㅇ: 'd', ㄹ: 'f', ㅎ: 'g', ㅗ: 'h', ㅓ: 'j', ㅏ: 'k', ㅣ: 'l',
  ㅋ: 'z', ㅌ: 'x', ㅊ: 'c', ㅍ: 'v', ㅠ: 'b', ㅜ: 'n', ㅡ: 'm',
  ㅃ: 'q', ㅉ: 'w', ㄸ: 'e', ㄲ: 'r', ㅆ: 't', ㅒ: 'o', ㅖ: 'p',
}

export function cleanHandleInput(raw: string): string {
  return [...raw].map((c) => DUBEOLSIK[c] ?? c).join('').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20)
}
