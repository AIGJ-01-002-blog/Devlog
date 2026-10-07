import { jsx as _jsx } from "react/jsx-runtime";
import { focusMain, MAIN_ID } from '../lib/focusMain';
/**
 * 키보드 사용자가 머리말 메뉴를 건너뛰고 본문으로 바로 가는 첫 링크. 초점을 받을 때만 보인다.
 * 주소에 #을 붙이지 않고 직접 초점과 스크롤을 옮긴다(글의 #제목 이동과 섞이지 않게). 스크립트가 없으면 기본 이동을 쓴다.
 */
export function SkipLink() {
    const skip = (e) => {
        if (focusMain(document, { scroll: true }))
            e.preventDefault();
    };
    return _jsx("a", { href: `#${MAIN_ID}`, className: "skip-link", onClick: skip, children: "\uBCF8\uBB38\uC73C\uB85C \uAC74\uB108\uB6F0\uAE30" });
}
