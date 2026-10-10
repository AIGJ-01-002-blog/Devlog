import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
import { t } from '../lib/i18n';
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
        return (_jsxs("main", { className: "container", children: [_jsx("p", { className: "muted center", role: "alert", children: t('화면을 불러오지 못했어요. 연결을 확인하고 다시 시도해 주세요.') }), _jsx("p", { className: "center", children: _jsx("button", { type: "button", className: "btn", onClick: () => window.location.reload(), children: t('다시 시도') }) })] }));
    }
}
