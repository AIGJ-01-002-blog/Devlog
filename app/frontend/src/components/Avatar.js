import { jsx as _jsx } from "react/jsx-runtime";
import { avatarColor, avatarInitial } from '../lib/avatar';
/** 프로필 사진. 없으면 닉네임 첫 글자 + 블로그 주소 색의 동그란 기본 아이콘 (005 FR-016). */
export function Avatar({ src, name, seed, size = 32 }) {
    if (src)
        return _jsx("img", { className: "avatar", src: src, alt: "", width: size, height: size, loading: "lazy" });
    return (_jsx("span", { className: "avatar avatar-default", style: { width: size, height: size, fontSize: size * 0.45, background: avatarColor(seed) }, "aria-hidden": "true", children: avatarInitial(name) }));
}
