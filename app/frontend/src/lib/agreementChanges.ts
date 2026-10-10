import { t } from './i18n'
/**
 * 약관·처리방침 버전마다 무엇이 바뀌었는지 (077). 재동의 화면이 지금 버전의 항목을 보여 준다.
 * application.yml의 blog.agreements 버전을 올릴 때 여기에 한 줄을 더한다. 없으면 바뀐 내용 줄을 그리지 않는다.
 */
export interface AgreementChange { what: string; href: string }

export const TERMS_CHANGES: Record<string, AgreementChange> = {}

export const PRIVACY_CHANGES: Record<string, AgreementChange> = {
  '2026-10-10': { what: t('"7. 광고와 쿠키"를 더했어요. 공개 화면에 Google 애드센스 광고를 싣고, 광고 사업자가 쿠키를 써요.'), href: '/privacy#ads' },
}
