import { jsx as _jsx } from "react/jsx-runtime";
import { focusMain } from '../lib/focusMain';
/** 키보드 사용자가 머리말 메뉴를 건너뛰고 본문으로 바로 가는 첫 링크. 초점을 받을 때만 보인다. */
export function SkipLink() {
    const skip = (e) => {
        if (focusMain())
            e.preventDefault();
    };
    return _jsx("a", { href: "#main", className: "skip-link", onClick: skip, children: "\uBCF8\uBB38\uC73C\uB85C \uAC74\uB108\uB6F0\uAE30" });
}
