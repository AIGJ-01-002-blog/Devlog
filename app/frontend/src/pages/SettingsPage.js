import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { ExportSection } from '../components/ExportSection';
import { AiConnectSection } from '../components/AiConnectSection';
import { Avatar } from '../components/Avatar';
import { ImageCropper } from '../components/ImageCropper';
import { PasswordRules } from '../components/PasswordRules';
import { SocialLinksForm } from '../components/SocialLinksForm';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fieldErrors } from '../lib/fieldErrors';
import { friendsApi, lastActiveLabel } from '../lib/friends';
import { clock, fullDate, monthDay } from '../lib/format';
import { checkSourceFile, decodeFile, renderSquare, uploadProfileImage } from '../lib/image';
import { passwordOk } from '../lib/password';
import { MUTABLE_TYPES, notificationsApi } from '../lib/notifications';
import { formatBytes, storageUsage } from '../lib/postImages';
import { Link } from '../lib/router';
import { NavIcon } from '../components/NavIcons';
import { discordApi, isDiscordWebhookUrl } from '../lib/discord';
import { LINK_POLL_MS, linkTimeLeft, telegramApi } from '../lib/telegram';
import { DEFAULT_VISIBILITY_CHANGED } from '../lib/visibility';
import { t, tNodes } from '../lib/i18n';
const PROVIDER_NAMES = { GITHUB: 'GitHub', GOOGLE: 'Google', KAKAO: t('카카오'), FACEBOOK: 'Facebook', LOCAL: t('이메일') };
const BIO_MAX = 200;
const BIO_LINES = 4;
/** 서버(BioPolicy)와 같은 정리: 앞뒤·줄 끝 공백 제거, 연속 빈 줄은 하나로. 글자 수·줄 수는 정리한 뒤 센다. */
export const normalizeBio = (s) => s.replace(/\r\n?/g, '\n').normalize('NFC').trim().replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
/** 소개 글자 수: 서버와 같이 코드 포인트로 센다(이모지 하나 = 1자). */
const bioLength = (s) => Array.from(s).length;
/** 내 설정 탭 (063). 주소 뒤 #이름으로 바로 열린다(/settings#ai). 예전 항목 주소(#telegram)는 그 항목이 든 탭으로 간다. */
export const SETTINGS_TABS = [
    { id: 'profile', label: t('프로필'), hint: t('사진·닉네임·소개·소셜 정보'), icon: 'user' },
    { id: 'account', label: t('계정'), hint: t('로그인·공개 범위·비밀번호·탈퇴'), icon: 'lock' },
    { id: 'notifications', label: t('알림'), hint: t('받을 알림·텔레그램'), icon: 'bell' },
    { id: 'friends', label: t('친구'), hint: t('친구 요청과 친구 목록'), icon: 'users' },
    { id: 'ai', label: t('AI 연결'), hint: t('AI 도구에 쓸 토큰'), icon: 'ai' },
    { id: 'export', label: t('내보내기'), hint: t('내 글을 Markdown으로 받기'), icon: 'download' },
];
const HASH_ALIASES = { telegram: 'notifications', discord: 'notifications', password: 'account', social: 'profile' };
export function tabFromHash(hash) {
    let key;
    // 손으로 고친 주소(#%E0 같은 잘못된 인코딩)여도 화면이 깨지지 않게 프로필로 연다
    try {
        key = decodeURIComponent(hash.replace(/^#/, ''));
    }
    catch {
        return 'profile';
    }
    const found = SETTINGS_TABS.find((t) => t.id === key);
    return found ? found.id : HASH_ALIASES[key] ?? 'profile';
}
/** 내 설정 (005·063): 옆 탭 목록에서 고른 항목 하나만 보인다. 휴대폰에서는 탭 목록이 위에서 옆으로 밀린다. */
export function SettingsPage() {
    const [settings, setSettings] = useState(null);
    const [error, setError] = useState(false);
    const [tab, setTab] = useState(() => tabFromHash(location.hash));
    useEffect(() => {
        api('/api/me/settings').then(setSettings).catch(() => setError(true));
    }, []);
    // 다른 화면의 "설정에서 토큰 만들기"(/settings#ai) 같은 링크와 뒤로 가기를 따른다
    useEffect(() => {
        const sync = () => setTab(tabFromHash(location.hash));
        window.addEventListener('hashchange', sync);
        window.addEventListener('popstate', sync);
        return () => {
            window.removeEventListener('hashchange', sync);
            window.removeEventListener('popstate', sync);
        };
    }, []);
    const pick = (id) => {
        if (id === tab)
            return;
        history.replaceState(null, '', `/settings#${id}`);
        setTab(id);
    };
    const current = SETTINGS_TABS.find((t) => t.id === tab);
    let body = null;
    if (error)
        body = _jsx("p", { className: "error center", role: "alert", children: t('설정을 불러오지 못했어요. 새로고침해 주세요.') });
    else if (!settings)
        body = _jsx("p", { className: "muted center", children: t('불러오는 중…') });
    else if (tab === 'profile')
        body = _jsxs(_Fragment, { children: [_jsx(ProfileSection, { settings: settings, onSaved: (p) => setSettings({ ...settings, ...p }) }), _jsx(SocialLinksForm, { initial: settings.socialLinks, onSaved: (l) => setSettings({ ...settings, socialLinks: l }) })] });
    else if (tab === 'account')
        body = _jsxs(_Fragment, { children: [_jsx(AccountSection, { settings: settings, onChange: setSettings }), settings.hasPassword && _jsx(PasswordSection, {}), _jsxs("section", { className: "settings-section withdraw-link", children: [_jsx("h2", { children: t('회원 탈퇴') }), _jsx("p", { className: "muted small", children: t('탈퇴를 신청해도 30일 안에 다시 로그인하면 모두 복구할 수 있어요.') }), _jsx(Link, { to: "/settings/withdraw", className: "btn btn-text danger", children: t('회원 탈퇴') })] })] });
    else if (tab === 'notifications')
        body = _jsxs(_Fragment, { children: [_jsx(NotificationsSection, {}), _jsx(TelegramSection, {}), _jsx(DiscordSection, {})] });
    else if (tab === 'friends')
        body = _jsx(FriendsSection, {});
    else if (tab === 'ai')
        body = _jsx(AiConnectSection, {});
    else
        body = _jsx(ExportSection, {});
    return (_jsxs("main", { className: "container settings-page", children: [_jsxs("header", { className: "settings-head", children: [_jsx("h1", { className: "page-title", children: t('내 설정') }), _jsx("p", { className: "muted", children: t('프로필과 계정, 알림, AI 연결을 한곳에서 바꿔요.') })] }), _jsxs("div", { className: "settings-layout", children: [_jsx("nav", { className: "settings-nav", "aria-label": t('설정 항목'), children: SETTINGS_TABS.map((t) => (_jsxs("a", { href: `/settings#${t.id}`, "aria-current": t.id === tab ? 'page' : undefined, "data-tip": t.hint, onClick: (e) => { e.preventDefault(); pick(t.id); }, children: [_jsx(NavIcon, { name: t.icon }), _jsx("span", { children: t.label })] }, t.id))) }), _jsx("div", { className: "settings-panel", "aria-label": current.label, role: "region", children: body })] })] }));
}
function ProfileSection({ settings, onSaved }) {
    const { me, refresh } = useAuth();
    const [nickname, setNickname] = useState(settings.nickname);
    const [bio, setBio] = useState(settings.bio ?? '');
    const [image, setImage] = useState({ kind: 'keep' });
    const [source, setSource] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [errors, setErrors] = useState({});
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const fileInput = useRef(null);
    const nicknameLocked = settings.nicknameNextChangeableAt != null;
    const cleanBio = normalizeBio(bio);
    const bioCount = bioLength(cleanBio);
    const bioLineCount = cleanBio ? cleanBio.split('\n').length : 0;
    const shownImage = image.kind === 'new' ? image.previewUrl : image.kind === 'default' ? null : settings.profileImageUrl;
    const dirty = nickname !== settings.nickname || bio !== (settings.bio ?? '') || image.kind !== 'keep';
    useEffect(() => () => { if (image.kind === 'new')
        URL.revokeObjectURL(image.previewUrl); }, [image]);
    const pick = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file)
            return;
        const problem = checkSourceFile(file);
        if (problem)
            return setErrors({ profileImageId: problem });
        try {
            setErrors({});
            setSource(await decodeFile(file));
        }
        catch {
            setErrors({ profileImageId: t('사진을 열 수 없어요. 다른 사진을 골라 주세요.') });
        }
    };
    const apply = async (crop) => {
        if (!source)
            return;
        setUploading(true);
        try {
            const blob = await renderSquare(source, crop);
            const up = await uploadProfileImage(blob);
            setImage({ kind: 'new', id: up.id, previewUrl: URL.createObjectURL(blob) });
            setSource(null);
            setSaved(false);
        }
        catch (err) {
            setErrors({ profileImageId: err instanceof ApiError ? err.message : t('사진을 올리지 못했어요. 다시 시도해 주세요.') });
        }
        finally {
            setUploading(false);
        }
    };
    const save = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        setSaved(false);
        const body = {};
        if (nickname !== settings.nickname)
            body.nickname = nickname;
        if (bio !== (settings.bio ?? ''))
            body.bio = bio;
        if (image.kind === 'new')
            body.profileImageId = image.id;
        if (image.kind === 'default')
            body.profileImageId = null;
        try {
            const p = await api('/api/me/profile', { method: 'PATCH', body });
            onSaved(p);
            setNickname(p.nickname);
            setBio(p.bio ?? '');
            setImage({ kind: 'keep' });
            setSaved(true);
            await refresh();
        }
        catch (err) {
            const map = fieldErrors(err);
            const next = err instanceof ApiError ? err.details?.nextChangeableAt : undefined;
            if (next && map.nickname)
                map.nickname = t('{0} 다음 변경 가능일: {1}', { 0: map.nickname, 1: monthDay(next) });
            setErrors(map);
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("section", { className: "settings-section", children: [_jsx("h2", { children: t('프로필') }), _jsxs("form", { className: "form", onSubmit: save, children: [_jsxs("div", { className: "profile-photo", children: [_jsx(Avatar, { src: shownImage, name: nickname || settings.nickname, seed: settings.handle, size: 96 }), _jsxs("div", { className: "profile-photo-actions", children: [me?.emailVerified === false
                                        ? _jsx("p", { className: "small muted", children: t('이메일 인증을 마치면 사진을 올릴 수 있어요.') })
                                        : _jsx("button", { type: "button", className: "btn btn-outline", onClick: () => fileInput.current?.click(), disabled: uploading, children: t('이미지 변경') }), shownImage && _jsx("button", { type: "button", className: "btn btn-text", onClick: () => { setImage({ kind: 'default' }); setSaved(false); }, children: t('기본 이미지로') }), _jsx("input", { ref: fileInput, type: "file", accept: "image/jpeg,image/png,image/gif,image/webp", hidden: true, onChange: pick })] })] }), source && _jsx(ImageCropper, { image: source, busy: uploading, onApply: apply, onCancel: () => setSource(null) }), errors.profileImageId && _jsx("p", { className: "error small", role: "alert", children: errors.profileImageId }), image.kind === 'new' && _jsx("p", { className: "small muted", children: t('[저장]을 눌러야 프로필 사진이 바뀌어요.') }), _jsxs("label", { className: "field", children: [_jsx("span", { children: t('닉네임') }), _jsx("input", { value: nickname, onChange: (e) => setNickname(e.target.value), maxLength: 10, disabled: nicknameLocked, autoComplete: "nickname", "aria-describedby": "nickname-help", "aria-invalid": !!errors.nickname }), _jsx("small", { id: "nickname-help", className: errors.nickname ? 'error' : 'muted', children: errors.nickname ?? (nicknameLocked
                                    ? t('다음 변경 가능일: {0}', { 0: monthDay(settings.nicknameNextChangeableAt) })
                                    : t('한 번 바꾸면 30일 동안 다시 바꿀 수 없어요.')) })] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: t('소개') }), _jsx("textarea", { value: bio, onChange: (e) => setBio(e.target.value), rows: 4, "aria-describedby": "bio-help" }), _jsx("small", { id: "bio-help", className: errors.bio || bioCount > BIO_MAX || bioLineCount > BIO_LINES ? 'error' : 'muted', children: errors.bio ?? (bioLineCount > BIO_LINES ? t('소개는 4줄까지 쓸 수 있어요.') : `${bioCount} / ${BIO_MAX}`) })] }), _jsxs("div", { className: "field", children: [_jsx("span", { children: t('블로그 주소') }), _jsxs("p", { className: "readonly", children: ["@", settings.handle, " ", _jsx("span", { className: "muted small", children: t('변경할 수 없어요') })] })] }), errors.form && _jsx("p", { className: "error", role: "alert", children: errors.form }), saved && _jsx("p", { className: "ok", role: "status", children: t('저장했어요.') }), _jsx("div", { children: _jsx("button", { className: "btn btn-primary", disabled: saving || uploading || !dirty || bioCount > BIO_MAX || bioLineCount > BIO_LINES, children: saving ? t('저장하는 중…') : t('저장') }) })] })] }));
}
function AccountSection({ settings, onChange }) {
    const { refresh } = useAuth();
    const [message, setMessage] = useState(null);
    const prev = settings.previousLogin;
    const changeVisibility = async (v) => {
        if (v === settings.defaultVisibility)
            return;
        const before = settings;
        onChange({ ...settings, defaultVisibility: v }); // 바로 바꿔 보이고, 실패하면 되돌린다
        try {
            await api('/api/me/settings', { method: 'PATCH', body: { defaultVisibility: v } });
            setMessage({ ok: true, text: DEFAULT_VISIBILITY_CHANGED[v] });
            await refresh();
        }
        catch {
            onChange(before);
            setMessage({ ok: false, text: t('바꾸지 못했어요. 다시 시도해 주세요.') });
        }
    };
    const changeLastActive = async (visible) => {
        const before = settings;
        onChange({ ...settings, lastActiveVisible: visible });
        try {
            await api('/api/me/settings', { method: 'PATCH', body: { lastActiveVisible: visible } });
            setMessage({ ok: true, text: visible ? t('친구에게 최근 활동을 보여요.') : t('이제 친구에게 최근 활동이 보이지 않고, 나도 친구들의 최근 활동을 볼 수 없어요.') });
        }
        catch {
            onChange(before);
            setMessage({ ok: false, text: t('바꾸지 못했어요. 다시 시도해 주세요.') });
        }
    };
    const [savingFollowList, setSavingFollowList] = useState(false);
    const changeFollowList = async (open) => {
        const before = settings;
        onChange({ ...settings, followListPublic: open });
        setSavingFollowList(true); // 저장이 끝나기 전에 다시 바꿔 요청 순서가 뒤집히지 않게
        try {
            await api('/api/me/settings', { method: 'PATCH', body: { followListPublic: open } });
            setMessage({ ok: true, text: open ? t('이제 누구나 내 팔로워·팔로잉 목록을 볼 수 있어요.') : t('이제 다른 사람에게는 "비공개 계정입니다"로 보여요. 수는 그대로 보여요.') });
        }
        catch {
            onChange(before);
            setMessage({ ok: false, text: t('바꾸지 못했어요. 다시 시도해 주세요.') });
        }
        finally {
            setSavingFollowList(false);
        }
    };
    const withdrawAi = async () => {
        if (!window.confirm(t('AI 기능 동의를 철회할까요? 다음에 AI 기능을 쓰려면 다시 동의해야 해요.')))
            return;
        try {
            await api('/api/me/agreements/ai', { method: 'DELETE' });
            onChange({ ...settings, aiAgreed: false });
            setMessage({ ok: true, text: t('AI 기능 동의를 철회했어요.') });
        }
        catch {
            setMessage({ ok: false, text: t('철회하지 못했어요. 다시 시도해 주세요.') });
        }
    };
    return (_jsxs("section", { className: "settings-section", children: [_jsx("h2", { children: t('계정') }), _jsxs("dl", { className: "settings-list", children: [_jsx("dt", { children: t('이메일') }), _jsxs("dd", { children: [settings.email ?? t('없음'), " ", _jsx("span", { className: "muted small", children: t('변경할 수 없어요') })] }), _jsx("dt", { children: t('로그인 수단') }), _jsx("dd", { children: PROVIDER_NAMES[settings.provider] ?? settings.provider }), _jsx("dt", { children: t('직전 로그인') }), _jsx("dd", { children: prev.at ? `${fullDate(prev.at)} ${clock(prev.at)}, ${PROVIDER_NAMES[prev.provider] ?? prev.provider}` : t('첫 로그인') }), _jsx("dt", { id: "default-visibility", children: t('새 글 기본 공개 범위') }), _jsxs("dd", { role: "radiogroup", "aria-labelledby": "default-visibility", className: "row", children: [_jsxs("label", { children: [_jsx("input", { type: "radio", name: "defaultVisibility", checked: settings.defaultVisibility === 'PUBLIC', onChange: () => changeVisibility('PUBLIC') }), "  ", t('전체 공개')] }), _jsxs("label", { children: [_jsx("input", { type: "radio", name: "defaultVisibility", checked: settings.defaultVisibility === 'FRIENDS', onChange: () => changeVisibility('FRIENDS') }), "  ", t('친구에게만')] }), _jsxs("label", { children: [_jsx("input", { type: "radio", name: "defaultVisibility", checked: settings.defaultVisibility === 'PRIVATE', onChange: () => changeVisibility('PRIVATE') }), "  ", t('나만 보기')] })] }), _jsx("dt", { children: t('사진 저장 공간') }), _jsx("dd", { children: _jsx(StorageMeter, {}) }), _jsx("dt", { children: t('최근 활동') }), _jsxs("dd", { children: [_jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: settings.lastActiveVisible, onChange: (e) => changeLastActive(e.target.checked) }), "  ", t('최근 활동을 친구에게 보이기')] }), _jsxs("span", { className: "muted small", children: ["  ", t('끄면 나도 친구들의 최근 활동을 볼 수 없어요.')] })] }), _jsx("dt", { children: t('팔로워·팔로잉 목록') }), _jsxs("dd", { children: [_jsxs("label", { title: t('끄면 나와 관리자만 목록을 보고, 다른 사람에게는 \'비공개 계정입니다\'로 보여요'), children: [_jsx("input", { type: "checkbox", checked: settings.followListPublic, disabled: savingFollowList, onChange: (e) => changeFollowList(e.target.checked) }), "  ", t('다른 사람에게 공개')] }), _jsxs("span", { className: "muted small", children: ["  ", t('끄면 다른 사람에게는 "비공개 계정입니다"로 보여요. 팔로워·팔로잉 수는 그대로 보여요.')] })] }), settings.aiAgreed && (_jsxs(_Fragment, { children: [_jsx("dt", { children: t('AI 기능 동의') }), _jsx("dd", { children: _jsx("button", { type: "button", className: "btn btn-text", onClick: withdrawAi, children: t('동의 철회') }) })] })), _jsx("dt", { children: t('약관') }), _jsxs("dd", { children: [_jsx("a", { href: "/terms", target: "_blank", rel: "noopener", children: t('이용약관') }), " \u00B7 ", _jsx("a", { href: "/privacy", target: "_blank", rel: "noopener", children: t('개인정보 처리방침') })] })] }), message && _jsx("p", { className: message.ok ? 'ok' : 'error', role: message.ok ? 'status' : 'alert', children: message.text })] }));
}
/** 비밀번호 변경 (004 US5): 이메일 가입자만. 바꾸면 다른 기기는 로그아웃되고 알림 메일이 간다. */
function PasswordSection() {
    const [current, setCurrent] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [errors, setErrors] = useState({});
    const [done, setDone] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const submit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErrors({});
        setDone(false);
        try {
            await api('/api/me/password', { method: 'PUT', body: { currentPassword: current, password, passwordConfirm: confirm } });
            setDone(true);
            setCurrent('');
            setPassword('');
            setConfirm('');
        }
        catch (err) {
            setErrors(fieldErrors(err));
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs("section", { className: "settings-section", children: [_jsx("h2", { children: t('비밀번호') }), _jsxs("form", { className: "form", onSubmit: submit, children: [_jsxs("label", { className: "field", children: [_jsx("span", { children: t('현재 비밀번호') }), _jsx("input", { type: "password", value: current, onChange: (e) => setCurrent(e.target.value), autoComplete: "current-password", required: true, "aria-invalid": !!errors.currentPassword, "aria-describedby": errors.currentPassword ? 'current-pw-error' : undefined }), errors.currentPassword && _jsx("small", { id: "current-pw-error", className: "error", role: "alert", children: errors.currentPassword })] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: t('새 비밀번호') }), _jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), autoComplete: "new-password", maxLength: 64, required: true, "aria-invalid": !!errors.password, "aria-describedby": errors.password ? 'new-pw-error' : undefined }), _jsx(PasswordRules, { password: password }), errors.password && _jsx("small", { id: "new-pw-error", className: "error", role: "alert", children: errors.password })] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: t('새 비밀번호 확인') }), _jsx("input", { type: "password", value: confirm, onChange: (e) => setConfirm(e.target.value), autoComplete: "new-password", maxLength: 64, required: true, "aria-invalid": !!errors.passwordConfirm || (!!confirm && confirm !== password), "aria-describedby": errors.passwordConfirm || (confirm && confirm !== password) ? 'confirm-pw-error' : undefined }), (errors.passwordConfirm || (confirm && confirm !== password)) && (_jsx("small", { id: "confirm-pw-error", className: "error", role: errors.passwordConfirm ? 'alert' : undefined, children: errors.passwordConfirm ?? t('비밀번호가 서로 달라요.') }))] }), errors.form && _jsx("p", { className: "error", role: "alert", children: errors.form }), done && _jsx("p", { className: "ok", role: "status", children: t('비밀번호를 바꿨어요. 다른 기기에서는 로그아웃됐어요.') }), _jsx("div", { children: _jsx("button", { className: "btn btn-primary", disabled: submitting || !current || !passwordOk(password) || password !== confirm, children: submitting ? t('변경하는 중…') : t('비밀번호 변경') }) })] })] }));
}
/** 친구 (008 US1·US2): 받은 요청 수락·거절, 친구 목록과 최근 활동, 보낸 요청 취소. 수락하면 요청한 사람에게 알린다(015 A-1). 거절·취소·끊기는 알리지 않는다. */
/** 알림 끄기 (015 US5). 바로 저장하고, 실패하면 되돌린다. 운영 알림은 목록에 없다(끌 수 없음). */
function NotificationsSection() {
    const [muted, setMuted] = useState(null);
    const [message, setMessage] = useState(null);
    useEffect(() => {
        notificationsApi.settings().then((s) => setMuted(s.muted)).catch(() => setMessage({ ok: false, text: t('알림 설정을 불러오지 못했어요.') }));
    }, []);
    useEffect(() => {
        if (muted && location.hash === '#notifications')
            document.getElementById('notifications')?.scrollIntoView();
    }, [muted]);
    const toggle = async (type, on) => {
        if (!muted)
            return;
        const before = muted;
        const next = on ? muted.filter((t) => t !== type) : [...muted, type];
        setMuted(next);
        try {
            setMuted((await notificationsApi.saveSettings(next)).muted);
            setMessage({ ok: true, text: t('저장했어요.') });
        }
        catch {
            setMuted(before);
            setMessage({ ok: false, text: t('바꾸지 못했어요. 다시 시도해 주세요.') });
        }
    };
    return (_jsxs("section", { className: "settings-section", id: "notifications", children: [_jsx("h2", { children: t('알림') }), muted && (_jsx("ul", { className: "notification-settings", children: MUTABLE_TYPES.map(({ type, label }) => (_jsx("li", { children: _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: !muted.includes(type), onChange: (e) => toggle(type, e.target.checked) }), " ", label] }) }, type))) })), _jsx("p", { className: "muted small", children: t('운영 알림(신고 결과·숨김)은 끌 수 없어요. 끈 알림은 그동안 쌓이지 않아요.') }), message && _jsx("p", { className: message.ok ? 'ok' : 'error', role: message.ok ? 'status' : 'alert', children: message.text })] }));
}
/**
 * 텔레그램 (023): 1회용 주소로 연결하고, 새 알림 받기를 켜고 끈다. 연결하면 봇에게 보낸 메모가 임시글이 된다.
 * 서버에 봇이 없으면(available=false) 항목을 숨긴다. 주소를 연 뒤에는 연결될 때까지 상태를 다시 읽는다.
 */
function TelegramSection() {
    const [status, setStatus] = useState(null);
    const [link, setLink] = useState(null);
    const [now, setNow] = useState(() => Date.now());
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);
    useEffect(() => { telegramApi.status().then(setStatus).catch(() => setStatus(null)); }, []);
    // 연결 주소가 살아 있는 동안만 상태를 다시 읽는다
    useEffect(() => {
        if (!link)
            return;
        const timer = window.setInterval(async () => {
            setNow(Date.now());
            if (!linkTimeLeft(link.expiresAt)) {
                setLink(null);
                return;
            }
            try {
                const s = await telegramApi.status();
                if (s.linked) {
                    setStatus(s);
                    setLink(null);
                    setMessage({ ok: true, text: t('텔레그램과 연결했어요.') });
                }
            }
            catch { /* 다음 차례에 다시 읽는다 */ }
        }, LINK_POLL_MS);
        return () => window.clearInterval(timer);
    }, [link]);
    if (!status?.available)
        return null;
    const run = async (fn, fail) => {
        setBusy(true);
        setMessage(null);
        try {
            await fn();
        }
        catch {
            setMessage({ ok: false, text: fail });
        }
        finally {
            setBusy(false);
        }
    };
    const connect = () => run(async () => {
        const l = await telegramApi.link();
        setNow(Date.now());
        setLink(l);
    }, t('연결 주소를 만들지 못했어요. 다시 시도해 주세요.'));
    const toggle = (on) => run(async () => {
        setStatus(await telegramApi.setNotifications(on));
        setMessage({ ok: true, text: t('저장했어요.') });
    }, t('바꾸지 못했어요. 다시 시도해 주세요.'));
    const disconnect = () => {
        if (!confirm(t('텔레그램 연결을 끊을까요? 새 알림을 텔레그램으로 받지 못하게 돼요.')))
            return;
        void run(async () => {
            await telegramApi.unlink();
            setStatus({ ...status, linked: false, linkedAt: null });
            setMessage({ ok: true, text: t('연결을 끊었어요.') });
        }, t('연결을 끊지 못했어요. 다시 시도해 주세요.'));
    };
    const left = link ? linkTimeLeft(link.expiresAt, now) : null;
    return (_jsxs("section", { className: "settings-section", id: "telegram", children: [_jsx("h2", { children: t('텔레그램') }), status.linked ? (_jsxs(_Fragment, { children: [_jsxs("p", { children: [status.botUsername ? t('@{0}과 연결돼 있어요', { 0: status.botUsername }) : t('봇과 연결돼 있어요'), status.linkedAt && _jsxs("span", { className: "muted small", children: [" ", tNodes('· {0}부터', { 0: fullDate(status.linkedAt) })] })] }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: status.notifications, disabled: busy, onChange: (e) => toggle(e.target.checked) }), "  ", t('새 알림을 텔레그램으로 받기')] }), _jsx("p", { className: "muted small", children: t('봇에게 보낸 메모는 임시글로 저장돼요. AI 사용에 동의했으면 다듬어서 저장해요.') }), _jsx("button", { type: "button", className: "btn btn-text danger", disabled: busy, onClick: disconnect, children: t('연결 끊기') })] })) : (_jsxs(_Fragment, { children: [_jsx("p", { className: "muted small", children: t('연결하면 새 알림을 텔레그램으로 받고, 봇에게 보낸 메모를 임시글로 저장할 수 있어요.') }), link && left ? (_jsxs("p", { children: [_jsx("a", { className: "btn btn-primary", href: link.url, target: "_blank", rel: "noopener noreferrer", children: t('텔레그램 열기') }), ' ', _jsx("span", { className: "muted small", children: tNodes('{0} 열면 자동으로 연결돼요.', { 0: left }) })] })) : (_jsx("button", { type: "button", className: "btn", disabled: busy, onClick: connect, children: link ? t('주소 다시 만들기') : t('연결하기') }))] })), message && _jsx("p", { className: message.ok ? 'ok' : 'error', role: message.ok ? 'status' : 'alert', children: message.text })] }));
}
function DiscordSection() {
    const [status, setStatus] = useState(null);
    const [url, setUrl] = useState('');
    const [editing, setEditing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);
    useEffect(() => { discordApi.status().then(setStatus).catch(() => setStatus(null)); }, []);
    if (!status?.available)
        return null;
    const run = async (fn, fail) => {
        setBusy(true);
        setMessage(null);
        try {
            await fn();
        }
        catch (e) {
            setMessage({ ok: false, text: e instanceof ApiError ? e.message : fail });
        }
        finally {
            setBusy(false);
        }
    };
    const urlOk = isDiscordWebhookUrl(url);
    const connect = (e) => {
        e.preventDefault();
        if (!urlOk)
            return;
        void run(async () => {
            setStatus(await discordApi.connect(url));
            setUrl('');
            setEditing(false);
            setMessage({ ok: true, text: t('디스코드와 연결했어요. 채널에 첫 메시지를 보냈어요.') });
        }, t('연결하지 못했어요. 다시 시도해 주세요.'));
    };
    const test = () => run(async () => {
        setStatus(await discordApi.test());
        setMessage({ ok: true, text: t('시험 메시지를 보냈어요. 디스코드 채널을 확인해 보세요.') });
    }, t('보내지 못했어요. 다시 시도해 주세요.'));
    const toggle = (on) => run(async () => {
        setStatus(await discordApi.setNotifications(on));
        setMessage({ ok: true, text: t('저장했어요.') });
    }, t('바꾸지 못했어요. 다시 시도해 주세요.'));
    const disconnect = () => {
        if (!confirm(t('디스코드 연결을 끊을까요? 새 알림을 디스코드로 받지 못하게 돼요.')))
            return;
        void run(async () => {
            await discordApi.unlink();
            setStatus({ ...status, linked: false, webhookName: null, linkedAt: null });
            setMessage({ ok: true, text: t('연결을 끊었어요.') });
        }, t('연결을 끊지 못했어요. 다시 시도해 주세요.'));
    };
    const form = (_jsxs("form", { className: "form", onSubmit: connect, children: [_jsxs("label", { className: "field", children: [_jsx("span", { children: t('웹훅 주소') }), _jsx("input", { type: "url", inputMode: "url", value: url, onChange: (e) => setUrl(e.target.value), autoComplete: "off", spellCheck: false, placeholder: "https://discord.com/api/webhooks/\u2026", "aria-invalid": !!url && !urlOk, "aria-describedby": url && !urlOk ? 'discord-url-error' : 'discord-url-help' }), _jsx("small", { id: "discord-url-help", className: "muted", children: t('디스코드 채널 설정 › 연동 › 웹후크에서 새 웹후크를 만들고 [웹후크 URL 복사]를 눌러 붙여 넣어 주세요.') }), url && !urlOk && _jsx("small", { id: "discord-url-error", className: "error", children: t('디스코드 웹훅 주소 꼴이 아니에요.') })] }), _jsxs("div", { className: "row", children: [_jsx("button", { className: "btn btn-primary", disabled: busy || !urlOk, "data-tip": t('주소를 확인하고 이 채널로 알림을 보내요'), children: busy ? t('확인하는 중…') : status.linked ? t('이 주소로 바꾸기') : t('연결하기') }), editing && _jsx("button", { type: "button", className: "btn btn-text", disabled: busy, onClick: () => { setEditing(false); setUrl(''); }, children: t('취소') })] })] }));
    return (_jsxs("section", { className: "settings-section", id: "discord", children: [_jsx("h2", { children: t('디스코드') }), status.linked ? (_jsxs(_Fragment, { children: [_jsxs("p", { children: [status.webhookName ? t('웹훅 「{0}」과 연결돼 있어요', { 0: status.webhookName }) : t('웹훅과 연결돼 있어요'), status.linkedAt && _jsxs("span", { className: "muted small", children: [" ", tNodes('· {0}부터', { 0: fullDate(status.linkedAt) })] })] }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: status.notifications, disabled: busy, onChange: (e) => toggle(e.target.checked) }), "  ", t('새 알림을 디스코드로 받기')] }), editing ? form : (_jsxs("div", { className: "row", children: [_jsx("button", { type: "button", className: "btn", disabled: busy, onClick: test, "data-tip": t('연결된 채널로 시험 메시지를 하나 보내요'), children: t('시험 보내기') }), _jsx("button", { type: "button", className: "btn btn-text", disabled: busy, onClick: () => { setEditing(true); setMessage(null); }, "data-tip": t('다른 채널의 웹훅 주소로 바꿔요'), children: t('주소 바꾸기') }), _jsx("button", { type: "button", className: "btn btn-text danger", disabled: busy, onClick: disconnect, "data-tip": t('더는 디스코드로 알림을 보내지 않아요'), children: t('연결 끊기') })] }))] })) : (_jsxs(_Fragment, { children: [_jsx("p", { className: "muted small", children: t('내 디스코드 서버의 채널로 새 알림(댓글·좋아요·팔로우 등)을 받아요. 웹훅 주소는 비밀번호처럼 다뤄 주세요.') }), form] })), message && _jsx("p", { className: message.ok ? 'ok' : 'error', role: message.ok ? 'status' : 'alert', children: message.text })] }));
}
function FriendsSection() {
    const [data, setData] = useState(null);
    const [busy, setBusy] = useState(null);
    const [message, setMessage] = useState(null);
    useEffect(() => { friendsApi.overview().then(setData).catch(() => setMessage({ ok: false, text: t('친구 목록을 불러오지 못했어요.') })); }, []);
    const act = async (handle, fn, text) => {
        setBusy(handle);
        try {
            await fn();
            setData(await friendsApi.overview());
            setMessage({ ok: true, text });
        }
        catch (e) {
            setMessage({ ok: false, text: e instanceof ApiError ? e.message : t('처리하지 못했어요. 다시 시도해 주세요.') });
        }
        finally {
            setBusy(null);
        }
    };
    if (!data)
        return message ? _jsxs("section", { className: "settings-section", children: [_jsx("h2", { children: t('친구') }), _jsx("p", { className: "error", role: "alert", children: message.text })] }) : null;
    const row = (p, actions, extra) => (_jsxs("li", { className: "friend-row", children: [_jsxs(Link, { to: `/@${p.handle}`, className: "friend-who", children: [_jsx(Avatar, { src: p.profileImageUrl, name: p.nickname, seed: p.handle, size: 32 }), _jsxs("span", { children: [_jsx("b", { children: p.nickname }), " ", _jsxs("span", { className: "muted small nowrap", children: ["@", p.handle] })] })] }), extra && _jsx("span", { className: "muted small", children: extra }), _jsx("span", { className: "friend-row-actions", children: actions })] }, p.handle));
    return (_jsxs("section", { className: "settings-section", children: [_jsx("h2", { children: t('친구') }), data.received.length > 0 && (_jsxs(_Fragment, { children: [_jsx("h3", { children: tNodes('받은 친구 요청 {0}', { 0: data.received.length }) }), _jsx("ul", { className: "friend-list", children: data.received.map((p) => row(p, _jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: "btn btn-primary", disabled: busy === p.handle, "data-tip": t('친구가 되고 상대에게 수락 알림이 가요'), onClick: () => act(p.handle, () => friendsApi.accept(p.handle), t('{0}님과 친구가 됐어요.', { 0: p.nickname })), children: t('수락') }), _jsx("button", { type: "button", className: "btn btn-text", disabled: busy === p.handle, "data-tip": t('요청을 지워요(상대에게 알리지 않아요)'), onClick: () => act(p.handle, () => friendsApi.remove(p.handle), t('요청을 거절했어요.')), children: t('거절') })] }))) })] })), _jsx("h3", { children: tNodes('친구 {0}', { 0: data.friends.length }) }), data.friends.length === 0
                ? _jsx("p", { className: "muted small", children: t('아직 친구가 없어요. 다른 사람의 블로그에서 [친구 요청]을 보내 보세요.') })
                : (_jsx("ul", { className: "friend-list", children: data.friends.map((p) => row(p, _jsx("button", { type: "button", className: "btn btn-text", disabled: busy === p.handle, "data-tip": t('친구 관계를 끊어요(상대에게 알리지 않아요)'), onClick: () => {
                            if (confirm(t('{0}님과 친구를 끊을까요? 상대에게 알림은 가지 않아요.', { 0: p.nickname }))) {
                                void act(p.handle, () => friendsApi.remove(p.handle), t('친구를 끊었어요.'));
                            }
                        }, children: t('친구 끊기') }), lastActiveLabel(p.lastActiveDaysAgo) && t('최근 활동 {0}', { 0: lastActiveLabel(p.lastActiveDaysAgo) }))) })), data.sent.length > 0 && (_jsxs(_Fragment, { children: [_jsx("h3", { children: tNodes('보낸 요청 {0}', { 0: data.sent.length }) }), _jsx("ul", { className: "friend-list", children: data.sent.map((p) => row(p, _jsx("button", { type: "button", className: "btn btn-text", disabled: busy === p.handle, "data-tip": t('보낸 요청을 거둬요(상대에게 알리지 않아요)'), onClick: () => act(p.handle, () => friendsApi.remove(p.handle), t('요청을 취소했어요.')), children: t('요청 취소') }))) })] })), message && _jsx("p", { className: message.ok ? 'ok' : 'error', role: message.ok ? 'status' : 'alert', children: message.text })] }));
}
/** 사진 저장 공간 (009 US5). 지운 사진의 공간은 정리 작업이 실제로 지울 때(7일 뒤) 돌아온다. */
function StorageMeter() {
    const [u, setU] = useState(null);
    useEffect(() => { storageUsage().then(setU).catch(() => undefined); }, []);
    if (!u)
        return _jsx("span", { className: "muted small", children: t('불러오는 중…') });
    const ratio = Math.min(1, u.usedBytes / u.quotaBytes);
    return (_jsxs("div", { children: [_jsx("div", { className: `storage-bar${ratio > 0.9 ? ' warn' : ''}`, role: "meter", "aria-valuemin": 0, "aria-valuemax": u.quotaBytes, "aria-valuenow": u.usedBytes, "aria-label": t('사진 저장 공간 사용량'), children: _jsx("span", { style: { width: `${(ratio * 100).toFixed(1)}%` } }) }), _jsxs("span", { className: "small", children: [formatBytes(u.usedBytes), " / ", formatBytes(u.quotaBytes)] }), _jsxs("span", { className: "muted small", children: ["  ", tNodes('· 오늘 {0}/{1}장 · 지운 사진의 공간은 7일 뒤 돌아와요', { 0: u.todayCount, 1: u.dailyLimit })] })] }));
}
