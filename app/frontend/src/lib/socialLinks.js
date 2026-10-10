import { t } from './i18n';
/** 블로그 머리와 설정 화면에 보이는 순서 */
export const SOCIAL_FIELDS = [
    { kind: 'email', label: t('이메일'), placeholder: 'me@example.com', href: (v) => `mailto:${v}` },
    { kind: 'github', label: 'GitHub', placeholder: t('아이디 또는 github.com 주소'), href: (v) => `https://github.com/${v}` },
    { kind: 'x', label: 'X', placeholder: t('아이디 또는 x.com 주소'), href: (v) => `https://x.com/${v}` },
    { kind: 'facebook', label: 'Facebook', placeholder: t('아이디 또는 facebook.com 주소'), href: (v) => `https://www.facebook.com/${v}` },
    { kind: 'homepage', label: t('홈페이지'), placeholder: 'https://', href: (v) => v },
];
