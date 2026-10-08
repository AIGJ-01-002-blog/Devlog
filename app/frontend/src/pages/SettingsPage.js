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
import { LINK_POLL_MS, linkTimeLeft, telegramApi } from '../lib/telegram';
import { DEFAULT_VISIBILITY_CHANGED } from '../lib/visibility';
const PROVIDER_NAMES = { GITHUB: 'GitHub', GOOGLE: 'Google', LOCAL: '이메일' };
const BIO_MAX = 200;
const BIO_LINES = 4;
/** 서버(BioPolicy)와 같은 정리: 앞뒤·줄 끝 공백 제거, 연속 빈 줄은 하나로. 글자 수·줄 수는 정리한 뒤 센다. */
export const normalizeBio = (s) => s.replace(/\r\n?/g, '\n').normalize('NFC').trim().replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
/** 소개 글자 수: 서버와 같이 코드 포인트로 센다(이모지 하나 = 1자). */
const bioLength = (s) => Array.from(s).length;
/** 내 설정 탭 (063). 주소 뒤 #이름으로 바로 열린다(/settings#ai). 예전 항목 주소(#telegram)는 그 항목이 든 탭으로 간다. */
export const SETTINGS_TABS = [
    { id: 'profile', label: '프로필', hint: '사진·닉네임·소개·소셜 정보', icon: 'user' },
    { id: 'account', label: '계정', hint: '로그인·공개 범위·비밀번호·탈퇴', icon: 'lock' },
    { id: 'notifications', label: '알림', hint: '받을 알림·텔레그램', icon: 'bell' },
    { id: 'friends', label: '친구', hint: '친구 요청과 친구 목록', icon: 'users' },
    { id: 'ai', label: 'AI 연결', hint: 'AI 도구에 쓸 토큰', icon: 'ai' },
    { id: 'export', label: '내보내기', hint: '내 글을 Markdown으로 받기', icon: 'download' },
];
const HASH_ALIASES = { telegram: 'notifications', password: 'account', social: 'profile' };
export function tabFromHash(hash) {
    const key = decodeURIComponent(hash.replace(/^#/, ''));
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
        body = _jsx("p", { className: "error center", children: "\uC124\uC815\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694. \uC0C8\uB85C\uACE0\uCE68\uD574 \uC8FC\uC138\uC694." });
    else if (!settings)
        body = _jsx("p", { className: "muted center", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" });
    else if (tab === 'profile')
        body = _jsxs(_Fragment, { children: [_jsx(ProfileSection, { settings: settings, onSaved: (p) => setSettings({ ...settings, ...p }) }), _jsx(SocialLinksForm, { initial: settings.socialLinks, onSaved: (l) => setSettings({ ...settings, socialLinks: l }) })] });
    else if (tab === 'account')
        body = _jsxs(_Fragment, { children: [_jsx(AccountSection, { settings: settings, onChange: setSettings }), settings.hasPassword && _jsx(PasswordSection, {}), _jsxs("section", { className: "settings-section withdraw-link", children: [_jsx("h2", { children: "\uD68C\uC6D0 \uD0C8\uD1F4" }), _jsx("p", { className: "muted small", children: "\uD0C8\uD1F4\uB97C \uC2E0\uCCAD\uD574\uB3C4 30\uC77C \uC548\uC5D0 \uB2E4\uC2DC \uB85C\uADF8\uC778\uD558\uBA74 \uBAA8\uB450 \uBCF5\uAD6C\uD560 \uC218 \uC788\uC5B4\uC694." }), _jsx(Link, { to: "/settings/withdraw", className: "btn btn-text danger", children: "\uD68C\uC6D0 \uD0C8\uD1F4" })] })] });
    else if (tab === 'notifications')
        body = _jsxs(_Fragment, { children: [_jsx(NotificationsSection, {}), _jsx(TelegramSection, {})] });
    else if (tab === 'friends')
        body = _jsx(FriendsSection, {});
    else if (tab === 'ai')
        body = _jsx(AiConnectSection, {});
    else
        body = _jsx(ExportSection, {});
    return (_jsxs("main", { className: "container settings-page", children: [_jsxs("header", { className: "settings-head", children: [_jsx("h1", { className: "page-title", children: "\uB0B4 \uC124\uC815" }), _jsx("p", { className: "muted", children: "\uD504\uB85C\uD544\uACFC \uACC4\uC815, \uC54C\uB9BC, AI \uC5F0\uACB0\uC744 \uD55C\uACF3\uC5D0\uC11C \uBC14\uAFD4\uC694." })] }), _jsxs("div", { className: "settings-layout", children: [_jsx("nav", { className: "settings-nav", "aria-label": "\uC124\uC815 \uD56D\uBAA9", children: SETTINGS_TABS.map((t) => (_jsxs("a", { href: `/settings#${t.id}`, "aria-current": t.id === tab ? 'page' : undefined, "data-tip": t.hint, onClick: (e) => { e.preventDefault(); pick(t.id); }, children: [_jsx(NavIcon, { name: t.icon }), _jsx("span", { children: t.label })] }, t.id))) }), _jsx("div", { className: "settings-panel", "aria-label": current.label, role: "region", children: body })] })] }));
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
            setErrors({ profileImageId: '사진을 열 수 없어요. 다른 사진을 골라 주세요.' });
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
            setErrors({ profileImageId: err instanceof ApiError ? err.message : '사진을 올리지 못했어요. 다시 시도해 주세요.' });
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
                map.nickname = `${map.nickname} 다음 변경 가능일: ${monthDay(next)}`;
            setErrors(map);
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("section", { className: "settings-section", children: [_jsx("h2", { children: "\uD504\uB85C\uD544" }), _jsxs("form", { className: "form", onSubmit: save, children: [_jsxs("div", { className: "profile-photo", children: [_jsx(Avatar, { src: shownImage, name: nickname || settings.nickname, seed: settings.handle, size: 96 }), _jsxs("div", { className: "profile-photo-actions", children: [me?.emailVerified === false
                                        ? _jsx("p", { className: "small muted", children: "\uC774\uBA54\uC77C \uC778\uC99D\uC744 \uB9C8\uCE58\uBA74 \uC0AC\uC9C4\uC744 \uC62C\uB9B4 \uC218 \uC788\uC5B4\uC694." })
                                        : _jsx("button", { type: "button", className: "btn btn-outline", onClick: () => fileInput.current?.click(), disabled: uploading, children: "\uC774\uBBF8\uC9C0 \uBCC0\uACBD" }), shownImage && _jsx("button", { type: "button", className: "btn btn-text", onClick: () => { setImage({ kind: 'default' }); setSaved(false); }, children: "\uAE30\uBCF8 \uC774\uBBF8\uC9C0\uB85C" }), _jsx("input", { ref: fileInput, type: "file", accept: "image/jpeg,image/png,image/gif,image/webp", hidden: true, onChange: pick })] })] }), source && _jsx(ImageCropper, { image: source, busy: uploading, onApply: apply, onCancel: () => setSource(null) }), errors.profileImageId && _jsx("p", { className: "error small", role: "alert", children: errors.profileImageId }), image.kind === 'new' && _jsx("p", { className: "small muted", children: "[\uC800\uC7A5]\uC744 \uB20C\uB7EC\uC57C \uD504\uB85C\uD544 \uC0AC\uC9C4\uC774 \uBC14\uB00C\uC5B4\uC694." }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "\uB2C9\uB124\uC784" }), _jsx("input", { value: nickname, onChange: (e) => setNickname(e.target.value), maxLength: 10, disabled: nicknameLocked, "aria-describedby": "nickname-help" }), _jsx("small", { id: "nickname-help", className: errors.nickname ? 'error' : 'muted', children: errors.nickname ?? (nicknameLocked
                                    ? `다음 변경 가능일: ${monthDay(settings.nicknameNextChangeableAt)}`
                                    : '한 번 바꾸면 30일 동안 다시 바꿀 수 없어요.') })] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "\uC18C\uAC1C" }), _jsx("textarea", { value: bio, onChange: (e) => setBio(e.target.value), rows: 4, "aria-describedby": "bio-help" }), _jsx("small", { id: "bio-help", className: errors.bio || bioCount > BIO_MAX || bioLineCount > BIO_LINES ? 'error' : 'muted', children: errors.bio ?? (bioLineCount > BIO_LINES ? '소개는 4줄까지 쓸 수 있어요.' : `${bioCount} / ${BIO_MAX}`) })] }), _jsxs("div", { className: "field", children: [_jsx("span", { children: "\uBE14\uB85C\uADF8 \uC8FC\uC18C" }), _jsxs("p", { className: "readonly", children: ["@", settings.handle, " ", _jsx("span", { className: "muted small", children: "\uBCC0\uACBD\uD560 \uC218 \uC5C6\uC5B4\uC694" })] })] }), errors.form && _jsx("p", { className: "error", role: "alert", children: errors.form }), saved && _jsx("p", { className: "ok", role: "status", children: "\uC800\uC7A5\uD588\uC5B4\uC694." }), _jsx("div", { children: _jsx("button", { className: "btn btn-primary", disabled: saving || uploading || !dirty || bioCount > BIO_MAX || bioLineCount > BIO_LINES, children: saving ? '저장하는 중…' : '저장' }) })] })] }));
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
            setMessage({ ok: false, text: '바꾸지 못했어요. 다시 시도해 주세요.' });
        }
    };
    const changeLastActive = async (visible) => {
        const before = settings;
        onChange({ ...settings, lastActiveVisible: visible });
        try {
            await api('/api/me/settings', { method: 'PATCH', body: { lastActiveVisible: visible } });
            setMessage({ ok: true, text: visible ? '친구에게 최근 활동을 보여요.' : '이제 친구에게 최근 활동이 보이지 않고, 나도 친구들의 최근 활동을 볼 수 없어요.' });
        }
        catch {
            onChange(before);
            setMessage({ ok: false, text: '바꾸지 못했어요. 다시 시도해 주세요.' });
        }
    };
    const withdrawAi = async () => {
        if (!window.confirm('AI 기능 동의를 철회할까요? 다음에 AI 기능을 쓰려면 다시 동의해야 해요.'))
            return;
        try {
            await api('/api/me/agreements/ai', { method: 'DELETE' });
            onChange({ ...settings, aiAgreed: false });
            setMessage({ ok: true, text: 'AI 기능 동의를 철회했어요.' });
        }
        catch {
            setMessage({ ok: false, text: '철회하지 못했어요. 다시 시도해 주세요.' });
        }
    };
    return (_jsxs("section", { className: "settings-section", children: [_jsx("h2", { children: "\uACC4\uC815" }), _jsxs("dl", { className: "settings-list", children: [_jsx("dt", { children: "\uC774\uBA54\uC77C" }), _jsxs("dd", { children: [settings.email ?? '없음', " ", _jsx("span", { className: "muted small", children: "\uBCC0\uACBD\uD560 \uC218 \uC5C6\uC5B4\uC694" })] }), _jsx("dt", { children: "\uB85C\uADF8\uC778 \uC218\uB2E8" }), _jsx("dd", { children: PROVIDER_NAMES[settings.provider] ?? settings.provider }), _jsx("dt", { children: "\uC9C1\uC804 \uB85C\uADF8\uC778" }), _jsx("dd", { children: prev.at ? `${fullDate(prev.at)} ${clock(prev.at)}, ${PROVIDER_NAMES[prev.provider] ?? prev.provider}` : '첫 로그인' }), _jsx("dt", { id: "default-visibility", children: "\uC0C8 \uAE00 \uAE30\uBCF8 \uACF5\uAC1C \uBC94\uC704" }), _jsxs("dd", { role: "radiogroup", "aria-labelledby": "default-visibility", className: "row", children: [_jsxs("label", { children: [_jsx("input", { type: "radio", name: "defaultVisibility", checked: settings.defaultVisibility === 'PUBLIC', onChange: () => changeVisibility('PUBLIC') }), " \uC804\uCCB4 \uACF5\uAC1C"] }), _jsxs("label", { children: [_jsx("input", { type: "radio", name: "defaultVisibility", checked: settings.defaultVisibility === 'FRIENDS', onChange: () => changeVisibility('FRIENDS') }), " \uCE5C\uAD6C\uC5D0\uAC8C\uB9CC"] }), _jsxs("label", { children: [_jsx("input", { type: "radio", name: "defaultVisibility", checked: settings.defaultVisibility === 'PRIVATE', onChange: () => changeVisibility('PRIVATE') }), " \uB098\uB9CC \uBCF4\uAE30"] })] }), _jsx("dt", { children: "\uC0AC\uC9C4 \uC800\uC7A5 \uACF5\uAC04" }), _jsx("dd", { children: _jsx(StorageMeter, {}) }), _jsx("dt", { children: "\uCD5C\uADFC \uD65C\uB3D9" }), _jsxs("dd", { children: [_jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: settings.lastActiveVisible, onChange: (e) => changeLastActive(e.target.checked) }), " \uCD5C\uADFC \uD65C\uB3D9\uC744 \uCE5C\uAD6C\uC5D0\uAC8C \uBCF4\uC774\uAE30"] }), _jsx("span", { className: "muted small", children: " \uB044\uBA74 \uB098\uB3C4 \uCE5C\uAD6C\uB4E4\uC758 \uCD5C\uADFC \uD65C\uB3D9\uC744 \uBCFC \uC218 \uC5C6\uC5B4\uC694." })] }), settings.aiAgreed && (_jsxs(_Fragment, { children: [_jsx("dt", { children: "AI \uAE30\uB2A5 \uB3D9\uC758" }), _jsx("dd", { children: _jsx("button", { type: "button", className: "btn btn-text", onClick: withdrawAi, children: "\uB3D9\uC758 \uCCA0\uD68C" }) })] })), _jsx("dt", { children: "\uC57D\uAD00" }), _jsxs("dd", { children: [_jsx("a", { href: "/terms", target: "_blank", rel: "noopener", children: "\uC774\uC6A9\uC57D\uAD00" }), " \u00B7 ", _jsx("a", { href: "/privacy", target: "_blank", rel: "noopener", children: "\uAC1C\uC778\uC815\uBCF4 \uCC98\uB9AC\uBC29\uCE68" })] })] }), message && _jsx("p", { className: message.ok ? 'ok' : 'error', role: "status", children: message.text })] }));
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
    return (_jsxs("section", { className: "settings-section", children: [_jsx("h2", { children: "\uBE44\uBC00\uBC88\uD638" }), _jsxs("form", { className: "form", onSubmit: submit, children: [_jsxs("label", { className: "field", children: [_jsx("span", { children: "\uD604\uC7AC \uBE44\uBC00\uBC88\uD638" }), _jsx("input", { type: "password", value: current, onChange: (e) => setCurrent(e.target.value), autoComplete: "current-password", required: true }), errors.currentPassword && _jsx("small", { className: "error", children: errors.currentPassword })] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "\uC0C8 \uBE44\uBC00\uBC88\uD638" }), _jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), autoComplete: "new-password", maxLength: 64, required: true }), _jsx(PasswordRules, { password: password }), errors.password && _jsx("small", { className: "error", children: errors.password })] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "\uC0C8 \uBE44\uBC00\uBC88\uD638 \uD655\uC778" }), _jsx("input", { type: "password", value: confirm, onChange: (e) => setConfirm(e.target.value), autoComplete: "new-password", maxLength: 64, required: true }), (errors.passwordConfirm || (confirm && confirm !== password)) && _jsx("small", { className: "error", children: errors.passwordConfirm ?? '비밀번호가 서로 달라요.' })] }), errors.form && _jsx("p", { className: "error", role: "alert", children: errors.form }), done && _jsx("p", { className: "ok", role: "status", children: "\uBE44\uBC00\uBC88\uD638\uB97C \uBC14\uAFE8\uC5B4\uC694. \uB2E4\uB978 \uAE30\uAE30\uC5D0\uC11C\uB294 \uB85C\uADF8\uC544\uC6C3\uB410\uC5B4\uC694." }), _jsx("div", { children: _jsx("button", { className: "btn btn-primary", disabled: submitting || !current || !passwordOk(password) || password !== confirm, children: "\uBE44\uBC00\uBC88\uD638 \uBCC0\uACBD" }) })] })] }));
}
/** 친구 (008 US1·US2): 받은 요청 수락·거절, 친구 목록과 최근 활동, 보낸 요청 취소. 처리해도 상대에게 알리지 않는다. */
/** 알림 끄기 (015 US5). 바로 저장하고, 실패하면 되돌린다. 운영 알림은 목록에 없다(끌 수 없음). */
function NotificationsSection() {
    const [muted, setMuted] = useState(null);
    const [message, setMessage] = useState(null);
    useEffect(() => {
        notificationsApi.settings().then((s) => setMuted(s.muted)).catch(() => setMessage({ ok: false, text: '알림 설정을 불러오지 못했어요.' }));
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
            setMessage({ ok: true, text: '저장했어요.' });
        }
        catch {
            setMuted(before);
            setMessage({ ok: false, text: '바꾸지 못했어요. 다시 시도해 주세요.' });
        }
    };
    return (_jsxs("section", { className: "settings-section", id: "notifications", children: [_jsx("h2", { children: "\uC54C\uB9BC" }), muted && (_jsx("ul", { className: "notification-settings", children: MUTABLE_TYPES.map(({ type, label }) => (_jsx("li", { children: _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: !muted.includes(type), onChange: (e) => toggle(type, e.target.checked) }), " ", label] }) }, type))) })), _jsx("p", { className: "muted small", children: "\uC6B4\uC601 \uC54C\uB9BC(\uC2E0\uACE0 \uACB0\uACFC\u00B7\uC228\uAE40)\uC740 \uB04C \uC218 \uC5C6\uC5B4\uC694. \uB048 \uC54C\uB9BC\uC740 \uADF8\uB3D9\uC548 \uC313\uC774\uC9C0 \uC54A\uC544\uC694." }), message && _jsx("p", { className: message.ok ? 'ok' : 'error', role: "status", children: message.text })] }));
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
                    setMessage({ ok: true, text: '텔레그램과 연결했어요.' });
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
    }, '연결 주소를 만들지 못했어요. 다시 시도해 주세요.');
    const toggle = (on) => run(async () => {
        setStatus(await telegramApi.setNotifications(on));
        setMessage({ ok: true, text: '저장했어요.' });
    }, '바꾸지 못했어요. 다시 시도해 주세요.');
    const disconnect = () => run(async () => {
        await telegramApi.unlink();
        setStatus({ ...status, linked: false, linkedAt: null });
        setMessage({ ok: true, text: '연결을 끊었어요.' });
    }, '연결을 끊지 못했어요. 다시 시도해 주세요.');
    const left = link ? linkTimeLeft(link.expiresAt, now) : null;
    return (_jsxs("section", { className: "settings-section", id: "telegram", children: [_jsx("h2", { children: "\uD154\uB808\uADF8\uB7A8" }), status.linked ? (_jsxs(_Fragment, { children: [_jsxs("p", { children: [status.botUsername ? _jsxs(_Fragment, { children: ["@", status.botUsername] }) : '봇', "\uACFC \uC5F0\uACB0\uB3FC \uC788\uC5B4\uC694", status.linkedAt && _jsxs("span", { className: "muted small", children: [" \u00B7 ", fullDate(status.linkedAt), "\uBD80\uD130"] })] }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: status.notifications, disabled: busy, onChange: (e) => toggle(e.target.checked) }), " \uC0C8 \uC54C\uB9BC\uC744 \uD154\uB808\uADF8\uB7A8\uC73C\uB85C \uBC1B\uAE30"] }), _jsx("p", { className: "muted small", children: "\uBD07\uC5D0\uAC8C \uBCF4\uB0B8 \uBA54\uBAA8\uB294 \uC784\uC2DC\uAE00\uB85C \uC800\uC7A5\uB3FC\uC694. AI \uC0AC\uC6A9\uC5D0 \uB3D9\uC758\uD588\uC73C\uBA74 \uB2E4\uB4EC\uC5B4\uC11C \uC800\uC7A5\uD574\uC694." }), _jsx("button", { type: "button", className: "btn btn-text danger", disabled: busy, onClick: disconnect, children: "\uC5F0\uACB0 \uB04A\uAE30" })] })) : (_jsxs(_Fragment, { children: [_jsx("p", { className: "muted small", children: "\uC5F0\uACB0\uD558\uBA74 \uC0C8 \uC54C\uB9BC\uC744 \uD154\uB808\uADF8\uB7A8\uC73C\uB85C \uBC1B\uACE0, \uBD07\uC5D0\uAC8C \uBCF4\uB0B8 \uBA54\uBAA8\uB97C \uC784\uC2DC\uAE00\uB85C \uC800\uC7A5\uD560 \uC218 \uC788\uC5B4\uC694." }), link && left ? (_jsxs("p", { children: [_jsx("a", { className: "btn btn-primary", href: link.url, target: "_blank", rel: "noopener noreferrer", children: "\uD154\uB808\uADF8\uB7A8 \uC5F4\uAE30" }), ' ', _jsxs("span", { className: "muted small", children: [left, " \uC5F4\uBA74 \uC790\uB3D9\uC73C\uB85C \uC5F0\uACB0\uB3FC\uC694."] })] })) : (_jsx("button", { type: "button", className: "btn", disabled: busy, onClick: connect, children: link ? '주소 다시 만들기' : '연결하기' }))] })), message && _jsx("p", { className: message.ok ? 'ok' : 'error', role: "status", children: message.text })] }));
}
function FriendsSection() {
    const [data, setData] = useState(null);
    const [busy, setBusy] = useState(null);
    const [message, setMessage] = useState(null);
    useEffect(() => { friendsApi.overview().then(setData).catch(() => setMessage({ ok: false, text: '친구 목록을 불러오지 못했어요.' })); }, []);
    const act = async (handle, fn, text) => {
        setBusy(handle);
        try {
            await fn();
            setData(await friendsApi.overview());
            setMessage({ ok: true, text });
        }
        catch (e) {
            setMessage({ ok: false, text: e instanceof ApiError ? e.message : '처리하지 못했어요. 다시 시도해 주세요.' });
        }
        finally {
            setBusy(null);
        }
    };
    if (!data)
        return message ? _jsxs("section", { className: "settings-section", children: [_jsx("h2", { children: "\uCE5C\uAD6C" }), _jsx("p", { className: "error", children: message.text })] }) : null;
    const row = (p, actions, extra) => (_jsxs("li", { className: "friend-row", children: [_jsxs(Link, { to: `/@${p.handle}`, className: "friend-who", children: [_jsx(Avatar, { src: p.profileImageUrl, name: p.nickname, seed: p.handle, size: 32 }), _jsxs("span", { children: [_jsx("b", { children: p.nickname }), " ", _jsxs("span", { className: "muted small", children: ["@", p.handle] })] })] }), extra && _jsx("span", { className: "muted small", children: extra }), _jsx("span", { className: "friend-row-actions", children: actions })] }, p.handle));
    return (_jsxs("section", { className: "settings-section", children: [_jsx("h2", { children: "\uCE5C\uAD6C" }), data.received.length > 0 && (_jsxs(_Fragment, { children: [_jsxs("h3", { children: ["\uBC1B\uC740 \uCE5C\uAD6C \uC694\uCCAD ", data.received.length] }), _jsx("ul", { className: "friend-list", children: data.received.map((p) => row(p, _jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: "btn btn-primary", disabled: busy === p.handle, onClick: () => act(p.handle, () => friendsApi.accept(p.handle), `${p.nickname}님과 친구가 됐어요.`), children: "\uC218\uB77D" }), _jsx("button", { type: "button", className: "btn btn-text", disabled: busy === p.handle, onClick: () => act(p.handle, () => friendsApi.remove(p.handle), '요청을 거절했어요.'), children: "\uAC70\uC808" })] }))) })] })), _jsxs("h3", { children: ["\uCE5C\uAD6C ", data.friends.length] }), data.friends.length === 0
                ? _jsx("p", { className: "muted small", children: "\uC544\uC9C1 \uCE5C\uAD6C\uAC00 \uC5C6\uC5B4\uC694. \uB2E4\uB978 \uC0AC\uB78C\uC758 \uBE14\uB85C\uADF8\uC5D0\uC11C [\uCE5C\uAD6C \uC694\uCCAD]\uC744 \uBCF4\uB0B4 \uBCF4\uC138\uC694." })
                : (_jsx("ul", { className: "friend-list", children: data.friends.map((p) => row(p, _jsx("button", { type: "button", className: "btn btn-text", disabled: busy === p.handle, onClick: () => {
                            if (confirm(`${p.nickname}님과 친구를 끊을까요? 상대에게 알림은 가지 않아요.`)) {
                                void act(p.handle, () => friendsApi.remove(p.handle), '친구를 끊었어요.');
                            }
                        }, children: "\uCE5C\uAD6C \uB04A\uAE30" }), lastActiveLabel(p.lastActiveDaysAgo) && `최근 활동 ${lastActiveLabel(p.lastActiveDaysAgo)}`)) })), data.sent.length > 0 && (_jsxs(_Fragment, { children: [_jsxs("h3", { children: ["\uBCF4\uB0B8 \uC694\uCCAD ", data.sent.length] }), _jsx("ul", { className: "friend-list", children: data.sent.map((p) => row(p, _jsx("button", { type: "button", className: "btn btn-text", disabled: busy === p.handle, onClick: () => act(p.handle, () => friendsApi.remove(p.handle), '요청을 취소했어요.'), children: "\uC694\uCCAD \uCDE8\uC18C" }))) })] })), message && _jsx("p", { className: message.ok ? 'ok' : 'error', role: "status", children: message.text })] }));
}
/** 사진 저장 공간 (009 US5). 지운 사진의 공간은 정리 작업이 실제로 지울 때(7일 뒤) 돌아온다. */
function StorageMeter() {
    const [u, setU] = useState(null);
    useEffect(() => { storageUsage().then(setU).catch(() => undefined); }, []);
    if (!u)
        return _jsx("span", { className: "muted small", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" });
    const ratio = Math.min(1, u.usedBytes / u.quotaBytes);
    return (_jsxs("div", { children: [_jsx("div", { className: `storage-bar${ratio > 0.9 ? ' warn' : ''}`, role: "meter", "aria-valuemin": 0, "aria-valuemax": u.quotaBytes, "aria-valuenow": u.usedBytes, "aria-label": "\uC0AC\uC9C4 \uC800\uC7A5 \uACF5\uAC04 \uC0AC\uC6A9\uB7C9", children: _jsx("span", { style: { width: `${(ratio * 100).toFixed(1)}%` } }) }), _jsxs("span", { className: "small", children: [formatBytes(u.usedBytes), " / ", formatBytes(u.quotaBytes)] }), _jsxs("span", { className: "muted small", children: [" \u00B7 \uC624\uB298 ", u.todayCount, "/", u.dailyLimit, "\uC7A5 \u00B7 \uC9C0\uC6B4 \uC0AC\uC9C4\uC758 \uACF5\uAC04\uC740 7\uC77C \uB4A4 \uB3CC\uC544\uC640\uC694"] })] }));
}
