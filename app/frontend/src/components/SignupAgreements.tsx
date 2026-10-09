import { useId } from 'react'

export interface AgreementChecks { terms: boolean; privacy: boolean; ai: boolean }

interface Props {
  value: AgreementChecks
  onChange: (next: AgreementChecks) => void
  termsDate?: string
  privacyDate?: string
  error?: string
}

/**
 * 가입 화면의 동의 묶음 (이메일·소셜 가입 공용). 필수 약관 둘과 선택 항목 "AI 기능 이용"을 따로 받는다.
 * 선택 동의는 필수와 한 체크박스로 묶지 않는다(개인정보 보호법). "모두 동의"는 세 항목을 한꺼번에 켜고 끄는 편의 기능이다.
 */
export function SignupAgreements({ value, onChange, termsDate, privacyDate, error }: Props) {
  const all = value.terms && value.privacy && value.ai
  const errorId = useId()
  const describedBy = error ? errorId : undefined
  return (
    <fieldset className="field agreements">
      <legend className="sr-only">약관 동의</legend>
      <label><input type="checkbox" checked={all} onChange={(e) => onChange({ terms: e.target.checked, privacy: e.target.checked, ai: e.target.checked })} /> <b>모두 동의 (선택 항목 포함)</b></label>
      <label><input type="checkbox" checked={value.terms} aria-describedby={describedBy} onChange={(e) => onChange({ ...value, terms: e.target.checked })} /> (필수) 이용약관{termsDate ? ` (${termsDate} 시행)` : ''}</label>
      <label><input type="checkbox" checked={value.privacy} aria-describedby={describedBy} onChange={(e) => onChange({ ...value, privacy: e.target.checked })} /> (필수) 개인정보 처리방침{privacyDate ? ` (${privacyDate} 시행)` : ''}</label>
      <label>
        <input type="checkbox" checked={value.ai} onChange={(e) => onChange({ ...value, ai: e.target.checked })} aria-describedby="agree-ai-help" />
        <span>
          (선택) AI 기능 이용 동의
          <small id="agree-ai-help" className="muted agreement-help">
            AI 태그 추천 등을 쓸 때 글 제목·본문 앞부분이 Google Gemini로 전송될 수 있어요. 동의하지 않아도 가입할 수 있고,
            AI를 처음 쓸 때 다시 물어봐요. 설정에서 언제든 철회할 수 있어요. <a href="/privacy#ai" target="_blank" rel="noopener">자세히</a>
          </small>
        </span>
      </label>
      {error && <small id={errorId} className="error" role="alert">{error}</small>}
    </fieldset>
  )
}
