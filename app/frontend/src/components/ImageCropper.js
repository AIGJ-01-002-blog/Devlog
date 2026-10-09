import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { cropAt, PROFILE_SIZE } from '../lib/image';
/**
 * 정사각형 자르기 (005 FR-011): 끌거나 화살표 키로 위치를, 막대·휠로 확대를 조정한다. 미리보기는 실제로 올라갈 256×256 그대로다.
 */
export function ImageCropper({ image, onApply, onCancel, busy }) {
    const canvas = useRef(null);
    const [zoom, setZoom] = useState(1);
    const [center, setCenter] = useState({ x: image.width / 2, y: image.height / 2 });
    const drag = useRef(null);
    const crop = cropAt(image.width, image.height, center.x, center.y, zoom);
    useEffect(() => {
        const ctx = canvas.current?.getContext('2d');
        if (!ctx)
            return;
        ctx.clearRect(0, 0, PROFILE_SIZE, PROFILE_SIZE);
        ctx.drawImage(image, crop.x, crop.y, crop.size, crop.size, 0, 0, PROFILE_SIZE, PROFILE_SIZE);
    }, [image, crop.x, crop.y, crop.size]);
    // React의 onWheel은 passive라 페이지 스크롤을 막지 못한다. 직접 non-passive로 건다
    useEffect(() => {
        const el = canvas.current;
        if (!el)
            return;
        const onWheel = (e) => {
            e.preventDefault();
            setZoom((z) => Math.min(Math.max(z * (e.deltaY < 0 ? 1.1 : 1 / 1.1), 1), 8));
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);
    const onDown = (e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, y: e.clientY };
    };
    const onMove = (e) => {
        if (!drag.current)
            return;
        const rect = e.currentTarget.getBoundingClientRect();
        const scale = crop.size / rect.width;
        const dx = (e.clientX - drag.current.x) * scale;
        const dy = (e.clientY - drag.current.y) * scale;
        drag.current = { x: e.clientX, y: e.clientY };
        // 지금 보이는(당겨진) 가운데에서 움직여야 가장자리에서 멈춘 뒤 바로 되돌아온다
        setCenter({ x: crop.x + crop.size / 2 - dx, y: crop.y + crop.size / 2 - dy });
    };
    const onUp = () => { drag.current = null; };
    // 화살표 키는 끌기와 같은 쪽으로 사진을 옮긴다 (한 번에 보이는 폭의 1/20)
    const onKey = (e) => {
        const step = crop.size / 20;
        const directions = {
            ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
        };
        const d = directions[e.key];
        if (!d)
            return;
        e.preventDefault();
        setCenter({ x: crop.x + crop.size / 2 - d[0] * step, y: crop.y + crop.size / 2 - d[1] * step });
    };
    return (_jsxs("div", { className: "cropper", role: "group", "aria-label": "\uC0AC\uC9C4 \uC790\uB974\uAE30", children: [_jsx("canvas", { ref: canvas, width: PROFILE_SIZE, height: PROFILE_SIZE, className: "cropper-canvas", tabIndex: 0, role: "img", "aria-label": "\uC0AC\uC9C4 \uC704\uCE58 (\uD654\uC0B4\uD45C \uD0A4\uB85C \uC62E\uAE30\uAE30)", onKeyDown: onKey, onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp }), _jsxs("label", { className: "cropper-zoom", children: [_jsx("span", { className: "small muted", children: "\uD655\uB300" }), _jsx("input", { type: "range", min: 1, max: 8, step: 0.01, value: zoom, onChange: (e) => setZoom(Number(e.target.value)), "aria-label": "\uD655\uB300" })] }), _jsx("p", { className: "small muted", children: "\uB04C\uAC70\uB098 \uD654\uC0B4\uD45C \uD0A4\uB85C \uC704\uCE58\uB97C \uB9DE\uCD94\uC138\uC694. 256\u00D7256 \uD06C\uAE30\uB85C \uBC14\uB00C\uACE0 \uCD2C\uC601 \uC704\uCE58 \uAC19\uC740 \uC0AC\uC9C4 \uC815\uBCF4\uB294 \uC9C0\uC6CC\uC838\uC694." }), _jsxs("div", { className: "row", children: [_jsx("button", { type: "button", className: "btn btn-primary", disabled: busy, onClick: () => onApply(crop), children: busy ? '올리는 중…' : '이 사진 쓰기' }), _jsx("button", { type: "button", className: "btn btn-text", disabled: busy, onClick: onCancel, children: "\uCDE8\uC18C" })] })] }));
}
