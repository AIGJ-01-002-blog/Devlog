import { createElement, Fragment, useSyncExternalStore } from 'react';
import { en } from './locales/en';
import { ja } from './locales/ja';
import { zh } from './locales/zh';
export const LOCALES = [
    { code: 'ko', label: '한국어' },
    { code: 'en', label: 'English' },
    { code: 'ja', label: '日本語' },
    { code: 'zh', label: '中文' },
];
const DICTS = { en, ja, zh };
const STORAGE_KEY = 'devlog.lang';
function isLocale(v) {
    return v === 'ko' || v === 'en' || v === 'ja' || v === 'zh';
}
export function fromLanguageTag(tag) {
    const base = (tag ?? '').toLowerCase().split('-')[0];
    return isLocale(base) ? base : null;
}
function detect() {
    if (typeof window === 'undefined')
        return 'ko';
    const fromUrl = fromLanguageTag(new URLSearchParams(window.location.search).get('lang'));
    if (fromUrl)
        return fromUrl;
    try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (isLocale(saved))
            return saved;
    }
    catch {
        // 저장소를 못 쓰는 브라우저(사생활 보호 등)는 브라우저 언어로 정한다
    }
    // 테스트는 jsdom의 en-US 대신 한국어 화면을 본다
    if (import.meta.env.MODE === 'test')
        return 'ko';
    for (const tag of navigator.languages ?? [navigator.language]) {
        const l = fromLanguageTag(tag);
        if (l)
            return l;
    }
    return 'ko';
}
let current = detect();
const listeners = new Set();
if (typeof document !== 'undefined')
    document.documentElement.lang = current;
export function getLocale() {
    return current;
}
/**
 * 언어를 바꾼다. 화면 곳곳의 문장이 불러올 때 한 번 번역되므로, 바꾼 뒤에는 페이지를 다시 불러온다.
 * ?lang= 이 주소에 있으면 지워서 고른 언어가 이긴다.
 */
export function changeLocale(next) {
    setLocale(next);
    const url = new URL(window.location.href);
    if (url.searchParams.has('lang')) {
        url.searchParams.delete('lang');
        window.location.replace(url.toString());
    }
    else {
        window.location.reload();
    }
}
export function setLocale(next, remember = true) {
    if (remember) {
        try {
            window.localStorage.setItem(STORAGE_KEY, next);
        }
        catch {
            // 저장하지 못해도 이번 방문에는 바뀐 언어로 보인다
        }
    }
    if (next === current)
        return;
    current = next;
    document.documentElement.lang = next;
    listeners.forEach((l) => l());
}
function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
/** 지금 언어. 언어가 바뀌면 이 훅을 쓴 화면이 다시 그려진다. */
export function useLocale() {
    return useSyncExternalStore(subscribe, getLocale, getLocale);
}
/** 한국어 문장을 지금 언어로. {0}·{name} 자리는 vars로 채운다. */
export function t(ko, vars) {
    const text = current === 'ko' ? ko : DICTS[current][ko] ?? ko;
    if (!vars)
        return text;
    return text.replace(/\{(\w+)\}/g, (whole, k) => (k in vars ? String(vars[k] ?? '') : whole));
}
/** 문장 가운데에 링크·굵은 글씨 같은 요소를 끼울 때. {0} 자리에 vars의 요소가 들어간다 */
export function tNodes(ko, vars) {
    const text = current === 'ko' ? ko : DICTS[current][ko] ?? ko;
    return text.split(/\{(\w+)\}/).map((part, i) => i % 2 === 0 ? part : createElement(Fragment, { key: i }, part in vars ? vars[part] : `{${part}}`));
}
/** 숫자·날짜 서식에 쓰는 BCP 47 태그 */
export function intlTag(locale = current) {
    return { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN' }[locale];
}
