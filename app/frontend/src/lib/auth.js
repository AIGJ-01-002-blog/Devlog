import { jsx as _jsx } from "react/jsx-runtime";
// 로그인 상태. 서버 세션이 원본이고 화면은 /api/auth/me로 읽기만 한다.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api';
import { localDrafts } from './localDrafts';
const AuthContext = createContext({
    me: null,
    loading: true,
    refresh: async () => null,
    logout: async () => undefined,
});
export function AuthProvider({ children }) {
    const [me, setMe] = useState(null);
    const [loading, setLoading] = useState(true);
    const refresh = useCallback(async () => {
        try {
            const m = await api('/api/auth/me');
            setMe(m);
            return m;
        }
        catch {
            setMe(null);
            return null;
        }
        finally {
            setLoading(false);
        }
    }, []);
    const logout = useCallback(async () => {
        const id = me?.member?.id;
        try {
            await api('/api/auth/logout', { method: 'POST' });
        }
        finally {
            // 공용 PC 대비: 이 브라우저에 남은 본인의 작성 데이터·백업·대기 사진을 지운다 (docs/04 §2-2, 006 FR-017)
            if (id != null) {
                await localDrafts.clearMember(id);
                for (const store of [localStorage, sessionStorage]) {
                    Object.keys(store).filter((k) => k.includes(`:${id}:`)).forEach((k) => store.removeItem(k));
                }
            }
            sessionStorage.clear();
            await refresh();
        }
    }, [me, refresh]);
    useEffect(() => {
        void refresh();
        void localDrafts.purgeExpired(); // 7일 지난 충돌 백업 정리 (006 FR-012)
    }, [refresh]);
    return _jsx(AuthContext.Provider, { value: { me, loading, refresh, logout }, children: children });
}
export function useAuth() {
    return useContext(AuthContext);
}
/** 로그인 화면으로 보내며 돌아올 주소를 남긴다. */
export function loginPath(redirect = location.pathname + location.search) {
    return `/login?redirect=${encodeURIComponent(redirect)}`;
}
