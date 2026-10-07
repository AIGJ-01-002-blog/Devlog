import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { activeIndex, extractToc, TOC_MIN_ITEMS } from '../lib/toc';
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
/** 헤더 높이만큼 아래를 기준선으로 본다 */
const OFFSET = 96;
/**
 * 글 오른쪽 목차 (025 US1). 넓은 화면에서만 보이고(CSS), 스크롤하면 지금 읽는 제목을 강조한다.
 * 누르면 그 제목으로 이동하고 주소에 #id를 남겨 공유할 수 있다.
 */
export function Toc({ bodyRef, html }) {
    const [items, setItems] = useState([]);
    const [active, setActive] = useState(null);
    useEffect(() => {
        setItems(extractToc(bodyRef.current));
    }, [bodyRef, html]);
    useEffect(() => {
        if (items.length < TOC_MIN_ITEMS)
            return;
        const els = items.map((i) => document.getElementById(i.id));
        let frame = 0;
        const update = () => {
            frame = 0;
            setActive(activeIndex(els.map((el) => el?.getBoundingClientRect().top ?? Infinity), OFFSET + 1));
        };
        // 스크롤마다 한 번(다음 그림 때)만 계산한다
        const onScroll = () => { if (!frame)
            frame = requestAnimationFrame(update); };
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            if (frame)
                cancelAnimationFrame(frame);
        };
    }, [items]);
    if (items.length < TOC_MIN_ITEMS)
        return null;
    return (_jsx("aside", { className: "toc", "aria-label": "\uBAA9\uCC28", children: _jsx("ul", { className: "toc-inner", children: items.map((item, i) => (_jsx("li", { style: { paddingLeft: `${item.depth * 12}px` }, children: _jsx("a", { href: `#${encodeURIComponent(item.id)}`, className: i === active ? 'active' : undefined, "aria-current": i === active ? 'location' : undefined, onClick: (e) => {
                        e.preventDefault();
                        document.getElementById(item.id)?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
                        history.replaceState(history.state, '', `#${encodeURIComponent(item.id)}`);
                    }, children: item.text }) }, item.id))) }) }));
}
