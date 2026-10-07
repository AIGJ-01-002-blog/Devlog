import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
export class PageErrorBoundary extends Component {
    state = { failed: false, path: this.props.path };
    static getDerivedStateFromError() {
        return { failed: true };
    }
    static getDerivedStateFromProps(props, state) {
        return props.path === state.path ? null : { failed: false, path: props.path };
    }
    render() {
        if (!this.state.failed)
            return this.props.children;
        return (_jsxs("main", { className: "container", children: [_jsx("p", { className: "muted center", role: "alert", children: "\uD654\uBA74\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694. \uC5F0\uACB0\uC744 \uD655\uC778\uD558\uACE0 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694." }), _jsx("p", { className: "center", children: _jsx("button", { type: "button", className: "btn", onClick: () => window.location.reload(), children: "\uB2E4\uC2DC \uC2DC\uB3C4" }) })] }));
    }
}
